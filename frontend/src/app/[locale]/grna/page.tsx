"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/lib/useToast";

import {
  designGrna,
  getGrnaOfftargetReadiness,
  GrnaHitAnnotation,
  GrnaOfftargetReadiness,
  GrnaResponse,
  GrnaResult,
  TargetLocusInput,
} from "@/lib/api";

type CasValue = "SpCas9" | "Cas12a" | "SpCas9-NG";
type SpeciesValue = "human" | "mouse";

const TIER_STYLE: Record<string, string> = {
  Low: "badge badge-green",
  Medium: "badge badge-orange",
  High: "badge badge-red",
};

function ScoreRing({ score }: { score: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const fill = Math.min(score / 100, 1) * circumference;
  const color =
    score >= 65 ? "#4ade80" : score >= 40 ? "#ffa42b" : "#f87171";
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }} className="grna-score-ring">
      <circle cx="32" cy="32" r="28" fill="var(--bg-inset)" />
      <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--border-mid)" strokeWidth="5" />
      <circle
        cx="32" cy="32" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${fill} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
        style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
      <text x="32" y="37" textAnchor="middle" fontSize="15" fontWeight="800" fill={color}>
        {score}
      </text>
    </svg>
  );
}

function exportGrnaCSV(list: GrnaResult[], geneName?: string, casType?: string, species?: string) {
  const header = [
    "Rank",
    "Guide",
    "Guide+PAM",
    "PAM",
    "Position",
    "Strand",
    "GC%",
    "Activity Score",
    "Activity Tier",
    "Off-target Status",
    "Off-target Risk",
    "Potential Off-target Hits",
    "Best Non-target Identity",
    "Species",
  ].join(",");
  const rows = list.map((guide) =>
    [
      guide.rank,
      guide.grna_sequence,
      guide.guide_with_pam,
      guide.pam,
      guide.position,
      guide.strand,
      guide.gc_content,
      guide.on_target_score,
      guide.heuristic_risk,
      guide.off_target_status,
      guide.off_target_risk ?? "",
      guide.potential_off_target_hits,
      guide.best_non_target_identity,
      species ?? "",
    ].join(","),
  );
  const blob = new Blob(["\uFEFF" + [header, ...rows].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `PrimerCat_${geneName || "grna"}_${casType || "SpCas9"}_${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getSpeciesLabel(species: string, t: ReturnType<typeof useTranslations>) {
  return species === "mouse" ? t("species_mouse") : t("species_human");
}

function getActivityLabel(risk: GrnaResult["heuristic_risk"], t: ReturnType<typeof useTranslations>) {
  if (risk === "Low") return t("activity_low");
  if (risk === "Medium") return t("activity_medium");
  return t("activity_high");
}

function getOffTargetBadge(guide: GrnaResult, t: ReturnType<typeof useTranslations>) {
  if (guide.off_target_status === "validated") {
    if (guide.off_target_risk === "Low") return { className: "badge badge-green", label: t("offtarget_low") };
    if (guide.off_target_risk === "Medium") return { className: "badge badge-orange", label: t("offtarget_medium") };
    if (guide.off_target_risk === "High") return { className: "badge badge-red", label: t("offtarget_high") };
  }
  if (guide.off_target_status === "anchor_missing") {
    return { className: "badge badge-red", label: t("offtarget_status_anchor_missing") };
  }
  if (guide.off_target_status === "no_hits") return { className: "badge badge-gray", label: t("offtarget_status_no_hits") };
  if (guide.off_target_status === "error") return { className: "badge badge-red", label: t("offtarget_status_error") };
  return { className: "badge badge-gray", label: t("offtarget_status_skipped") };
}

function getOffTargetSummary(guide: GrnaResult, t: ReturnType<typeof useTranslations>) {
  if (guide.off_target_status === "validated") {
    return guide.potential_off_target_hits === 0
      ? t("offtarget_summary_clean")
      : t("offtarget_summary_hits", { count: guide.potential_off_target_hits });
  }
  if (guide.off_target_status === "anchor_missing") return t("offtarget_summary_anchor_missing");
  if (guide.off_target_status === "no_hits") return t("offtarget_summary_no_hits");
  if (guide.off_target_status === "error") return t("offtarget_summary_error");
  return t("offtarget_summary_skipped");
}

function parseTargetLocusInput(value: string): TargetLocusInput | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([A-Za-z0-9_.-]+)\s*:\s*([\d,]+)\s*-\s*([\d,]+)(?:\s*\(\s*([+-])\s*\))?$/);
  if (!match) return null;

  const accession = match[1];
  const start = Number(match[2].replace(/,/g, ""));
  const end = Number(match[3].replace(/,/g, ""));
  const strand = match[4] as "+" | "-" | undefined;

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    return null;
  }

  return { accession, start, end, strand };
}

function formatTargetLocus(locus: TargetLocusInput) {
  const interval = `${locus.accession}:${locus.start}-${locus.end}`;
  return locus.strand ? `${interval} (${locus.strand})` : interval;
}

function getAnchorStatusMeta(
  status: GrnaResponse["target_locus_anchor_status"] | GrnaResult["target_locus_status"],
  t: ReturnType<typeof useTranslations>,
) {
  if (status === "matched") return { className: "badge badge-green", label: t("anchor_status_matched") };
  if (status === "partial") return { className: "badge badge-orange", label: t("anchor_status_partial") };
  if (status === "no_match") return { className: "badge badge-red", label: t("anchor_status_no_match") };
  if (status === "unavailable") return { className: "badge badge-gray", label: t("anchor_status_unavailable") };
  return { className: "badge badge-gray", label: t("anchor_status_not_provided") };
}

function getReadinessMeta(
  readiness: GrnaOfftargetReadiness | null,
  t: ReturnType<typeof useTranslations>,
) {
  if (!readiness) {
    return { className: "badge badge-gray", label: t("readiness_loading") };
  }
  if (readiness.readiness_status === "ready") {
    return { className: "badge badge-green", label: t("readiness_ready") };
  }
  if (readiness.readiness_status === "fallback") {
    return { className: "badge badge-orange", label: t("readiness_fallback") };
  }
  if (readiness.readiness_status === "disabled") {
    return { className: "badge badge-gray", label: t("readiness_disabled") };
  }
  return { className: "badge badge-red", label: t("readiness_unavailable") };
}

function formatBpCount(value: number) {
  return value.toLocaleString("en-US");
}

function getHitAnnotationMeta(result: GrnaResponse, t: ReturnType<typeof useTranslations>) {
  if (result.hit_annotation_ready) {
    return {
      className: "badge badge-green",
      label: t("hit_annotation_ready_badge"),
      body: t("hit_annotation_ready_body"),
    };
  }
  if (result.genome_wide_offtarget_checked) {
    return {
      className: "badge badge-orange",
      label: t("hit_annotation_missing_badge"),
      body: t("hit_annotation_missing_body"),
    };
  }
  return {
    className: "badge badge-gray",
    label: t("hit_annotation_fallback_badge"),
    body: t("hit_annotation_fallback_body"),
  };
}

function getHitRegionMeta(annotation: GrnaHitAnnotation | null | undefined, t: ReturnType<typeof useTranslations>) {
  if (annotation?.region === "cds") return { className: "badge badge-green", label: t("hit_region_cds") };
  if (annotation?.region === "exon") return { className: "badge badge-blue", label: t("hit_region_exon") };
  if (annotation?.region === "intron") return { className: "badge badge-orange", label: t("hit_region_intron") };
  if (annotation?.region === "promoter") return { className: "badge badge-orange", label: t("hit_region_promoter") };
  if (annotation?.region === "intergenic") return { className: "badge badge-gray", label: t("hit_region_intergenic") };
  return { className: "badge badge-gray", label: t("hit_annotation_unknown") };
}

export default function GrnaPage() {
  const t = useTranslations("grna");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sequence, setSequence] = useState("");
  const [geneName, setGeneName] = useState("");
  const [targetLocusText, setTargetLocusText] = useState("");
  const [casType, setCasType] = useState<CasValue>("SpCas9");
  const [species, setSpecies] = useState<SpeciesValue>("human");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GrnaResponse | null>(null);
  const [error, setError] = useState("");
  const [readiness, setReadiness] = useState<GrnaOfftargetReadiness | null>(null);
  const [expandedRank, setExpandedRank] = useState<number | null>(null);

  const parsedTargetLocus = parseTargetLocusInput(targetLocusText);

  useEffect(() => {
    let cancelled = false;

    async function loadReadiness() {
      setReadiness(null);
      try {
        const response = await getGrnaOfftargetReadiness(species);
        if (!cancelled) {
          setReadiness(response);
        }
      } catch {
        if (!cancelled) {
          setReadiness(null);
        }
      }
    }

    loadReadiness();
    return () => {
      cancelled = true;
    };
  }, [species, tCommon]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!geneName.trim() && sequence.trim().length < 23) {
      setError(t("error_short_sequence"));
      setResult(null);
      return;
    }
    if (targetLocusText.trim() && !parsedTargetLocus) {
      setError(t("error_invalid_target_locus"));
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await designGrna({
        sequence: sequence.trim() || undefined,
        gene_name: geneName || undefined,
        cas_type: casType,
        species,
        target_locus: parsedTargetLocus ?? undefined,
      });
      if (!response.success) {
        setError(response.message || tCommon("request_failed"));
        return;
      }
      setExpandedRank(response.grna_list[0]?.rank ?? null);
      setResult(response);
      if (user) toast("已保存到历史记录");
    } catch (err: any) {
      const rawMessage = err?.message || "";
      const normalized = rawMessage.toLowerCase();
      const isRemoteFailure =
        normalized.includes("timeout") ||
        normalized.includes("gateway") ||
        normalized.includes("upstream service") ||
        normalized.includes("http 504");
      const msg = err?.name === "AbortError"
        ? tCommon("service_unavailable")
        : isRemoteFailure
          ? tCommon("service_unavailable")
          : (rawMessage || tCommon("request_failed"));
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const validatedCount =
    result?.grna_list.filter((guide) => guide.off_target_status === "validated").length ?? 0;
  const cleanCount =
    result?.grna_list.filter(
      (guide) => guide.off_target_status === "validated" && guide.potential_off_target_hits === 0,
    ).length ?? 0;
  const cautionCount =
    result?.grna_list.filter(
      (guide) => guide.off_target_status !== "validated" || guide.potential_off_target_hits > 0,
    ).length ?? 0;

  const resultsIntro = result
    ? result.genome_wide_offtarget_checked
      ? t("results_intro_genome", {
          count: result.grna_list.length,
          species: getSpeciesLabel(result.species, t),
          cas: result.cas_type,
        })
      : t("results_intro_fallback", {
          count: result.grna_list.length,
          species: getSpeciesLabel(result.species, t),
          cas: result.cas_type,
        })
    : "";
  const readinessMeta = getReadinessMeta(readiness, t);
  const hitAnnotationMeta = result ? getHitAnnotationMeta(result, t) : null;

  const casOptions: Array<{ value: CasValue; pam: string; desc: string }> = [
    { value: "SpCas9", pam: "NGG", desc: t("most_common") },
    { value: "SpCas9-NG", pam: "NG", desc: t("relaxed_pam") },
    { value: "Cas12a", pam: "TTTV", desc: t("five_prime_pam") },
  ];

  return (
    <div className="page-sidebar-layout" style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
      <aside
        className="page-sidebar grna-sidebar"
        style={{
          width: 336,
          flexShrink: 0,
          position: "sticky",
          top: 72,
          padding: 22,
          borderRadius: 28,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          {/* CrisprCat brand mark */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12, flexShrink: 0,
              background: "linear-gradient(135deg, #1a3a6b 0%, #1e5ba8 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 1px rgba(83,157,245,0.3), 0 4px 12px rgba(83,157,245,0.2)",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {/* Scissors / CRISPR scissors icon */}
                <circle cx="6" cy="6" r="2.5" stroke="#539df5" strokeWidth="1.5" />
                <circle cx="6" cy="18" r="2.5" stroke="#539df5" strokeWidth="1.5" />
                <path d="M8.5 8L18.5 18" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8.5 16L18.5 6" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="19" cy="12" r="1.5" fill="#539df5" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.01em" }}>
                Crispr<span style={{ color: "#539df5" }}>Cat</span>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {t("badge")}
              </div>
            </div>
          </div>
          <h1 className="grna-page-headline">{t("title")}</h1>
          <p className="grna-panel-subtitle">{t("subtitle")}</p>
          <div className="primer-panel-chips">
            {["SpCas9", "Cas12a", "Off-target Check"].map((item) => (
              <span key={item} className="primer-panel-chip">{item}</span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>
              {t("cas_label")}
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {casOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCasType(option.value)}
                  className="grna-choice-tile"
                  data-selected={casType === option.value ? "true" : "false"}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 12px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {option.value}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{option.desc}</div>
                  </div>
                  <code
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: "var(--bg-card)",
                    }}
                  >
                    {option.pam}
                  </code>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>
              {t("species_label")}
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {(["human", "mouse"] as SpeciesValue[]).map((value) => (
                <label
                  key={value}
                  className="grna-choice-tile"
                  data-selected={species === value ? "true" : "false"}
                  style={{ padding: "10px 12px", cursor: "pointer" }}
                >
                  <input type="radio" name="grna-species" value={value} checked={species === value} onChange={() => setSpecies(value)} style={{ display: "none" }} />
                  {value === "mouse" ? t("species_mouse") : t("species_human")}
                </label>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              background: "var(--bg-inset)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>{t("readiness_title")}</div>
            {readiness ? (
              <span className={readinessMeta.className}>{readinessMeta.label}</span>
            ) : (
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>{t("readiness_loading")}</span>
            )}
          </div>

          <div>
            <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>
              {t("gene_label")}{" "}
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--text-3)" }}>
                {t("gene_optional")}
              </span>
            </label>
            <input
              className="input-field input-field-green"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 16 }}
              placeholder={t("gene_placeholder")}
              value={geneName}
              onChange={(event) => setGeneName(event.target.value)}
            />
          </div>

          <div>
            <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>
              {t("locus_label")}{" "}
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--text-3)" }}>
                {t("locus_optional")}
              </span>
            </label>
            <input
              className="input-field input-field-green"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 16 }}
              placeholder={t("locus_placeholder")}
              value={targetLocusText}
              onChange={(event) => setTargetLocusText(event.target.value)}
            />
            <p style={{ fontSize: 11, lineHeight: 1.7, color: "var(--text-3)", marginTop: 6 }}>{t("locus_help")}</p>
            {targetLocusText.trim() && !parsedTargetLocus ? (
              <div style={{ fontSize: 11, color: "var(--red)", marginTop: 6 }}>{t("error_invalid_target_locus")}</div>
            ) : null}
            {parsedTargetLocus ? (
              <div className="card-sm" style={{ marginTop: 8, padding: "10px 12px", borderRadius: 16 }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>
                  {t("locus_preview_label")}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
                  {formatTargetLocus(parsedTargetLocus)}
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>
              {t("seq_label")}{" "}
              <span style={{ color: "var(--text-3)", textTransform: "none", letterSpacing: 0 }}>
                {t("seq_optional")}
              </span>
            </label>
            <textarea
              className="input-field input-field-green"
              style={{
                width: "100%",
                minHeight: 148,
                padding: "12px 14px",
                resize: "none",
                borderRadius: 20,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                fontSize: 13,
              }}
              placeholder={t("seq_placeholder")}
              value={sequence}
              onChange={(event) => setSequence(event.target.value.replace(/\s/g, ""))}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 6,
                fontSize: 11,
                color: "var(--text-3)",
              }}
            >
              <span>{sequence.length} bp</span>
              <span>{t("scope_hint")}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: "100%",
              padding: "11px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin" style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {t("searching_btn")}
              </>
            ) : t("search_btn")}
          </button>
        </form>

        <div
          className="card-sm"
          style={{
            marginTop: 14,
            padding: "14px 15px",
            borderRadius: 18,
            background: "var(--tone-amber-bg)",
            border: "1px solid var(--tone-amber-border)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tone-amber-label)", marginBottom: 5 }}>
            {t("risk_note_title")}
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.65, color: "var(--text-2)" }}>{t("risk_note_body")}</p>
        </div>

        {error ? (
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
              borderRadius: 16,
            }}
          >
            {error}
          </div>
        ) : null}
      </aside>

      <main className="grna-main-panel" style={{ flex: 1, minWidth: 0 }}>
        {!result && !loading ? (
          <div
            className="grna-empty-state"
            style={{
              minHeight: 520,
              padding: "40px clamp(24px, 4vw, 48px)",
              borderRadius: 34,
              border: "1px solid var(--border)",
              background: "radial-gradient(ellipse at 80% 20%, rgba(83,157,245,0.10) 0%, transparent 60%), radial-gradient(ellipse at 10% 80%, rgba(83,157,245,0.06) 0%, transparent 50%), var(--bg-card)",
              boxShadow: "var(--shadow-lg)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* DNA helix decoration */}
            <svg
              width="180" height="340"
              viewBox="0 0 180 340"
              style={{ position: "absolute", right: -20, top: 0, opacity: 0.12, pointerEvents: "none" }}
              aria-hidden="true"
            >
              {Array.from({ length: 14 }, (_, i) => {
                const y = i * 24 + 20;
                const phase = (i / 14) * Math.PI * 2;
                const x1 = 90 + Math.sin(phase) * 60;
                const x2 = 90 - Math.sin(phase) * 60;
                return (
                  <g key={i}>
                    <line x1={x1} y1={y} x2={x2} y2={y} stroke="#539df5" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                    <circle cx={x1} cy={y} r="5" fill="#539df5" />
                    <circle cx={x2} cy={y} r="5" fill="#93c5fd" />
                  </g>
                );
              })}
              <path
                d={Array.from({ length: 60 }, (_, i) => {
                  const y = i * 5.5 + 10;
                  const x = 90 + Math.sin((i / 60) * Math.PI * 4) * 60;
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                }).join(" ")}
                fill="none" stroke="#539df5" strokeWidth="2" strokeLinecap="round"
              />
              <path
                d={Array.from({ length: 60 }, (_, i) => {
                  const y = i * 5.5 + 10;
                  const x = 90 - Math.sin((i / 60) * Math.PI * 4) * 60;
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                }).join(" ")}
                fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round"
              />
            </svg>

            <div style={{
              display: "inline-flex", padding: "6px 14px", borderRadius: 999,
              background: "rgba(83,157,245,0.14)", border: "1px solid rgba(83,157,245,0.25)",
              color: "#539df5", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20,
            }}>
              ✂️ &nbsp;{t("badge")}
            </div>
            <h2 style={{
              fontSize: "clamp(32px, 4vw, 52px)",
              lineHeight: 1.04, letterSpacing: "-0.04em",
              color: "var(--text-1)", marginBottom: 14, maxWidth: 640,
            }}>
              {t("empty_title")}
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-2)", maxWidth: 580 }}>{t("empty_subtitle")}</p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14, width: "100%", marginTop: 32,
            }}>
              {[
                { eyebrow: t("feature_activity_eyebrow"), title: t("feature_activity_title"), body: t("feature_activity_body"), icon: "⚡" },
                { eyebrow: t("feature_offtarget_eyebrow"), title: t("feature_offtarget_title"), body: t("feature_offtarget_body"), icon: "🎯" },
                { eyebrow: t("feature_evidence_eyebrow"), title: t("feature_evidence_title"), body: t("feature_evidence_body"), icon: "🔬" },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="tool-card"
                  style={{
                    padding: 20,
                    borderRadius: 24,
                    background: "var(--bg-inset)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{feature.icon}</div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "#539df5", marginBottom: 6,
                  }}>
                    {feature.eyebrow}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", marginBottom: 8 }}>{feature.title}</div>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-2)" }}>{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div style={{
            minHeight: 420,
            display: "flex", flexDirection: "column", justifyContent: "center",
            padding: "36px clamp(24px, 4vw, 42px)",
            borderRadius: 34,
            border: "1px solid rgba(83,157,245,0.25)",
            background: "radial-gradient(ellipse at center, rgba(83,157,245,0.07) 0%, var(--bg-card) 70%)",
            boxShadow: "var(--shadow-lg)",
          }}>
            {/* Animated scissors icon */}
            <div style={{
              width: 60, height: 60, borderRadius: 20,
              display: "grid", placeItems: "center",
              background: "rgba(83,157,245,0.14)",
              border: "1px solid rgba(83,157,245,0.25)",
              marginBottom: 22,
            }}>
              <svg className="animate-spin" style={{ width: 28, height: 28, color: "#539df5" }} viewBox="0 0 24 24" fill="none">
                <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="6" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8.5 8L18.5 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                <path d="M8.5 16L18.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="19" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-1)", marginBottom: 10, letterSpacing: "-0.02em" }}>
              {t("searching_btn")}
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-2)", maxWidth: 520 }}>{t("scanning_msg")}</p>
            {/* Progress bar */}
            <div style={{
              marginTop: 24, height: 3, borderRadius: 999,
              background: "var(--border)", overflow: "hidden", maxWidth: 360,
            }}>
              <div style={{
                height: "100%", borderRadius: 999,
                background: "linear-gradient(90deg, #539df5, #93c5fd, #539df5)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.6s linear infinite",
              }} />
            </div>
          </div>
        ) : null}

        {result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <section
              className="grna-result-hero"
              style={{
                padding: "28px clamp(22px, 4vw, 34px)",
                borderRadius: 34,
                background: "linear-gradient(135deg, #0a1628 0%, #0d1f3c 62%, #0f3460 100%)",
                color: "#fff",
                boxShadow: "var(--shadow-xl)",
              }}
            >
              {result.target_locus ? (
                <div style={{ fontSize: 12, lineHeight: 1.8, color: "rgba(255,255,255,0.82)", marginBottom: 16 }}>
                  {t("anchor_intro", { locus: formatTargetLocus(result.target_locus) })}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 16, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ maxWidth: 760 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      padding: "5px 11px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.12)",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    {t("results_badge")}
                  </div>
                  <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 8 }}>{t("results_title")}</h2>
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(255,255,255,0.84)", maxWidth: 720 }}>{resultsIntro}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                    <span className="badge" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.18)" }}>
                      {t("model_chip_activity")}: <code>{result.risk_model}</code>
                    </span>
                    <span className="badge" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.18)" }}>
                      {t("model_chip_offtarget")}: <code>{result.off_target_model}</code>
                    </span>
                    <span className="badge" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.18)" }}>
                      {t("scope_chip")}: <code>{result.off_target_scope}</code>
                    </span>
                    <span className="badge" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.18)" }}>
                      {t("engine_chip")}: <code>{result.off_target_engine}</code>
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: result.genome_wide_offtarget_checked ? "rgba(34,197,94,0.18)" : "rgba(245,158,11,0.18)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.18)",
                      }}
                    >
                      {result.genome_wide_offtarget_checked ? t("genome_checked_yes") : t("genome_checked_no")}
                    </span>
                    {result.target_locus ? (
                      <span className={getAnchorStatusMeta(result.target_locus_anchor_status, t).className}>
                        {getAnchorStatusMeta(result.target_locus_anchor_status, t).label}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={() => exportGrnaCSV(result.grna_list, result.gene_name, result.cas_type, result.species)}
                  className="btn-secondary"
                  style={{
                    padding: "9px 14px",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    borderColor: "rgba(255,255,255,0.16)",
                  }}
                >
                  {t("export_csv")}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 22 }}>
                {[
                  { label: t("total_label"), value: result.grna_list.length },
                  { label: t("validated_count_label"), value: validatedCount },
                  { label: t("clean_count_label"), value: cleanCount },
                  { label: t("caution_count_label"), value: cautionCount },
                  ...(result.target_locus ? [{ label: t("anchor_matched_count_label"), value: result.target_locus_matched_guides }] : []),
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      padding: "16px 18px",
                      borderRadius: 24,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em" }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", marginTop: 4 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {result.target_locus ? (
              <section
                className="card-sm"
                style={{
                  padding: 18,
                  borderRadius: 24,
                  background: "rgba(83,157,245,0.08)",
                  border: "1px solid rgba(83,157,245,0.22)",
                }}
              >
                <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--tone-blue-label)",
                        marginBottom: 8,
                      }}
                    >
                      {t("anchor_title")}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>
                      {formatTargetLocus(result.target_locus)}
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-2)", maxWidth: 760 }}>{result.target_locus_summary}</p>
                  </div>
                  <span className={getAnchorStatusMeta(result.target_locus_anchor_status, t).className}>
                    {getAnchorStatusMeta(result.target_locus_anchor_status, t).label}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 14 }}>
                  <div className="card-sm" style={{ padding: "12px 13px", borderRadius: 18 }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("anchor_matched_label")}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>{result.target_locus_matched_guides}</div>
                  </div>
                  <div className="card-sm" style={{ padding: "12px 13px", borderRadius: 18 }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("anchor_unmatched_label")}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>{result.target_locus_unmatched_guides}</div>
                  </div>
                  <div className="card-sm" style={{ padding: "12px 13px", borderRadius: 18 }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("anchor_engine_label")}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
                      {result.target_locus_anchor_used ? t("anchor_engine_genome") : t("anchor_engine_unavailable")}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {!result.genome_wide_offtarget_checked && result.off_target_fallback_reason ? (
              <section
                className="card-sm"
                style={{
                  padding: 16,
                  borderRadius: 24,
                  background: "var(--tone-amber-bg)",
                  border: "1px solid var(--tone-amber-border)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--tone-amber-label)",
                    marginBottom: 8,
                  }}
                >
                  {t("fallback_title")}
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-2)" }}>{t("fallback_body")}</p>
                <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-3)", marginTop: 8 }}>{result.off_target_fallback_reason}</p>
              </section>
            ) : null}

            {/* Gene info card */}
            {result.gene_name && (result.gene_full_name || result.gene_summary) ? (
              <section
                style={{
                  padding: "20px 24px",
                  borderRadius: 24,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap", marginBottom: result.gene_summary ? 12 : 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.01em" }}>
                        {result.gene_name}
                      </div>
                      {result.gene_full_name ? (
                        <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic" }}>
                          {result.gene_full_name}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {result.gene_chromosome ? (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                          background: "rgba(83,157,245,0.12)", color: "#539df5",
                          border: "1px solid rgba(83,157,245,0.2)",
                        }}>
                          Chr {result.gene_chromosome}
                        </span>
                      ) : null}
                      {result.species ? (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                          background: "var(--bg-inset)", color: "var(--text-3)",
                          border: "1px solid var(--border)",
                        }}>
                          {getSpeciesLabel(result.species, t)}
                        </span>
                      ) : null}
                      {result.gene_aliases ? (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                          background: "var(--bg-inset)", color: "var(--text-3)",
                          border: "1px solid var(--border)",
                        }}>
                          aka {result.gene_aliases.split(";").slice(0, 3).join(", ")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                {result.gene_summary ? (
                  <p style={{
                    fontSize: 13, lineHeight: 1.8, color: "var(--text-2)",
                    margin: 0,
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  } as React.CSSProperties}>
                    {result.gene_summary}
                  </p>
                ) : null}
              </section>
            ) : null}

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {[
                { meta: result.risk_model, title: t("activity_model_title"), body: t("activity_model_body"), tint: "var(--tone-green-bg)" },
                { meta: result.off_target_model, title: t("offtarget_model_title"), body: t("offtarget_model_body"), tint: "var(--tone-blue-bg)" },
                { meta: `${getSpeciesLabel(result.species, t)} / ${result.off_target_scope}`, title: t("scope_title"), body: t("scope_body"), tint: "var(--tone-amber-bg)" },
                { meta: hitAnnotationMeta?.label || t("hit_annotation_fallback_badge"), title: t("hit_annotation_card_title"), body: hitAnnotationMeta?.body || t("hit_annotation_fallback_body"), tint: "var(--bg-inset)" },
              ].map((card) => (
                <div
                  key={card.title}
                  className="tool-card"
                  style={{
                    padding: 18,
                    borderRadius: 24,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      padding: "4px 9px",
                      borderRadius: 999,
                      background: card.tint,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-2)",
                      marginBottom: 12,
                    }}
                  >
                    {card.meta}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)", marginBottom: 8 }}>{card.title}</div>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-2)" }}>{card.body}</p>
                </div>
              ))}
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {result.fetched_transcript_id ? (
                <div style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: "var(--bg-inset)",
                  border: "1px solid var(--border)",
                  color: "var(--text-2)",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <span style={{ fontSize: 15 }}>🧬</span>
                  <span>
                    {t("fetched_transcript_label")}{" "}
                    <code style={{ color: "var(--text-1)", fontWeight: 600 }}>{result.fetched_transcript_id}</code>
                    {result.fetched_transcript_desc ? <> — {result.fetched_transcript_desc}</> : null}
                  </span>
                </div>
              ) : null}
              <div style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "var(--tone-amber-bg, #fffbeb)",
                border: "1px solid #f59e0b44",
                color: "var(--text-1)",
                fontSize: 13,
              }}>
                ⚠️ {t("activity_score_warning")}
              </div>
              {result.grna_list.map((guide, index) => {
                const expanded = expandedRank === guide.rank;
                const offTargetBadge = getOffTargetBadge(guide, t);
                const anchorStatus = getAnchorStatusMeta(guide.target_locus_status, t);
                const riskColor = guide.off_target_risk === "Low" ? "#4ade80"
                  : guide.off_target_risk === "Medium" ? "#ffa42b"
                  : guide.off_target_risk === "High" ? "#f87171"
                  : guide.heuristic_risk === "Low" ? "#4ade80"
                  : guide.heuristic_risk === "Medium" ? "#ffa42b"
                  : "#f87171";
                return (
                  <article
                    key={guide.rank}
                    className={`tool-card fade-in-up delay-${Math.min(index + 1, 5)}`}
                    style={{
                      borderRadius: 30,
                      border: "1px solid var(--border)",
                      background: "var(--bg-card)",
                      boxShadow: expanded ? "var(--shadow-lg)" : "var(--shadow-xs)",
                      overflow: "hidden",
                      borderLeft: `3px solid ${riskColor}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedRank(expanded ? null : guide.rank)}
                      aria-expanded={expanded}
                      style={{
                        width: "100%",
                        display: "flex",
                        gap: 16,
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "18px 20px",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", gap: 16, alignItems: "center", minWidth: 0 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 14,
                            display: "grid",
                            placeItems: "center",
                            background: expanded ? "rgba(83,157,245,0.15)" : "rgba(255,255,255,0.06)",
                            color: expanded ? "#539df5" : "var(--text-2)",
                            fontSize: 14,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {guide.rank}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                            <code
                              style={{
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                                fontSize: 15,
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                              }}
                            >
                              <span style={{ color: "var(--text-1)" }}>{guide.grna_sequence}</span>
                              <span style={{ color: "var(--tone-amber-label, #b45309)", opacity: 0.9, marginLeft: 1 }}>{guide.pam}</span>
                            </code>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(guide.grna_sequence); }}
                              style={{
                                fontSize: 10,
                                padding: "2px 7px",
                                borderRadius: 4,
                                border: "1px solid rgba(83,157,245,0.3)",
                                background: "rgba(83,157,245,0.08)",
                                color: "#539df5",
                                cursor: "pointer",
                                flexShrink: 0,
                              }}
                            >
                              Copy
                            </button>
                            <code
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 999,
                                background: "var(--tone-amber-bg)",
                                color: "var(--tone-amber-label)",
                                border: "1px solid var(--tone-amber-border)",
                              }}
                            >
                              PAM {guide.pam}
                            </code>
                            <span className={offTargetBadge.className}>{offTargetBadge.label}</span>
                            {result.target_locus ? <span className={anchorStatus.className}>{anchorStatus.label}</span> : null}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "var(--text-3)" }}>
                            <span>{t("position_label")} {guide.position}</span>
                            <span>{guide.strand === "+" ? t("strand_plus") : t("strand_minus")}</span>
                            <span>{t("gc_label")} {guide.gc_content}%</span>
                            <span>{getOffTargetSummary(guide, t)}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                          <span className={TIER_STYLE[guide.heuristic_risk]}>{getActivityLabel(guide.heuristic_risk, t)}</span>
                          <span className="badge badge-blue">{t("offtarget_hits_label", { count: guide.potential_off_target_hits })}</span>
                        </div>
                        <ScoreRing score={Math.round(guide.on_target_score)} />
                      </div>
                    </button>

                    {expanded ? (
                      <div style={{ borderTop: "1px solid var(--border)", padding: "16px 20px 20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                          <div
                            style={{
                              padding: 18,
                              borderRadius: 24,
                              background: "var(--tone-green-bg)",
                              border: "1px solid var(--tone-green-border)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: "var(--tone-green-label)",
                                marginBottom: 10,
                              }}
                            >
                              {t("activity_panel_title")}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                              <div className="card-sm" style={{ padding: "12px 13px", borderRadius: 18 }}>
                                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("activity_score_label")}</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>{guide.on_target_score}</div>
                              </div>
                              <div className="card-sm" style={{ padding: "12px 13px", borderRadius: 18 }}>
                                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("activity_tier_label")}</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>{getActivityLabel(guide.heuristic_risk, t)}</div>
                              </div>
                            </div>
                            <div
                              style={{
                                marginTop: 10,
                                padding: "12px 13px",
                                borderRadius: 18,
                                background: "var(--bg-inset)",
                                border: "1px solid var(--border)",
                              }}
                            >
                              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 5 }}>{t("guide_with_pam_label")}</div>
                              <code style={{ fontSize: 13, fontWeight: 700, wordBreak: "break-all" }}>
                                <span style={{ color: "var(--text-1)" }}>{guide.grna_sequence}</span>
                                <span style={{ color: "var(--tone-amber-label, #b45309)", opacity: 0.9 }}>{guide.pam}</span>
                              </code>
                            </div>
                            <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-2)", marginTop: 10 }}>{t("activity_panel_body")}</p>
                          </div>

                          <div
                            style={{
                              padding: 18,
                              borderRadius: 24,
                              background: "var(--tone-blue-bg)",
                              border: "1px solid var(--tone-blue-border)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: "var(--tone-blue-label)",
                                marginBottom: 10,
                              }}
                            >
                              {t("offtarget_panel_title")}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                              <div className="card-sm" style={{ padding: "12px 13px", borderRadius: 18 }}>
                                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("offtarget_status_label")}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{offTargetBadge.label}</div>
                              </div>
                              <div className="card-sm" style={{ padding: "12px 13px", borderRadius: 18 }}>
                                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("offtarget_hits_metric")}</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>{guide.potential_off_target_hits}</div>
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 10 }}>
                              <div
                                style={{
                                  padding: "12px 13px",
                                  borderRadius: 18,
                                  background: "var(--bg-inset)",
                                  border: "1px solid var(--border)",
                                }}
                              >
                                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("best_non_target_label")}</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)" }}>{guide.best_non_target_identity > 0 ? `${guide.best_non_target_identity}%` : "--"}</div>
                              </div>
                              <div
                                style={{
                                  padding: "12px 13px",
                                  borderRadius: 18,
                                  background: "var(--bg-inset)",
                                  border: "1px solid var(--border)",
                                }}
                              >
                                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("screen_scope_label")}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{getSpeciesLabel(result.species, t)}</div>
                              </div>
                            </div>
                            {result.target_locus ? (
                              <div
                                style={{
                                  marginTop: 10,
                                  padding: "12px 13px",
                                  borderRadius: 18,
                                  background: "var(--bg-inset)",
                                  border: "1px solid var(--border)",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                    marginBottom: 6,
                                  }}
                                >
                                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t("anchor_status_label")}</div>
                                  <span className={anchorStatus.className}>{anchorStatus.label}</span>
                                </div>
                                <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-2)" }}>{guide.target_locus_message}</p>
                              </div>
                            ) : null}
                            <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-2)", marginTop: 10 }}>{guide.off_target_message || getOffTargetSummary(guide, t)}</p>
                          </div>
                        </div>

                        {guide.top_off_target_hits.length ? (
                          <div
                            style={{
                              marginTop: 14,
                              padding: 16,
                              borderRadius: 24,
                              background: "var(--bg-inset)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", marginBottom: 10 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>{t("top_hits_title")}</div>
                                <div style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-2)", maxWidth: 760 }}>
                                  {hitAnnotationMeta?.body || t("hit_annotation_fallback_body")}
                                </div>
                              </div>
                              <span className={hitAnnotationMeta?.className || "badge badge-gray"}>
                                {hitAnnotationMeta?.label || t("hit_annotation_fallback_badge")}
                              </span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {guide.top_off_target_hits.map((hit) => {
                                const regionMeta = getHitRegionMeta(hit.annotation, t);
                                return (
                                  <div
                                    key={`${guide.rank}-${hit.rank}-${hit.accession}-${hit.position}`}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "minmax(0, 1.8fr) repeat(5, minmax(72px, 96px))",
                                      gap: 12,
                                      alignItems: "center",
                                      padding: "12px 14px",
                                      borderRadius: 18,
                                      background: "var(--bg-card)",
                                      border: "1px solid var(--border)",
                                    }}
                                  >
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)" }}>{hit.accession}</div>
                                        {hit.is_target_locus ? <span className="badge badge-green">{t("target_hit_badge")}</span> : null}
                                        {hit.annotation?.gene_symbol ? <span className="badge badge-blue">{hit.annotation.gene_symbol}</span> : null}
                                        {hit.annotation?.status === "annotated" && hit.annotation.region ? (
                                          <span className={regionMeta.className}>{regionMeta.label}</span>
                                        ) : null}
                                      </div>
                                      <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>{hit.title}</div>
                                      {hit.annotation?.status === "annotated" ? (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8, fontSize: 11, color: "var(--text-3)" }}>
                                          {hit.annotation.transcript_id ? (
                                            <span>{t("hit_annotation_transcript")}: {hit.annotation.transcript_id}</span>
                                          ) : null}
                                          {hit.annotation.gene_biotype ? (
                                            <span>{t("hit_annotation_biotype")}: {hit.annotation.gene_biotype}</span>
                                          ) : null}
                                          {typeof hit.annotation.distance_to_tss === "number" ? (
                                            <span>{t("hit_annotation_distance", { count: formatBpCount(hit.annotation.distance_to_tss) })}</span>
                                          ) : null}
                                        </div>
                                      ) : (
                                        <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.6, color: "var(--text-3)" }}>
                                          {t("hit_annotation_unavailable_inline")}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("hit_position_label")}</div>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{hit.position || "--"}</div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("hit_strand_label")}</div>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{hit.strand}</div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("hit_pam_label")}</div>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{hit.pam || "--"}</div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("identity_label")}</div>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{hit.identity}%</div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("mismatches_label")}</div>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{hit.mismatches}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        <div
                          style={{
                            marginTop: 14,
                            padding: "14px 16px",
                            borderRadius: 20,
                            background: "var(--tone-amber-bg)",
                            border: "1px solid var(--tone-amber-border)",
                            fontSize: 12,
                            lineHeight: 1.7,
                            color: "var(--text-2)",
                          }}
                        >
                          {t("scope_note")}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
