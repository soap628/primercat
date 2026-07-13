"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/lib/useToast";
import { blastSearch, BlastResponse, BlastHit } from "@/lib/api";

const BLAST_CACHE_KEY = "primercat_blast_result";

type BlastProgram = "blastn" | "blastp" | "blastx" | "tblastn";
type LoadingStage = "submit" | "remote" | "parse";

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

function normalizeSequence(input: string) {
  return input.replace(/^>.*\n/, "").replace(/\s/g, "");
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
  const [database, setDatabase] = useState("nt");
  const [expect, setExpect] = useState("0.001");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("submit");
  const [result, setResult] = useState<BlastResponse | null>(null);
  const [error, setError] = useState("");
  const [selectedHit, setSelectedHit] = useState<BlastHit | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // 从 sessionStorage 恢复上次结果
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(BLAST_CACHE_KEY);
      if (cached) setResult(JSON.parse(cached));
    } catch {}
  }, []);

  const cleanSequence = normalizeSequence(sequence);
  const loadingStages = [
    { id: "submit" as const, title: t("loading_stage_submit"), desc: t("loading_stage_submit_desc") },
    { id: "remote" as const, title: t("loading_stage_remote"), desc: t("loading_stage_remote_desc") },
    { id: "parse" as const, title: t("loading_stage_parse"), desc: t("loading_stage_parse_desc") },
  ];
  const activeStageIndex = loadingStages.findIndex((stage) => stage.id === loadingStage);

  function clearStageTimers() {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }

  function startStageTimers() {
    clearStageTimers();
    setLoadingStage("submit");
    timerRef.current = [
      setTimeout(() => setLoadingStage("remote"), 1200),
      setTimeout(() => setLoadingStage("parse"), 8000),
    ];
  }

  function mapBlastError(raw: string) {
    const message = extractErrorDetail(raw);
    const normalized = message.toLowerCase();

    if (!message) return tCommon("request_failed");
    if (normalized.includes("failed to fetch") || normalized.includes("networkerror")) {
      return tCommon("network_error");
    }
    if (
      normalized.includes("ncbi blast") ||
      normalized.includes("qblast") ||
      normalized.includes("timed out") ||
      normalized.includes("timeout")
    ) {
      return `${t("error_service")} ${tCommon("retry_later")}`;
    }
    return message;
  }

  function handleProgramChange(nextProgram: BlastProgram) {
    setProgram(nextProgram);
    setDatabase(DATABASES[nextProgram][0].value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const expectValue = Number(expect);
    if (!Number.isFinite(expectValue) || expectValue <= 0) {
      setError(t("error_invalid_evalue"));
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setSelectedHit(null);
    startStageTimers();

    try {
      const res = await blastSearch({
        sequence,
        program,
        database: database as any,
        expect: expectValue,
      });

      if (!res.success) {
        setError(mapBlastError(res.message));
        return;
      }

      setResult(res);
      try { sessionStorage.setItem(BLAST_CACHE_KEY, JSON.stringify(res)); } catch {}
      if (user) toast("已保存到历史记录");
    } catch (err: any) {
      const msg = err?.name === "AbortError" ? "请求超时，请稍后重试" : mapBlastError(err?.message || "");
      setError(msg);
    } finally {
      clearStageTimers();
      setLoading(false);
    }
  }

  return (
    <div className="page-sidebar-layout" style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
      <aside
        className="page-sidebar"
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
        <div style={{ marginBottom: 20 }}>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            {t("title")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{t("subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>
              {t("program_label")}
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {PROGRAMS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleProgramChange(item.value)}
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

          <div>
            <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>
              {t("database_label")}
            </label>
            <select
              className="input-field"
              style={{ width: "100%", padding: "9px 12px" }}
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
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
              style={{ width: "100%", padding: "9px 12px" }}
              value={expect}
              onChange={(e) => setExpect(e.target.value)}
              placeholder="0.001"
            />
          </div>

          <div>
            <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>
              {t("seq_label")}{" "}
              <span style={{ color: "var(--red)", textTransform: "none", letterSpacing: 0 }}>{t("seq_required")}</span>
            </label>
            <textarea
              className="input-field input-field-purple"
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
              onChange={(e) => setSequence(e.target.value)}
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
          <div
            className="card"
            style={{
              marginTop: 12,
              padding: 12,
              background: "var(--red-soft)",
              boxShadow: "none",
              border: "1px solid #fecaca",
              fontSize: 13,
              color: "var(--red)",
              borderRadius: "var(--r-md)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{error}</div>
            <div style={{ fontSize: 12, color: "#b91c1c" }}>{tCommon("retry_later")}</div>
          </div>
        )}
      </aside>

      <main style={{ flex: 1, minWidth: 0 }}>
        {!result && !loading && (
          <div className="empty-state">
            <div className="empty-state-icon">BLAST</div>
            <p style={{ fontSize: 17, fontWeight: 600, color: "var(--text-1)", marginBottom: 8 }}>{t("empty_title")}</p>
            <p style={{ fontSize: 13, color: "var(--text-2)", maxWidth: 320, lineHeight: 1.65, marginBottom: 24 }}>
              {t("empty_subtitle")}
            </p>
            <div style={{ display: "flex", gap: 24 }}>
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
            className="card"
            style={{
              padding: 24,
              minHeight: 300,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg className="animate-spin" style={{ width: 28, height: 28, color: "var(--blast-color)" }} viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>{t("loading_msg")}</p>
                <p style={{ fontSize: 12, color: "var(--text-3)" }}>{t("loading_submsg")}</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {loadingStages.map((stage, index) => {
                const active = index <= activeStageIndex;
                const current = stage.id === loadingStage;
                return (
                  <div
                    key={stage.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: current ? "var(--bg-inset)" : "var(--bg-card)",
                      border: current ? "1px solid var(--border-mid)" : "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        marginTop: 1,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: active ? "var(--blast-color)" : "var(--border)",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--text-1)" : "var(--text-3)" }}>
                        {stage.title}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>{stage.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {result && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>{t("result_title")}</h2>
                <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                  {result.program} vs {result.database} · {result.message}
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

            {result.hits.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <p style={{ color: "var(--text-3)", fontSize: 14 }}>{t("no_hits")}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.hits.map((hit, idx) => {
                  const identityColor =
                    hit.best_hsp.identity_pct >= 99 ? "var(--green)" : hit.best_hsp.identity_pct >= 90 ? "var(--accent)" : "var(--text-3)";
                  const isSelected = selectedHit?.rank === hit.rank;
                  return (
                    <div key={hit.rank} className={`fade-in-up delay-${Math.min(idx + 1, 5)}`}>
                      <div
                        className="card tool-card"
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
                        </div>
                        <div style={{ textAlign: "right", fontSize: 12, flexShrink: 0 }}>
                          <div style={{ fontWeight: 600, color: "var(--text-1)" }}>{hit.best_hsp.bits} bits</div>
                          <div style={{ fontFamily: "monospace", color: evalueColor(hit.best_hsp.expect), marginTop: 2 }}>E: {fmt(hit.best_hsp.expect)}</div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: identityColor, flexShrink: 0, width: 48, textAlign: "right" }}>
                          {hit.best_hsp.identity_pct}%
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
                          className="fade-in-up"
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
  );
}
