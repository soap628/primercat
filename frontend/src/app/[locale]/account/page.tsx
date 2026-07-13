"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "@/navigation";
import { useAuth } from "@/lib/useAuth";
import { useTranslations } from "next-intl";
import { getPrimerJobs, getGrnaJobs, getBlastJobs, deleteJob, JobRecord } from "@/lib/api";

type TabKey = "primer" | "grna" | "blast";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono, monospace)",
  background: "var(--bg-inset)",
  padding: "2px 6px",
  borderRadius: "var(--r-sm)",
  fontSize: 12,
  wordBreak: "break-all",
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      title="复制"
      style={{ background: "none", border: "none", cursor: "pointer", padding: "0 3px", color: copied ? "var(--green)" : "var(--text-3)", fontSize: 11 }}
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
}

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 80 ? "var(--green)" : pct >= 60 ? "var(--orange)" : "var(--red)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ display: "inline-block", width: 48, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
        <span style={{ display: "block", width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </span>
      <span style={{ color, fontWeight: 600 }}>{value.toFixed(0)}</span>
    </span>
  );
}

function PrimerExpandedDetail({ result }: { result: Record<string, unknown> }) {
  const pairs = Array.isArray(result.primer_pairs) ? result.primer_pairs as Record<string, unknown>[] : [];
  if (pairs.length === 0) return <p style={{ fontSize: 12, color: "var(--text-3)", margin: "8px 0 0" }}>无引物结果</p>;
  return (
    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
      {pairs.map((p, i) => {
        const score = p.score as Record<string, number> | null;
        const exon = p.exon_span as Record<string, unknown> | null;
        const blastL = p.blast_left as Record<string, unknown> | null;
        const blastR = p.blast_right as Record<string, unknown> | null;
        return (
          <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "12px 14px", fontSize: 12 }}>
            {/* 头部：排名、产物大小、综合评分 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: "var(--text-1)" }}>Pair {(p.rank as number ?? i + 1)}</span>
              <span style={{ color: "var(--text-2)" }}>产物 <b>{p.product_size as number} bp</b></span>
              {score && (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "var(--text-2)" }}>综合评分</span>
                  <ScoreBar value={score.total} />
                </span>
              )}
            </div>

            {/* 引物序列 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ color: "var(--primer-color)", fontWeight: 700, width: 14 }}>F</span>
                <span style={mono}>{p.left_primer as string}</span>
                <CopyBtn text={p.left_primer as string} />
                <span style={{ color: "var(--text-3)" }}>Tm {(p.left_tm as number)?.toFixed(1)}°C · GC {(p.left_gc as number)?.toFixed(1)}%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, width: 14 }}>R</span>
                <span style={mono}>{p.right_primer as string}</span>
                <CopyBtn text={p.right_primer as string} />
                <span style={{ color: "var(--text-3)" }}>Tm {(p.right_tm as number)?.toFixed(1)}°C · GC {(p.right_gc as number)?.toFixed(1)}%</span>
              </div>
            </div>

            {/* 评分细项 */}
            {score && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", borderTop: "1px solid var(--border)", paddingTop: 8, marginBottom: 8 }}>
                {[
                  ["Tm", score.tm_score, 30],
                  ["GC", score.gc_score, 20],
                  ["特异性", score.specificity_score, 26],
                  ["跨外显子", score.exon_score, 15],
                  ["二聚体", score.dimer_score, 10],
                ].map(([label, val, max]) => (
                  <span key={label as string} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-2)" }}>
                    {label as string} <ScoreBar value={val as number} max={max as number} />/{max as number}
                  </span>
                ))}
              </div>
            )}

            {/* BLAST + 跨外显子 */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 11, color: "var(--text-2)" }}>
              {p.is_specific != null && (
                <span style={{ color: p.is_specific ? "var(--green)" : "var(--red)" }}>
                  {p.is_specific ? "✓ BLAST 特异" : "✗ BLAST 非特异"}
                </span>
              )}
              {blastL && <span>F 最高同一性 {(blastL.top_hit_identity as number)?.toFixed(1)}%</span>}
              {blastR && <span>R 最高同一性 {(blastR.top_hit_identity as number)?.toFixed(1)}%</span>}
              {exon && (exon.spans_junction as boolean) && (
                <span style={{ color: "var(--blast-color)" }}>
                  ✓ 跨外显子 {exon.left_exon as number}–{exon.right_exon as number}
                </span>
              )}
              {exon && !exon.spans_junction && <span>未跨外显子</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GrnaExpandedDetail({ result }: { result: Record<string, unknown> }) {
  const list = Array.isArray(result.grna_list) ? result.grna_list as Record<string, unknown>[] : [];
  if (list.length === 0) return <p style={{ fontSize: 12, color: "var(--text-3)", margin: "8px 0 0" }}>无 gRNA 结果</p>;
  return (
    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
      {list.slice(0, 5).map((g, i) => (
        <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "8px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, color: "var(--text-2)", flexShrink: 0 }}>#{g.rank as number}</span>
          <span style={mono}>{g.guide_with_pam as string}</span>
          <CopyBtn text={g.guide_with_pam as string} />
          <span style={{ color: "var(--text-3)", marginLeft: 4 }}>得分 {(g.on_target_score as number)?.toFixed(2)} · GC {(g.gc_content as number)?.toFixed(1)}% · 风险 {g.heuristic_risk as string}</span>
        </div>
      ))}
      {list.length > 5 && <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>共 {list.length} 条，仅显示前 5</p>}
    </div>
  );
}

function BlastExpandedDetail({ result }: { result: Record<string, unknown> }) {
  const hits = Array.isArray(result.hits) ? result.hits as Record<string, unknown>[] : [];
  if (hits.length === 0) return <p style={{ fontSize: 12, color: "var(--text-3)", margin: "8px 0 0" }}>无命中结果</p>;
  return (
    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
      {hits.slice(0, 5).map((h, i) => {
        const hsp = h.best_hsp as Record<string, unknown>;
        return (
          <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "8px 12px", fontSize: 12 }}>
            <div style={{ fontWeight: 500, color: "var(--text-1)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title as string}</div>
            <span style={{ color: "var(--text-3)" }}>{h.accession as string} · 同一性 {(hsp?.identity_pct as number)?.toFixed(1)}% · 比对长度 {hsp?.align_length as number} bp</span>
          </div>
        );
      })}
      {hits.length > 5 && <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>共 {hits.length} 条，仅显示前 5</p>}
    </div>
  );
}

function JobCard({ job, type, onDelete, tDelete }: {
  job: JobRecord;
  type: TabKey;
  onDelete: () => void;
  tDelete: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const res = job.result_json as Record<string, unknown>;

  const subtitle = type === "primer"
    ? `${job.mode === "gene" ? "基因模式" : "序列模式"} · ${res.sequence_length ?? "?"} bp · ${Array.isArray(res.primer_pairs) ? (res.primer_pairs as unknown[]).length : 0} 对引物 · ${formatDate(job.created_at)}`
    : type === "grna"
    ? `${job.cas_type} · ${job.species} · ${Array.isArray(res.grna_list) ? (res.grna_list as unknown[]).length : 0} 条 gRNA · ${formatDate(job.created_at)}`
    : `${job.program} / ${job.database} · ${Array.isArray(res.hits) ? (res.hits as unknown[]).length : 0} 条命中 · ${formatDate(job.created_at)}`;

  return (
    <div className="card card-hover" style={{ overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {job.gene_name || job.sequence_snippet || "—"}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-2)" }}>{subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
          <button
            onClick={() => setExpanded(v => !v)}
            className="btn-secondary"
            style={{ padding: "4px 10px", fontSize: 12, cursor: "pointer" }}
          >
            {expanded ? "收起" : "详情"}
          </button>
          {confirming ? (
            <>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>确认删除？</span>
              <button
                onClick={() => { setConfirming(false); onDelete(); }}
                style={{ padding: "4px 10px", background: "var(--red)", border: "none", borderRadius: "var(--r-md)", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
              >
                确认
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="btn-secondary"
                style={{ padding: "4px 10px", fontSize: 12, cursor: "pointer" }}
              >
                取消
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              style={{ padding: "4px 10px", background: "none", border: "1px solid rgba(185,28,28,0.25)", borderRadius: "var(--r-md)", color: "var(--red)", fontSize: 12, cursor: "pointer" }}
            >
              {tDelete}
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px", background: "var(--bg-inset)" }}>
          {type === "primer" && <PrimerExpandedDetail result={res} />}
          {type === "grna" && <GrnaExpandedDetail result={res} />}
          {type === "blast" && <BlastExpandedDetail result={res} />}
        </div>
      )}
    </div>
  );
}

function JobList({ jobs, type, onDelete, tDelete, tEmpty }: {
  jobs: JobRecord[];
  type: TabKey;
  onDelete: (id: string) => void;
  tDelete: string;
  tEmpty: string;
}) {
  if (jobs.length === 0) {
    return <p style={{ color: "var(--text-3)", fontSize: 14, marginTop: 24 }}>{tEmpty}</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} type={type} onDelete={() => onDelete(job.id)} tDelete={tDelete} />
      ))}
    </div>
  );
}

const PAGE_SIZE = 10;

export default function AccountPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations("account");
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("primer");
  const [primerJobs, setPrimerJobs] = useState<JobRecord[]>([]);
  const [grnaJobs, setGrnaJobs] = useState<JobRecord[]>([]);
  const [blastJobs, setBlastJobs] = useState<JobRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0); // 0-indexed

  // Full refresh (all tabs) — on mount / visibility change
  const fetchAll = useCallback(async () => {
    setFetching(true);
    const params = { skip: 0, limit: PAGE_SIZE, q: "" };
    try {
      const [p, g, b] = await Promise.all([getPrimerJobs(params), getGrnaJobs(params), getBlastJobs(params)]);
      setPrimerJobs(p);
      setGrnaJobs(g);
      setBlastJobs(b);
      setPage(0);
      setSearch("");
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, locale, router]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && user) fetchAll();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user, fetchAll]);

  // Re-fetch when tab, page, or search changes
  useEffect(() => {
    if (!user) return;
    const params = { skip: page * PAGE_SIZE, limit: PAGE_SIZE, q: search };
    setFetching(true);
    const getter = tab === "primer" ? getPrimerJobs : tab === "grna" ? getGrnaJobs : getBlastJobs;
    getter(params).then((data) => {
      if (tab === "primer") setPrimerJobs(data);
      else if (tab === "grna") setGrnaJobs(data);
      else setBlastJobs(data);
    }).catch(console.error).finally(() => setFetching(false));
  }, [tab, page, search, user]);

  function changeTab(key: TabKey) {
    setTab(key);
    setPage(0);
    setSearch("");
  }

  async function handleDelete(type: TabKey, id: string) {
    await deleteJob(type, id);
    if (type === "primer") setPrimerJobs((j) => j.filter((x) => x.id !== id));
    if (type === "grna") setGrnaJobs((j) => j.filter((x) => x.id !== id));
    if (type === "blast") setBlastJobs((j) => j.filter((x) => x.id !== id));
  }

  if (loading || !user) return null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "primer", label: t("primer_tab") },
    { key: "grna", label: t("grna_tab") },
    { key: "blast", label: t("blast_tab") },
  ];

  const jobsByTab: Record<TabKey, JobRecord[]> = { primer: primerJobs, grna: grnaJobs, blast: blastJobs };
  const currentJobs = jobsByTab[tab];
  const hasMore = currentJobs.length === PAGE_SIZE;

  return (
    <div style={{ maxWidth: 700, margin: "48px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", marginBottom: 8 }}>{t("title")}</h1>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24 }}>{user.email}</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => changeTab(key)}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "none",
              borderBottom: tab === key ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === key ? "var(--accent)" : "var(--text-2)",
              fontWeight: tab === key ? 600 : 400,
              fontSize: 14,
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 搜索框 */}
      <div style={{ marginBottom: 16 }}>
        <input
          className="input"
          placeholder={t("search_placeholder")}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          style={{ width: "100%", fontSize: 13 }}
        />
      </div>

      {fetching ? (
        <p style={{ color: "var(--text-3)", fontSize: 14 }}>Loading…</p>
      ) : (
        <>
          <JobList
            jobs={currentJobs}
            type={tab}
            onDelete={(id) => handleDelete(tab, id)}
            tDelete={t("delete")}
            tEmpty={t("empty")}
          />

          {/* 翻页 */}
          {(page > 0 || hasMore) && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 20 }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-secondary"
                style={{ padding: "6px 16px", fontSize: 13, opacity: page === 0 ? 0.4 : 1 }}
              >
                ← {t("prev")}
              </button>
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>{t("page")} {page + 1}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="btn-secondary"
                style={{ padding: "6px 16px", fontSize: 13, opacity: !hasMore ? 0.4 : 1 }}
              >
                {t("next")} →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
