"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
  const color = score >= 75 ? "#0f6a45" : score >= 50 ? "#b45309" : "#b42318";
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" style={{ flexShrink: 0 }}>
      <circle cx="30" cy="30" r="26" fill="#f8fafc" />
      <circle cx="30" cy="30" r={radius} fill="none" stroke="#d7dee7" strokeWidth="4" />
      <circle
        cx="30"
        cy="30"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${fill} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 30 30)"
      />
      <text x="30" y="34" textAnchor="middle" fontSize="14" fontWeight="800" fill={color}>
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

function getSpeciesEnvVars(species: string) {
  if (species === "mouse") {
    return {
      indexVar: "GRNA_BOWTIE2_INDEX_MOUSE",
      fastaVar: "GRNA_GENOME_FASTA_MOUSE",
      exampleIndex: "D:/genomes/mm39/bowtie2/mm39",
      exampleFasta: "D:/genomes/mm39/mm39.fa",
    };
  }
  return {
    indexVar: "GRNA_BOWTIE2_INDEX_HUMAN",
    fastaVar: "GRNA_GENOME_FASTA_HUMAN",
    exampleIndex: "D:/genomes/hg38/bowtie2/hg38",
    exampleFasta: "D:/genomes/hg38/hg38.fa",
  };
}

function buildEnvTemplate(species: string, readiness: GrnaOfftargetReadiness | null) {
  const env = getSpeciesEnvVars(species);
  return [
    "# CRISPR genome-level off-target backend",
    `GRNA_OFFTARGET_BACKEND=${readiness?.backend_mode || "auto"}`,
    `GRNA_ENABLE_NT_BLAST_FALLBACK=${readiness?.fallback_enabled ?? true}`,
    "GRNA_BOWTIE2_PATH=bowtie2",
    `${env.indexVar}=${env.exampleIndex}`,
    `${env.fastaVar}=${env.exampleFasta}`,
  ].join("\n");
}

function getReadinessActionItems(
  readiness: GrnaOfftargetReadiness | null,
  species: string,
  t: ReturnType<typeof useTranslations>,
) {
  if (!readiness) return [];

  const env = getSpeciesEnvVars(species);
  const items: string[] = [];
  const needsBowtie = readiness.missing_requirements.some((item) => item.toLowerCase().includes("bowtie2"));
  const needsIndex = readiness.missing_env_vars.includes(env.indexVar);
  const needsFasta = readiness.missing_env_vars.includes(env.fastaVar);

  if (readiness.readiness_status === "ready") {
    items.push(t("readiness_action_ready"));
  } else if (readiness.readiness_status === "fallback") {
    items.push(t("readiness_action_fallback"));
  } else if (readiness.readiness_status === "disabled") {
    items.push(t("readiness_action_disabled"));
  } else {
    items.push(t("readiness_action_unavailable"));
  }

  if (needsBowtie) {
    items.push(t("readiness_action_bowtie"));
  }
  if (needsIndex || needsFasta) {
    items.push(
      t("readiness_action_env", {
        indexVar: env.indexVar,
        fastaVar: env.fastaVar,
      }),
    );
  }
  if (!readiness.target_locus_anchor_ready) {
    items.push(t("readiness_action_anchor"));
  }

  return items;
}

function getStatusText(enabled: boolean, t: ReturnType<typeof useTranslations>) {
  return enabled ? t("readiness_status_yes") : t("readiness_status_no");
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
  const [readinessError, setReadinessError] = useState("");
  const [templateCopied, setTemplateCopied] = useState(false);
  const [expandedRank, setExpandedRank] = useState<number | null>(null);

  const parsedTargetLocus = parseTargetLocusInput(targetLocusText);

  useEffect(() => {
    let cancelled = false;

    async function loadReadiness() {
      setReadiness(null);
      setReadinessError("");
      try {
        const response = await getGrnaOfftargetReadiness(species);
        if (!cancelled) {
          setReadiness(response);
        }
      } catch (err: any) {
        if (!cancelled) {
          setReadiness(null);
          setReadinessError(err?.message || tCommon("request_failed"));
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
    if (sequence.trim().length < 23) {
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
        sequence,
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
      setError(err.message || tCommon("request_failed"));
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
  const envTemplate = buildEnvTemplate(species, readiness);
  const readinessActions = getReadinessActionItems(readiness, species, t);
  const hitAnnotationMeta = result ? getHitAnnotationMeta(result, t) : null;

  const casOptions: Array<{ value: CasValue; pam: string; desc: string }> = [
    { value: "SpCas9", pam: "NGG", desc: t("most_common") },
    { value: "SpCas9-NG", pam: "NG", desc: t("relaxed_pam") },
    { value: "Cas12a", pam: "TTTV", desc: t("five_prime_pam") },
  ];

  return (
    <div className="page-sidebar-layout" style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
      <aside
        className="page-sidebar"
        style={{
          width: 336,
          flexShrink: 0,
          position: "sticky",
          top: 72,
          padding: 22,
          borderRadius: 28,
          border: "1px solid rgba(15,106,69,0.14)",
          background: "linear-gradient(180deg, rgba(248,252,249,0.98), rgba(255,255,255,0.98))",
          boxShadow: "0 26px 60px rgba(15,23,42,0.08)",
        }}
      >
        <div
          style={{
            padding: 18,
            borderRadius: 22,
            background: "linear-gradient(135deg, #0f6a45 0%, #134e4a 100%)",
            color: "#fff",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.78,
              marginBottom: 8,
            }}
          >
            {t("badge")}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>{t("title")}</h1>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.84)" }}>{t("subtitle")}</p>
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
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 12px",
                    borderRadius: 18,
                    border:
                      casType === option.value
                        ? "1.5px solid rgba(15,106,69,0.45)"
                        : "1px solid rgba(148,163,184,0.24)",
                    background:
                      casType === option.value ? "rgba(217,251,231,0.78)" : "rgba(255,255,255,0.84)",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: casType === option.value ? "#0f6a45" : "var(--text-1)",
                      }}
                    >
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
                      background: "#fff",
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
                <button
                  key={value}
                  type="button"
                  onClick={() => setSpecies(value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 16,
                    border:
                      species === value
                        ? "1.5px solid rgba(29,78,216,0.35)"
                        : "1px solid rgba(148,163,184,0.24)",
                    background:
                      species === value ? "rgba(219,234,254,0.82)" : "rgba(255,255,255,0.84)",
                    color: species === value ? "#1d4ed8" : "var(--text-2)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {value === "mouse" ? t("species_mouse") : t("species_human")}
                </button>
              ))}
            </div>
          </div>

          <div
            className="card-sm"
            style={{
              padding: "14px 15px",
              borderRadius: 18,
              background: readiness?.genome_backend_ready
                ? "rgba(240,253,244,0.92)"
                : "rgba(248,250,252,0.92)",
              border: readiness?.genome_backend_ready
                ? "1px solid rgba(34,197,94,0.22)"
                : "1px solid rgba(148,163,184,0.18)",
            }}
          >
            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)" }}>{t("readiness_title")}</div>
              <span className={readinessMeta.className}>{readinessMeta.label}</span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-2)" }}>
              {readiness?.summary || t("readiness_loading_body")}
            </p>
            {readiness ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
                <div style={{ padding: "10px 12px", borderRadius: 16, background: "rgba(255,255,255,0.76)", border: "1px solid rgba(148,163,184,0.14)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("readiness_engine_label")}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>{readiness.active_engine}</div>
                </div>
                <div style={{ padding: "10px 12px", borderRadius: 16, background: "rgba(255,255,255,0.76)", border: "1px solid rgba(148,163,184,0.14)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("readiness_backend_label")}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>{readiness.backend_mode}</div>
                </div>
              </div>
            ) : null}
            {readinessActions.length ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 6 }}>{t("readiness_next_title")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {readinessActions.map((item) => (
                    <div key={item} style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-2)" }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {readiness && readiness.missing_env_vars.length ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 6 }}>{t("readiness_env_title")}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {readiness.missing_env_vars.map((name) => (
                    <code key={name} style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(255,255,255,0.92)" }}>
                      {name}
                    </code>
                  ))}
                </div>
              </div>
            ) : null}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)" }}>{t("readiness_template_title")}</div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(envTemplate);
                      setTemplateCopied(true);
                      setTimeout(() => setTemplateCopied(false), 1800);
                    } catch {
                      setReadinessError(t("readiness_copy_failed"));
                    }
                  }}
                  style={{ padding: "6px 10px", borderRadius: 12, fontSize: 12 }}
                >
                  {templateCopied ? t("readiness_copied") : t("readiness_copy_template")}
                </button>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-2)", marginBottom: 8 }}>
                {t("readiness_template_body")}
              </p>
              <pre
                style={{
                  margin: 0,
                  padding: "12px 13px",
                  borderRadius: 18,
                  background: "rgba(15,23,42,0.96)",
                  color: "#e5eef7",
                  fontSize: 11,
                  lineHeight: 1.7,
                  overflowX: "auto",
                }}
              >
                {envTemplate}
              </pre>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 6 }}>{t("readiness_steps_title")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-2)" }}>{t("readiness_step_install")}</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-2)" }}>{t("readiness_step_index")}</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-2)" }}>{t("readiness_step_env")}</div>
              </div>
            </div>
            {parsedTargetLocus && readiness && !readiness.target_locus_anchor_ready ? (
              <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.7, color: "#b45309" }}>
                {t("readiness_anchor_note")}
              </div>
            ) : null}
            {readiness ? (
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>
                  {t("readiness_summary_title")}
                </summary>
                <div
                  style={{
                    marginTop: 10,
                    padding: "12px 13px",
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.76)",
                    border: "1px solid rgba(148,163,184,0.14)",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-2)" }}>{t("readiness_summary_species")}: {getSpeciesLabel(readiness.species, t)}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-2)" }}>{t("readiness_summary_status")}: {readinessMeta.label}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-2)" }}>{t("readiness_summary_engine")}: {readiness.active_engine}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-2)" }}>{t("readiness_summary_backend")}: {readiness.backend_mode}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-2)" }}>{t("readiness_summary_fallback")}: {getStatusText(readiness.fallback_enabled, t)}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-2)" }}>{t("readiness_summary_anchor")}: {getStatusText(readiness.target_locus_anchor_ready, t)}</div>
                  </div>
                  {readiness.missing_requirements.length ? (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 6 }}>{t("readiness_missing_title")}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {readiness.missing_requirements.map((item) => (
                          <div key={item} style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-2)" }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </details>
            ) : null}
            {readinessError ? (
              <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.7, color: "var(--red)" }}>
                {t("readiness_error")}: {readinessError}
              </div>
            ) : null}
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
              <span style={{ color: "var(--red)", textTransform: "none", letterSpacing: 0 }}>
                {t("seq_required")}
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
              required
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
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 18,
              border: "none",
              background: loading
                ? "rgba(15,106,69,0.45)"
                : "linear-gradient(135deg, #0f6a45, #134e4a)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? t("searching_btn") : t("search_btn")}
          </button>
        </form>

        <div
          className="card-sm"
          style={{
            marginTop: 14,
            padding: "14px 15px",
            borderRadius: 18,
            background: "rgba(255,248,235,0.86)",
            border: "1px solid rgba(245,158,11,0.24)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#b45309", marginBottom: 5 }}>
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

      <main style={{ flex: 1, minWidth: 0 }}>
        {!result && !loading ? (
          <div
            className="empty-state"
            style={{
              minHeight: 520,
              padding: "34px clamp(24px, 4vw, 40px)",
              borderRadius: 34,
              border: "1px solid rgba(15,106,69,0.12)",
              background:
                "radial-gradient(circle at top right, rgba(15,106,69,0.15), transparent 34%), linear-gradient(180deg, rgba(249,252,250,1), rgba(255,255,255,1))",
              boxShadow: "0 26px 60px rgba(15,23,42,0.08)",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(15,106,69,0.09)",
                color: "#0f6a45",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 18,
              }}
            >
              {t("badge")}
            </div>
            <h2
              style={{
                fontSize: "clamp(34px, 4vw, 50px)",
                lineHeight: 1.04,
                letterSpacing: "-0.04em",
                color: "var(--text-1)",
                marginBottom: 12,
              }}
            >
              {t("empty_title")}
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-2)", maxWidth: 680 }}>{t("empty_subtitle")}</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 14,
                width: "100%",
                marginTop: 30,
              }}
            >
              {[
                { eyebrow: t("feature_activity_eyebrow"), title: t("feature_activity_title"), body: t("feature_activity_body") },
                { eyebrow: t("feature_offtarget_eyebrow"), title: t("feature_offtarget_title"), body: t("feature_offtarget_body") },
                { eyebrow: t("feature_evidence_eyebrow"), title: t("feature_evidence_title"), body: t("feature_evidence_body") },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="tool-card"
                  style={{
                    padding: 18,
                    borderRadius: 24,
                    background: "rgba(255,255,255,0.88)",
                    border: "1px solid rgba(148,163,184,0.16)",
                    boxShadow: "0 16px 28px rgba(15,23,42,0.05)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#0f6a45",
                      marginBottom: 10,
                    }}
                  >
                    {feature.eyebrow}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", marginBottom: 8 }}>{feature.title}</div>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-2)" }}>{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div
            style={{
              minHeight: 420,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "36px clamp(24px, 4vw, 42px)",
              borderRadius: 34,
              border: "1px solid rgba(15,106,69,0.12)",
              background: "linear-gradient(180deg, #f8fbf9 0%, #ffffff 100%)",
              boxShadow: "0 24px 56px rgba(15,23,42,0.08)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                background: "rgba(15,106,69,0.12)",
                marginBottom: 18,
              }}
            >
              <svg className="animate-spin" style={{ width: 24, height: 24, color: "#0f6a45" }} viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-1)", marginBottom: 8 }}>{t("searching_btn")}</div>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text-2)", maxWidth: 560 }}>{t("scanning_msg")}</p>
          </div>
        ) : null}

        {result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <section
              style={{
                padding: "28px clamp(22px, 4vw, 34px)",
                borderRadius: 34,
                background: "linear-gradient(135deg, #0f172a 0%, #10352f 62%, #0f6a45 100%)",
                color: "#fff",
                boxShadow: "0 28px 64px rgba(15,23,42,0.16)",
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
                  background: "rgba(240,249,255,0.92)",
                  border: "1px solid rgba(59,130,246,0.18)",
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
                        color: "#1d4ed8",
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
                  background: "rgba(255,248,235,0.92)",
                  border: "1px solid rgba(245,158,11,0.24)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#b45309",
                    marginBottom: 8,
                  }}
                >
                  {t("fallback_title")}
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-2)" }}>{t("fallback_body")}</p>
                <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-3)", marginTop: 8 }}>{result.off_target_fallback_reason}</p>
              </section>
            ) : null}

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {[
                { meta: result.risk_model, title: t("activity_model_title"), body: t("activity_model_body"), tint: "rgba(217,251,231,0.92)" },
                { meta: result.off_target_model, title: t("offtarget_model_title"), body: t("offtarget_model_body"), tint: "rgba(219,234,254,0.92)" },
                { meta: `${getSpeciesLabel(result.species, t)} / ${result.off_target_scope}`, title: t("scope_title"), body: t("scope_body"), tint: "rgba(255,248,235,0.92)" },
                { meta: hitAnnotationMeta?.label || t("hit_annotation_fallback_badge"), title: t("hit_annotation_card_title"), body: hitAnnotationMeta?.body || t("hit_annotation_fallback_body"), tint: "rgba(243,244,246,0.96)" },
              ].map((card) => (
                <div
                  key={card.title}
                  className="tool-card"
                  style={{
                    padding: 18,
                    borderRadius: 24,
                    background: "rgba(255,255,255,0.92)",
                    border: "1px solid rgba(148,163,184,0.16)",
                    boxShadow: "0 16px 28px rgba(15,23,42,0.05)",
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
              {result.grna_list.map((guide, index) => {
                const expanded = expandedRank === guide.rank;
                const offTargetBadge = getOffTargetBadge(guide, t);
                const anchorStatus = getAnchorStatusMeta(guide.target_locus_status, t);
                return (
                  <article
                    key={guide.rank}
                    className={`tool-card fade-in-up delay-${Math.min(index + 1, 5)}`}
                    style={{
                      borderRadius: 30,
                      border: "1px solid rgba(148,163,184,0.16)",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(249,251,252,0.98))",
                      boxShadow: expanded ? "0 28px 54px rgba(15,23,42,0.10)" : "0 12px 24px rgba(15,23,42,0.05)",
                      overflow: "hidden",
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
                            background: expanded ? "rgba(15,106,69,0.12)" : "rgba(15,23,42,0.05)",
                            color: expanded ? "#0f6a45" : "var(--text-2)",
                            fontSize: 14,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {guide.rank}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                            <span
                              style={{
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                                fontSize: 15,
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                color: "var(--text-1)",
                              }}
                            >
                              {guide.grna_sequence}
                            </span>
                            <code
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 999,
                                background: "rgba(253,230,138,0.34)",
                                color: "#b45309",
                                border: "1px solid rgba(245,158,11,0.2)",
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
                      <div style={{ borderTop: "1px solid rgba(148,163,184,0.16)", padding: "16px 20px 20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                          <div
                            style={{
                              padding: 18,
                              borderRadius: 24,
                              background: "rgba(244,250,246,0.94)",
                              border: "1px solid rgba(15,106,69,0.14)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: "#0f6a45",
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
                                background: "rgba(255,255,255,0.72)",
                                border: "1px solid rgba(148,163,184,0.16)",
                              }}
                            >
                              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 5 }}>{t("guide_with_pam_label")}</div>
                              <code style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", wordBreak: "break-all" }}>{guide.guide_with_pam}</code>
                            </div>
                            <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-2)", marginTop: 10 }}>{t("activity_panel_body")}</p>
                          </div>

                          <div
                            style={{
                              padding: 18,
                              borderRadius: 24,
                              background: "rgba(245,248,255,0.94)",
                              border: "1px solid rgba(29,78,216,0.14)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: "#1d4ed8",
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
                                  background: "rgba(255,255,255,0.72)",
                                  border: "1px solid rgba(148,163,184,0.16)",
                                }}
                              >
                                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{t("best_non_target_label")}</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)" }}>{guide.best_non_target_identity > 0 ? `${guide.best_non_target_identity}%` : "--"}</div>
                              </div>
                              <div
                                style={{
                                  padding: "12px 13px",
                                  borderRadius: 18,
                                  background: "rgba(255,255,255,0.72)",
                                  border: "1px solid rgba(148,163,184,0.16)",
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
                                  background: "rgba(255,255,255,0.72)",
                                  border: "1px solid rgba(148,163,184,0.16)",
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
                              background: "rgba(255,255,255,0.86)",
                              border: "1px solid rgba(148,163,184,0.14)",
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
                                      background: "rgba(248,250,252,0.92)",
                                      border: "1px solid rgba(148,163,184,0.16)",
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
                            background: "rgba(255,248,235,0.72)",
                            border: "1px solid rgba(245,158,11,0.18)",
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
