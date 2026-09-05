"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/lib/useToast";
import { blastSearch, BlastResponse, BlastHit } from "@/lib/api";
import {
  bindBlastResponse, blastQueryCoverage, normalizePrimerQuery, parsePrimerBlastFragment, prepareBlastQuery,
  readCachedBlastSearch, resolveBlastQuerySettings, sameBlastQuery,
  type BlastDatabase, type BlastProgram, type BlastQuerySnapshot, type CompletedBlastSearch,
  type PrimerBlastPrefill, type PrimerBlastSpecies, type ShortQueryMode,
} from "@/lib/blast-prefill";

const BLAST_CACHE_KEY = "primercat_blast_result";

const PROGRAMS: { value: BlastProgram; label: string; desc: string }[] = [
  { value: "blastn", label: "blastn", desc: "nt vs nt" },
  { value: "blastp", label: "blastp", desc: "aa vs aa" },
  { value: "blastx", label: "blastx", desc: "nt to aa vs aa" },
  { value: "tblastn", label: "tblastn", desc: "aa vs translated nt" },
];

const DATABASES: Record<BlastProgram, { value: string; label: string }[]> = {
  blastn: [{ value: "nt", label: "nt" }, { value: "refseq_rna", label: "refseq_rna" }],
  blastp: [
    { value: "nr", label: "nr" },
    { value: "swissprot", label: "swissprot" },
    { value: "refseq_protein", label: "refseq_protein" },
  ],
  blastx: [{ value: "nr", label: "nr" }, { value: "swissprot", label: "swissprot" }],
  tblastn: [{ value: "nt", label: "nt" }, { value: "refseq_rna", label: "refseq_rna" }],
};

function fmt(e: number) {
  if (e === 0) return "0.0";
  if (e < 0.001) return e.toExponential(1);
  return e.toFixed(4);
}

function evalueColor(e: number): string {
  if (e === 0 || e < 1e-100) return "var(--color-danger, #f3727f)";
  if (e < 1e-50) return "var(--color-warn, #ffa42b)";
  if (e < 1e-10) return "#ffa42b";
  if (e < 0.01) return "var(--text-2)";
  return "var(--text-3)";
}

function extractErrorDetail(input: string) {
  const raw = input.trim();
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (typeof parsed?.detail === "string") return parsed.detail;
    if (Array.isArray(parsed?.detail) && parsed.detail.length > 0) {
      const first = parsed.detail[0];
      if (typeof first === "string") return first;
      if (typeof first?.msg === "string") return first.msg;
    }
  } catch {}

  return raw;
}

function exportBlastCSV(result: BlastResponse) {
  const header = ["Rank", "Accession", "Title", "Length", "Bits", "E-value", "Identity%", "Gaps%", "Align Length", "Query Start", "Query End", "Subject Start", "Subject End"].join(",");
  const rows = result.hits.map((h) =>
    [
      h.rank,
      h.accession,
      `"${h.title.replace(/"/g, '""')}"`,
      h.length,
      h.best_hsp.bits,
      h.best_hsp.expect,
      h.best_hsp.identity_pct,
      h.best_hsp.gaps_pct,
      h.best_hsp.align_length,
      h.best_hsp.query_start,
      h.best_hsp.query_end,
      h.best_hsp.subject_start,
      h.best_hsp.subject_end,
    ].join(",")
  );
  const blob = new Blob(["\uFEFF" + [header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PrimerCat_BLAST_${result.program}_${result.database}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BlastPage() {
  const t = useTranslations("blast");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuth();
  const { toast } = useToast();

  const [sequence, setSequence] = useState("");
  const [program, setProgram] = useState<BlastProgram>("blastn");
  const [database, setDatabase] = useState<BlastDatabase>("nt");
  const [expectOverride, setExpectOverride] = useState<string | null>(null);
  const [shortMode, setShortMode] = useState<ShortQueryMode>("auto");
  const [species, setSpecies] = useState<PrimerBlastSpecies | "">("");
  const [importedPrimer, setImportedPrimer] = useState<PrimerBlastPrefill | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedSearch, setCompletedSearch] = useState<CompletedBlastSearch | null>(null);
  const [submittedQuery, setSubmittedQuery] = useState<BlastQuerySnapshot | null>(null);
  const [error, setError] = useState("");
  const [selectedHit, setSelectedHit] = useState<BlastHit | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestIdRef = useRef(0);

  // Imported primers take precedence over cached results and always await manual submission.
  useEffect(() => {
    function importFragment() {
      const parsed = parsePrimerBlastFragment(window.location.hash);
      if (parsed.state === "none") return false;
      requestIdRef.current += 1;
      clearLoadingTimer();
      setLoading(false);
      setCompletedSearch(null);
      setSubmittedQuery(null);
      setSelectedHit(null);
      setImportedPrimer(null);
      try { sessionStorage.removeItem(BLAST_CACHE_KEY); } catch {}
      if (parsed.state === "invalid") {
        setSequence("");
        setShortMode("auto");
        setExpectOverride(null);
        setSpecies("");
        setError(locale === "zh" ? "引物链接无效，请返回来源卡片重新打开，或手动粘贴一条 10–50 nt 引物序列。" : "This primer link is invalid. Reopen it from its source card or paste one 10–50 nt primer sequence.");
        return true;
      }
      setSequence(parsed.value.sequence);
      setProgram("blastn");
      setDatabase("refseq_rna");
      setExpectOverride(null);
      setShortMode("auto");
      setSpecies(parsed.value.species || "");
      setImportedPrimer(parsed.value);
      setError("");
      return true;
    }
    if (!importFragment()) {
      try {
        const cached = sessionStorage.getItem(BLAST_CACHE_KEY);
        const restored = cached ? readCachedBlastSearch(cached) : null;
        if (restored) {
          setCompletedSearch(restored);
          setSubmittedQuery(restored.query);
          setSequence(restored.query.sequence);
          setProgram(restored.query.program);
          setDatabase(restored.query.database);
          setExpectOverride(restored.preferences ? restored.preferences.expectOverride : String(restored.query.expect));
          setShortMode(restored.preferences?.mode || (restored.query.short_query ? "on" : "off"));
          setSpecies(restored.query.species || "");
        } else if (cached) {
          sessionStorage.removeItem(BLAST_CACHE_KEY);
        }
      } catch {}
    }
    window.addEventListener("hashchange", importFragment);
    return () => {
      window.removeEventListener("hashchange", importFragment);
      requestIdRef.current += 1;
      clearLoadingTimer();
    };
  }, [locale]);

  const draft = { sequence, program, database, mode: shortMode, expectOverride, species };
  const querySettings = resolveBlastQuerySettings(draft);
  const cleanSequence = querySettings.sequence || "";
  const shortQuery = querySettings.shortQuery;
  const expect = querySettings.expect;
  const result = completedSearch?.result || null;
  const preparedDraft = prepareBlastQuery(draft);
  const resultIsOutdated = completedSearch && (!preparedDraft.ok || !sameBlastQuery(preparedDraft.query, completedSearch.query));
  const topHit = result?.hits[0] ?? null;
  const topQueryCoverage = topHit && result ? blastQueryCoverage(topHit.best_hsp.query_start, topHit.best_hsp.query_end, result.query_length) : null;

  function clearLoadingTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function startLoadingTimer() {
    clearLoadingTimer();
    setElapsedSeconds(0);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
  }

  function mapBlastError(raw: string) {
    const message = extractErrorDetail(raw);
    const normalized = message.toLowerCase();

    if (!message) return tCommon("request_failed");
    if (normalized === "not found" || normalized === "internal server error" || normalized.includes("http 404") || normalized.includes("http 500")) {
      return `${t("error_service")} ${tCommon("retry_later")}`;
    }
    if (normalized.includes("failed to fetch") || normalized.includes("networkerror")) {
      return tCommon("network_error");
    }
    if (
      normalized.includes("ncbi blast") ||
      normalized.includes("qblast") ||
      normalized.includes("timed out") ||
      normalized.includes("timeout") ||
      normalized.includes("gateway") ||
      normalized.includes("upstream service") ||
      normalized.includes("http 504")
    ) {
      return `${t("error_service")} ${tCommon("retry_later")}`;
    }
    return message;
  }

  function handleProgramChange(nextProgram: BlastProgram) {
    setProgram(nextProgram);
    setDatabase(DATABASES[nextProgram][0].value as BlastDatabase);
    if (nextProgram !== "blastn") {
      setSpecies("");
      setImportedPrimer(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const prepared = prepareBlastQuery(draft);
    if (!prepared.ok) {
      const messages = {
        invalid_expect: t("error_invalid_evalue"),
        multiple_sequences: locale === "zh" ? "请一次检索一条序列，F 和 R 引物需分别比对。" : "Search one sequence at a time. Align F and R primers separately.",
        empty_sequence: locale === "zh" ? "请输入查询序列。" : "Enter a query sequence.",
        invalid_short_query: locale === "zh" ? "短引物模式需要一条 10–50 nt 的 DNA 序列。" : "Short-primer mode requires one 10–50 nt DNA sequence.",
      };
      setError(messages[prepared.reason]);
      setCompletedSearch(null);
      setSubmittedQuery(null);
      return;
    }

    const query = prepared.query;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    setCompletedSearch(null);
    setSubmittedQuery(query);
    setSelectedHit(null);
    try { sessionStorage.removeItem(BLAST_CACHE_KEY); } catch {}
    startLoadingTimer();

    try {
      const res = await blastSearch(query);
      if (requestId !== requestIdRef.current) return;

      if (!res.success) {
        const failures = {
          timeout: locale === "zh" ? "NCBI 检索未在时限内完成，请稍后重试。本次没有取得结果，不能判断是否存在匹配。" : "NCBI did not complete the search within the time limit. Please retry; no result was received to assess matches.",
          busy: locale === "zh" ? "查询服务当前繁忙，请稍后重试。本次没有取得比对结果。" : "The search service is busy. Please retry shortly; no alignment result was received.",
          unavailable: locale === "zh" ? "NCBI 检索服务暂时不可用，请稍后重试。本次连接失败不代表没有匹配。" : "The NCBI search service is temporarily unavailable. Please retry; a connection failure does not mean there are no matches.",
          invalid_response: locale === "zh" ? "未取得完整可解析的 BLAST 结果，请重试。本次不能判定是否存在匹配。" : "A complete, readable BLAST response was not received. Please retry; this attempt cannot determine whether matches exist.",
        };
        setError(res.error_code ? failures[res.error_code] : mapBlastError(res.message));
        return;
      }

      const completed = bindBlastResponse(query, res);
      if (!completed) {
        setError(locale === "zh" ? "返回结果缺少查询参数，或与提交序列不一致。请刷新页面后重试，本次结果不作匹配判断。" : "The response is missing query details or does not match the submitted sequence. Refresh and retry; no match conclusion can be drawn from this response.");
        return;
      }
      setCompletedSearch(completed);
      setSubmittedQuery(completed.query);
      try { sessionStorage.setItem(BLAST_CACHE_KEY, JSON.stringify({ version: 2, ...completed, preferences: { mode: shortMode, expectOverride } })); } catch {}
      if (user) toast(locale === "zh" ? "已保存到历史记录" : "Saved to history");
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      const msg = err?.name === "AbortError"
        ? (locale === "zh" ? "请求超时，请稍后重试。本次未取得结果，不能判断是否存在匹配。" : "The request timed out. Please retry; no result was received to assess matches.")
        : mapBlastError(err?.message || "");
      setError(msg);
    } finally {
      if (requestId === requestIdRef.current) {
        clearLoadingTimer();
        setLoading(false);
      }
    }
  }

  return (
    <div className="sequence-workspace-v5 blast-workspace-v5">
      <section className="sequence-workspace-hero">
        <div>
          <div className="sequence-workspace-kicker">NCBI BLAST / sequence search</div>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
        <div className="sequence-workspace-flow blast-hero-meta" aria-label={locale === "zh" ? "检索引擎" : "Search engine"}>
          <span><b>{t("hero_meta_label")}</b><strong>{t("hero_meta_method")}</strong></span>
          <p>{t("hero_meta_body")}</p>
        </div>
      </section>

      {importedPrimer && (
        <section aria-label={locale === "zh" ? "已带入的引物" : "Imported primer"} style={{ marginBottom: 24, color: "var(--text-2)", fontSize: 13, lineHeight: 1.7 }}>
          <p style={{ margin: 0, color: "var(--text-1)", fontWeight: 600 }}>
            {locale === "zh" ? "已带入引物" : "Imported primer"}
            {importedPrimer.gene && ` · ${importedPrimer.gene}`}
            {importedPrimer.source && ` · ${importedPrimer.source}`}
            {` · ${importedPrimer.direction === "forward" ? "Forward (F)" : "Reverse (R)"} · 5′→3′`}
          </p>
          <p style={{ margin: "4px 0 0" }}>
            {locale === "zh"
              ? "序列已填入，点击开始检索后运行。本页比对单条引物；整对引物的特异性还需结合 F/R 的位置、方向和预期产物判断。RefSeq RNA 结果不覆盖完整基因组。"
              : "The sequence is ready; select Search to run it. This aligns one primer. Pair specificity also depends on F/R positions, orientation and the expected product. RefSeq RNA results do not cover the complete genome."}
          </p>
        </section>
      )}

      <div className="page-sidebar-layout sequence-workspace-grid" style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
      <aside
        className="page-sidebar sequence-control-panel blast-control-panel"
        style={{
          width: 320,
          flexShrink: 0,
          position: "sticky",
          top: 72,
          background: "var(--bg-card)",
          borderRadius: "var(--r-lg)",
          padding: 20,
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--blast-color)",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div className="sequence-control-head">
          <span>01 / {locale === "zh" ? "查询" : "Query"}</span>
          <h2>{locale === "zh" ? "检索参数" : "Search parameters"}</h2>
          <p>blastn · blastp · blastx · tblastn</p>
        </div>

        <form className="sequence-control-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>
              {t("program_label")}
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {PROGRAMS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  disabled={loading}
                  onClick={() => handleProgramChange(item.value)}
                  className="blast-program-choice"
                  data-selected={program === item.value ? "true" : "false"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    borderRadius: "var(--r-md)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    border: `1.5px solid ${program === item.value ? "var(--blast-color)" : "var(--border-mid)"}`,
                    background: program === item.value ? "var(--bg-inset)" : "transparent",
                  }}
                >
                  <code
                    style={{
                      fontSize: 13,
                      fontFamily: "monospace",
                      fontWeight: 600,
                      color: program === item.value ? "var(--blast-color)" : "var(--text-1)",
                    }}
                  >
                    {item.label}
                  </code>
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {program === "blastn" && (
            <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>
              <label htmlFor="blast-short-mode" style={{ display: "block", marginBottom: 6 }}>{locale === "zh" ? "短引物模式（10–50 nt）" : "Short-primer mode (10–50 nt)"}</label>
              <select id="blast-short-mode" className="input-field" disabled={loading} style={{ width: "100%", padding: "9px 12px" }} value={shortMode} onChange={(e) => setShortMode(e.target.value as ShortQueryMode)}>
                <option value="auto">{locale === "zh" ? "自动识别（推荐）" : "Automatic (recommended)"}</option>
                <option value="on">{locale === "zh" ? "启用" : "Enabled"}</option>
                <option value="off">{locale === "zh" ? "关闭" : "Disabled"}</option>
              </select>
              {shortMode === "auto" && querySettings.eligible && <p role="status" style={{ margin: "6px 0", color: "var(--text-1)" }}>{locale === "zh" ? `已识别 ${cleanSequence.length} nt 短核酸，自动启用短引物参数。` : `${cleanSequence.length} nt DNA detected; short-primer settings are active.`}</p>}
              {shortMode === "off" && querySettings.eligible && <p style={{ margin: "6px 0", color: "var(--text-2)" }}>{locale === "zh" ? "这是一条短核酸；常规参数可能遗漏匹配。可切回自动识别。" : "This is a short DNA sequence. Standard settings may miss matches; automatic mode is available."}</p>}
              {shortQuery && (
                <>
                  <p style={{ margin: "6px 0" }}>
                    {locale === "zh" ? "默认 E-value 为 1000，以保留短序列匹配；可按需修改。匹配本身不代表引物已通过特异性验证。" : "The default E-value of 1000 retains short-sequence matches and can be changed. A match alone does not establish primer specificity."}
                  </p>
                  <details>
                    <summary style={{ cursor: "pointer" }}>{locale === "zh" ? "短序列检索参数" : "Short-query search settings"}</summary>
                    <p style={{ margin: "5px 0" }}>
                      Word size 7 · Reward +1 · Penalty −3 · Gap 5/2 · {locale === "zh" ? "关闭低复杂度过滤 · 最多返回 50 条" : "Low-complexity filter off · Up to 50 hits"}
                    </p>
                  </details>
                  <label style={{ display: "block", margin: "10px 0 5px" }} htmlFor="blast-primer-species">
                    {locale === "zh" ? "物种范围" : "Organism"}
                  </label>
                  <select id="blast-primer-species" className="input-field" disabled={loading} style={{ width: "100%", padding: "9px 12px" }} value={species} onChange={(e) => setSpecies(e.target.value as PrimerBlastSpecies | "")}>
                    <option value="">{locale === "zh" ? "全部物种" : "All organisms"}</option>
                    <option value="human">Homo sapiens</option>
                    <option value="mouse">Mus musculus</option>
                  </select>
                </>
              )}
            </div>
          )}

          <div>
            <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>
              {t("database_label")}
            </label>
            <select
              className="input-field"
              disabled={loading}
              style={{ width: "100%", padding: "9px 12px" }}
              value={database}
              onChange={(e) => setDatabase(e.target.value as BlastDatabase)}
            >
              {DATABASES[program].map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>
              {t("evalue_label")}
            </label>
            <input
              className="input-field"
              disabled={loading}
              style={{ width: "100%", padding: "9px 12px" }}
              value={expect}
              onChange={(e) => setExpectOverride(e.target.value)}
              placeholder={shortQuery ? "1000" : "0.001"}
            />
            {expectOverride !== null && <button type="button" disabled={loading} onClick={() => setExpectOverride(null)} style={{ padding: "5px 0 0", border: 0, background: "transparent", color: "var(--text-2)", textDecoration: "underline", fontSize: 11, cursor: "pointer" }}>{locale === "zh" ? "恢复推荐阈值" : "Restore recommended threshold"}</button>}
            {querySettings.eligible && Number(expect) > 0 && Number(expect) < 1000 && <p style={{ margin: "6px 0 0", color: "var(--text-2)", fontSize: 12, lineHeight: 1.6 }}>{locale === "zh" ? "当前 E-value 比短引物推荐值更严格，可能过滤掉短序列匹配；这是您保留的设置。" : "This E-value is stricter than the short-primer recommendation and may filter out short matches. Your chosen threshold is preserved."}</p>}
          </div>

          <div>
            <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>
              {t("seq_label")}{" "}
              <span style={{ color: "var(--red)", textTransform: "none", letterSpacing: 0 }}>{t("seq_required")}</span>
            </label>
            <textarea
              className="input-field input-field-purple"
              disabled={loading}
              style={{
                width: "100%",
                padding: "9px 12px",
                height: 130,
                resize: "none",
                fontFamily: "monospace",
                fontSize: 13,
              }}
              placeholder={t("seq_placeholder")}
              value={sequence}
              onChange={(e) => {
                setSequence(e.target.value);
                if (importedPrimer && normalizePrimerQuery(e.target.value) !== importedPrimer.sequence) setImportedPrimer(null);
              }}
              required
            />
            {sequence && (
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>
                {tCommon("bp", { count: cleanSequence.length })}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="sequence-submit blast-submit"
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: "var(--r-md)",
              border: "none",
              background: loading ? "rgba(85,60,154,0.4)" : "var(--blast-color)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.15s",
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin" style={{ width: 15, height: 15 }} viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {t("submitting_btn")}
              </>
            ) : (
              t("submit_btn")
            )}
          </button>
        </form>

        {error && (
          <div className="workbench-alert is-error" role="alert">
            <span aria-hidden="true">!</span>
            <div><strong>{tCommon("request_failed")}</strong><p>{error}</p></div>
          </div>
        )}
      </aside>

      <main className="sequence-result-panel blast-result-panel" style={{ flex: 1, minWidth: 0 }}>
        {submittedQuery && (
          <section aria-label={locale === "zh" ? "本次查询参数" : "Query parameters for this run"} style={{ marginBottom: 22, color: "var(--text-2)", fontSize: 12, lineHeight: 1.75 }}>
            <strong style={{ color: "var(--text-1)" }}>{locale === "zh" ? (completedSearch ? "本次结果对应的查询" : "已提交的查询") : (completedSearch ? "Query used for these results" : "Submitted query")}</strong>
            <p style={{ margin: "5px 0" }}>
              {submittedQuery.program} · {submittedQuery.database} · {submittedQuery.species === "human" ? "Homo sapiens" : submittedQuery.species === "mouse" ? "Mus musculus" : (locale === "zh" ? "全部物种" : "All organisms")}
              {` · E-value ≤ ${submittedQuery.expect} · ${submittedQuery.sequence.length} ${submittedQuery.program === "blastp" || submittedQuery.program === "tblastn" ? "aa" : "nt"}`}
            </p>
            <p style={{ margin: "5px 0" }}>
              {submittedQuery.short_query ? (locale === "zh" ? "短引物模式" : "Short-primer mode") : (locale === "zh" ? "常规模式" : "Standard mode")}
              {` · ${locale === "zh" ? "最多返回" : "Up to"} ${submittedQuery.hitlist_size} hits`}
              {completedSearch?.result.search_parameters?.word_size != null && ` · Word size ${completedSearch.result.search_parameters.word_size}`}
            </p>
            <details open={submittedQuery.sequence.length <= 50}>
              <summary style={{ cursor: "pointer" }}>{locale === "zh" ? "提交序列" : "Submitted sequence"}{submittedQuery.program === "blastn" || submittedQuery.program === "blastx" ? " (5′→3′)" : ""}</summary>
              <code style={{ display: "block", maxHeight: 180, overflow: "auto", overflowWrap: "anywhere", whiteSpace: "pre-wrap", color: "var(--text-1)", marginTop: 4 }}>{submittedQuery.sequence}</code>
            </details>
            {resultIsOutdated && <p role="status" style={{ margin: "8px 0 0", color: "var(--text-1)" }}>{locale === "zh" ? "查询输入已修改。下方仍是上述查询的结果，点击开始检索可更新。" : "The inputs have changed. Results below still belong to the query shown above; search again to update them."}</p>}
          </section>
        )}

        {!result && !loading && !error && (
          <div className="empty-state sequence-empty-state blast-empty-state-v5">
            <div className="blast-empty-head">
              <div>
                <span>{t("output_kicker")}</span>
                <strong>{t("empty_title")}</strong>
              </div>
              <small>{t("output_state")}</small>
            </div>
            <div className="blast-empty-preview" aria-hidden="true">
              <div className="blast-empty-scale"><span>0</span><i /><span>100%</span></div>
              <div className="blast-empty-alignment is-query"><b>QUERY</b><i /><span>5′→3′</span></div>
              <div className="blast-empty-match"><b>MATCH</b><code>||||||||||··||||||||||||</code></div>
              <div className="blast-empty-alignment is-subject"><b>SUBJECT</b><i /><span>5′→3′</span></div>
            </div>
            <p className="sequence-empty-copy" style={{ fontSize: 13, color: "var(--text-2)", maxWidth: 320, lineHeight: 1.65, marginBottom: 24 }}>
              {t("empty_subtitle")}
            </p>
            <div className="sequence-empty-features" style={{ display: "flex", gap: 24 }}>
              {[
                { label: t("feat_programs") },
                { label: t("feat_identity") },
                { label: t("feat_detail") },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-3)" }}
                >
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div
            className="card sequence-loading-state blast-loading-state workbench-loading-state"
            style={{
              padding: 24,
              minHeight: 300,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 18,
            }}
          >
            <div className="workbench-state-head"><span>NCBI BLAST</span><small>{locale === "zh" ? `已等待 ${elapsedSeconds} 秒` : `Waiting ${elapsedSeconds} s`}</small></div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg className="animate-spin" style={{ width: 28, height: 28, color: "var(--blast-color)" }} viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <div>
                <p role="status" style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>{locale === "zh" ? "正在等待 NCBI 排队或检索" : "Waiting for NCBI to queue or run the search"}</p>
                <p style={{ fontSize: 12, color: "var(--text-3)" }}>{locale === "zh" ? "远程检索最多等待 4 分钟。完成后自动显示结果，请保持页面打开。" : "The remote search has a 4-minute time limit. Keep this page open; results will appear when available."}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="blast-results-v5">
            <div className="sequence-results-head blast-results-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>{t("result_title")}</h2>
                <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                  {result.program} vs {result.database} · {locale === "zh" ? `返回 ${result.hits.length} 条匹配` : `${result.hits.length} matches returned`}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="badge badge-gray">{result.hits.length} hits</span>
                {result.hits.length > 0 && (
                  <button
                    onClick={() => exportBlastCSV(result)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "var(--r-md)",
                      border: "1px solid var(--border-mid)",
                      background: "var(--bg-card)",
                      color: "var(--text-2)",
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    ↓ CSV
                  </button>
                )}
              </div>
            </div>

            {topHit && (
              <div className="blast-result-kpis">
                <div><span>{t("hits_label")}</span><strong>{result.hits.length}</strong><small>{result.program} · {result.database}</small></div>
                <div><span>{t("top_identity")}</span><strong>{topHit.best_hsp.identity_pct}%</strong><small>{topHit.accession}</small></div>
                <div><span>{t("best_evalue")}</span><strong>{fmt(topHit.best_hsp.expect)}</strong><small>{topHit.best_hsp.bits} bits</small></div>
                <div><span>{locale === "zh" ? "查询覆盖度" : "Query coverage"}</span><strong>{topQueryCoverage === null ? "—" : `${topQueryCoverage}%`}</strong><small>{t("alignment_length")}: {topHit.best_hsp.align_length}</small></div>
              </div>
            )}

            {result.hits.length === 0 ? (
              <div role="status" style={{ padding: "12px 0 24px", color: "var(--text-2)", fontSize: 13, lineHeight: 1.8 }}>
                <h3 style={{ margin: "0 0 8px", color: "var(--text-1)", fontSize: 16 }}>{locale === "zh" ? "本次检索未返回匹配" : "No matches returned for this search"}</h3>
                <p style={{ margin: "6px 0" }}>{locale === "zh" ? "在以上数据库、物种和参数范围内，BLAST 未返回比对结果。这不能证明序列不存在，也不能据此判断引物无效或没有脱靶。" : "BLAST returned no alignments under the database, organism and settings shown above. This does not establish that the sequence is absent, that the primer is invalid, or that it has no off-targets."}</p>
                <p style={{ margin: "6px 0" }}>{result.program === "blastn"
                  ? (locale === "zh" ? "请检查序列是否完整、F/R 是否分别按 5′→3′ 输入，以及物种和数据库是否符合模板。短引物建议启用短序列参数；RefSeq RNA 只检索转录本，基因组模板可改用 nt。" : "Check that the sequence is complete, F/R primers are entered separately in the 5′→3′ direction, and the organism and database match your template. Use short-query settings for primers. RefSeq RNA searches transcripts; nt may be appropriate for genomic templates.")
                  : (locale === "zh" ? "请检查序列是否完整、程序和数据库是否匹配输入类型，以及 E-value 阈值是否过严。" : "Check that the sequence is complete, the program and database match the input type, and the E-value is not too stringent.")}</p>
              </div>
            ) : (
              <div className="blast-result-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
                  {locale === "zh" ? "一致度针对局部比对区域，100% 一致度仍需结合查询覆盖度判断。" : "Identity refers to the local alignment; interpret 100% identity together with query coverage."}
                  {result.program === "blastn" && (locale === "zh" ? " 单条引物匹配不能代替 F/R 成对特异性筛查。" : " A single-primer match does not replace F/R paired specificity screening.")}
                  {completedSearch && result.hits.length >= completedSearch.query.hitlist_size && (locale === "zh" ? ` 当前已达 ${completedSearch.query.hitlist_size} 条显示上限，结果不是完整的匹配或脱靶清单。` : ` The ${completedSearch.query.hitlist_size}-hit limit was reached; this is not an exhaustive list of matches or off-targets.`)}
                </p>
                {result.hits.map((hit, idx) => {
                  const queryCoverage = blastQueryCoverage(hit.best_hsp.query_start, hit.best_hsp.query_end, result.query_length);
                  const identityColor =
                    hit.best_hsp.identity_pct >= 99 ? "var(--green)" : hit.best_hsp.identity_pct >= 90 ? "var(--accent)" : "var(--text-3)";
                  const isSelected = selectedHit?.rank === hit.rank;
                  return (
                    <div key={hit.rank} className={`blast-result-item fade-in-up delay-${Math.min(idx + 1, 5)}`}>
                      <div
                        className="card tool-card blast-hit-card"
                        data-top={idx === 0 ? "true" : "false"}
                        onClick={() => setSelectedHit(isSelected ? null : hit)}
                        style={{
                          padding: "13px 18px",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          cursor: "pointer",
                          borderLeft: isSelected ? "3px solid var(--blast-color)" : "3px solid transparent",
                          background: isSelected ? "var(--bg-inset)" : "var(--bg-card)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text-3)",
                            width: 20,
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          {hit.rank}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ marginBottom: 4 }}>
                            <code
                              style={{
                                fontSize: 12,
                                fontFamily: "monospace",
                                padding: "1px 7px",
                                borderRadius: "var(--r-sm)",
                                background: "var(--bg-inset)",
                                color: "var(--blast-color)",
                                fontWeight: 600,
                                border: "1px solid var(--border-mid)",
                              }}
                            >
                              {hit.accession}
                            </code>
                            {idx === 0 && <span className="result-best-label blast-top-label">{t("top_hit")}</span>}
                          </div>
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--text-2)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {hit.title}
                          </p>
                          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-2)" }}>{locale === "zh" ? "查询覆盖度" : "Query coverage"}: {queryCoverage === null ? "—" : `${queryCoverage}%`} · {locale === "zh" ? "查询坐标" : "Query positions"} {hit.best_hsp.query_start}–{hit.best_hsp.query_end}/{result.query_length}</p>
                        </div>
                        <div style={{ textAlign: "right", fontSize: 12, flexShrink: 0 }}>
                          <div style={{ fontWeight: 600, color: "var(--text-1)" }}>{hit.best_hsp.bits} bits</div>
                          <div style={{ fontFamily: "monospace", color: evalueColor(hit.best_hsp.expect), marginTop: 2 }}>E: {fmt(hit.best_hsp.expect)}</div>
                        </div>
                        <div className="blast-identity-cell" style={{ color: identityColor }}>
                          <strong>{hit.best_hsp.identity_pct}%</strong>
                          <span aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, hit.best_hsp.identity_pct))}%` }} /></span>
                        </div>
                        <span
                          style={{
                            color: "var(--text-3)",
                            fontSize: 10,
                            flexShrink: 0,
                            display: "inline-block",
                            transition: "transform 0.15s",
                            transform: isSelected ? "rotate(90deg)" : "none",
                          }}
                        >
                          &gt;
                        </span>
                      </div>

                      {isSelected && (
                        <div
                          className="fade-in-up blast-hit-detail"
                          style={{
                            marginTop: 4,
                            borderRadius: "var(--r-md)",
                            background: "var(--bg-inset)",
                            border: "1px solid var(--border)",
                            padding: "14px 18px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 20,
                              fontSize: 12,
                              color: "var(--text-3)",
                              marginBottom: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <span>Score: {hit.best_hsp.bits} bits</span>
                            <span>E-value: <span style={{ color: evalueColor(hit.best_hsp.expect) }}>{fmt(hit.best_hsp.expect)}</span></span>
                            <span>Identity: {hit.best_hsp.identity_pct}%</span>
                            <span>{locale === "zh" ? "查询覆盖度" : "Query coverage"}: {queryCoverage === null ? "—" : `${queryCoverage}%`}</span>
                            <span>Gaps: {hit.best_hsp.gaps_pct}%</span>
                          </div>
                          <pre
                            style={{
                              fontFamily: "monospace",
                              fontSize: 12,
                              color: "#ffb1ee",
                              overflow: "auto",
                              whiteSpace: "pre",
                              lineHeight: 1.8,
                              margin: 0,
                            }}
                          >
{`Query  ${String(hit.best_hsp.query_start).padEnd(6)} ${hit.best_hsp.query_seq}  ${hit.best_hsp.query_end}
       ${" ".repeat(6)} ${hit.best_hsp.midline}
Sbjct  ${String(hit.best_hsp.subject_start).padEnd(6)} ${hit.best_hsp.subject_seq}  ${hit.best_hsp.subject_end}`}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
