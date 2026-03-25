"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/lib/useToast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface BlastTopHit { rank: number; title: string; identity: number; is_off_target: boolean; }
interface BlastValidation {
  specific: boolean;
  top_hit_identity: number;
  off_target_count: number;
  top_hits: BlastTopHit[];
  status?: "validated" | "no_hits" | "error";
  message?: string;
}
interface ExonSpan { spans_junction: boolean; left_exon: number | null; right_exon: number | null; junction_count: number; }
interface PrimerScore { total: number; tm_score: number; gc_score: number; specificity_score: number; exon_score: number; dimer_score: number; }
interface PrimerProperties { self_any_th: number; self_end_th: number; hairpin_th: number; gc_clamp: number; start: number; length: number; }
interface PrimerDesignBasis {
  template_source: string;
  design_region_start: number;
  design_region_end: number;
  cds_region_start?: number | null;
  cds_region_end?: number | null;
  exon_count: number;
  exon_spanning_preferred: boolean;
  primer_size_min: number;
  primer_size_opt: number;
  primer_size_max: number;
  tm_min: number;
  tm_opt: number;
  tm_max: number;
  gc_min: number;
  gc_max: number;
  product_min: number;
  product_max: number;
  max_poly_x: number;
  max_self_any_th: number;
  max_self_end_th: number;
  max_hairpin_th: number;
  candidate_pairs_designed: number;
  candidate_pairs_blasted: number;
  returned_pairs: number;
  blast_database: string;
  specificity_scope: string;
  genome_wide_specificity_checked: boolean;
  off_target_identity_threshold: number;
}
interface GeneInfo {
  gene_symbol: string; full_name: string; summary: string;
  chromosome: string; map_location: string; aliases: string; organism: string;
  transcript_id: string; transcript_description: string;
  total_nm_found: number; selection_reason: string;
  cds_length: number; protein_length: number; exon_count: number;
}
interface ValidatedPrimerPair {
  rank: number; left_primer: string; right_primer: string;
  left_tm: number; right_tm: number; left_gc: number; right_gc: number;
  product_size: number; penalty: number;
  blast_left: BlastValidation; blast_right: BlastValidation;
  is_specific: boolean; exon_span: ExonSpan; score: PrimerScore;
  left_props: PrimerProperties | null; right_props: PrimerProperties | null;
  amplicon_sequence: string;
}
interface ExonViz { index: number; start: number; end: number; }
interface PrimerResult {
  success: boolean; gene_name?: string; species: string; transcript_id?: string;
  sequence_length: number; cds_start: number; cds_end: number;
  exons: ExonViz[]; primer_pairs: ValidatedPrimerPair[];
  design_basis?: PrimerDesignBasis;
  gene_info?: GeneInfo;
  message: string;
}

function ValidationChecklist({ p }: { p: ValidatedPrimerPair }) {
  const t = useTranslations("primer");
  const tmDiff = Math.abs(p.left_tm - p.right_tm);
  const blastLeftStatus = p.blast_left.status ?? "validated";
  const blastRightStatus = p.blast_right.status ?? "validated";
  const blastValidated = blastLeftStatus === "validated" && blastRightStatus === "validated";
  const blastOk = blastValidated && p.is_specific;
  const blastDetail =
    blastLeftStatus === "error" || blastRightStatus === "error"
      ? t("check_blast_error")
      : blastLeftStatus === "no_hits" || blastRightStatus === "no_hits"
        ? t("check_blast_unavailable")
        : p.is_specific
          ? t("check_blast_specific")
          : t("check_blast_offtarget");
  const gcOk = p.left_gc >= 40 && p.left_gc <= 60 && p.right_gc >= 40 && p.right_gc <= 60;
  const tmOk = p.left_tm >= 58 && p.left_tm <= 62 && p.right_tm >= 58 && p.right_tm <= 62;
  const tmMatchOk = tmDiff < 2;
  const clampOk = (p.left_props?.gc_clamp ?? 0) >= 1 && (p.right_props?.gc_clamp ?? 0) >= 1;
  const hairpinOk = (p.left_props?.hairpin_th ?? 0) < 24 && (p.right_props?.hairpin_th ?? 0) < 24;
  const dimerOk = (p.left_props?.self_end_th ?? 0) < 35 && (p.right_props?.self_end_th ?? 0) < 35;

  const items = [
    { label: t("check_tm_range"), pass: tmOk, detail: `F: ${p.left_tm}°C / R: ${p.right_tm}°C` },
    { label: t("check_tm_diff"), pass: tmMatchOk, detail: `${t("diff_label")} ${tmDiff.toFixed(1)}°C` },
    { label: t("check_gc"), pass: gcOk, detail: `F: ${p.left_gc}% / R: ${p.right_gc}%` },
    { label: t("check_clamp"), pass: clampOk, detail: `F: ${p.left_props?.gc_clamp ?? "—"} / R: ${p.right_props?.gc_clamp ?? "—"}` },
    { label: t("check_hairpin"), pass: hairpinOk, detail: `F: ${p.left_props?.hairpin_th ?? "—"}°C / R: ${p.right_props?.hairpin_th ?? "—"}°C` },
    { label: t("check_dimer"), pass: dimerOk, detail: `F: ${p.left_props?.self_end_th ?? "—"}°C / R: ${p.right_props?.self_end_th ?? "—"}°C` },
    { label: t("check_blast"), pass: blastOk, detail: blastDetail },
    { label: t("check_exon"), pass: p.exon_span.spans_junction, detail: p.exon_span.spans_junction ? t("check_exon_spans", { n: p.exon_span.junction_count }) : t("check_exon_none") },
  ];

  const passCount = items.filter(i => i.pass).length;
  const countBg =
    passCount === items.length ? { bg: "#d1fae5", color: "#065f46" } :
    passCount >= 6             ? { bg: "#e0e7ff", color: "#3730a3" } :
                                 { bg: "#fef3c7", color: "#92400e" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p className="label-caps">{t("checklist_title")}</p>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: countBg.bg, color: countBg.color }}>
          {t("pass_badge", { n: passCount, total: items.length })}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, background: item.pass ? "#10b981" : "#f87171" }}>{item.pass ? "✓" : "✗"}</span>
            <span style={{ color: item.pass ? "var(--text-2)" : "var(--red)" }}>{item.label}</span>
            <span style={{ color: "var(--text-3)", marginLeft: "auto", maxWidth: 260, textAlign: "right", lineHeight: 1.45 }}>{item.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlastHitsTable({ left, right }: { left: BlastValidation; right: BlastValidation }) {
  const t = useTranslations("primer");
  return (
    <div>
      <p className="label-caps" style={{ marginBottom: 12 }}>{t("blast_hits_title")}</p>
      <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.65, marginBottom: 12 }}>
        {t("blast_hits_scope_note")}
      </p>
      {[{ label: t("forward"), data: left }, { label: t("reverse"), data: right }].map(({ label, data }) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 6 }}>{label}</p>
          {data.top_hits.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>
              {data.status === "error"
                ? t("blast_error")
                : data.status === "no_hits"
                  ? t("blast_no_hits")
                  : t("no_hits")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {data.top_hits.map(hit => {
                const idBg    = hit.identity >= 99 ? "#d1fae5" : hit.identity >= 80 ? "#fef3c7" : "var(--bg-inset)";
                const idColor = hit.identity >= 99 ? "#065f46" : hit.identity >= 80 ? "#92400e" : "var(--text-2)";
                return (
                  <div key={hit.rank} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12 }}>
                    <span style={{ flexShrink: 0, padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: idBg, color: idColor }}>{hit.identity}%</span>
                    <span style={{ flex: 1, lineHeight: 1.5, color: hit.is_off_target ? "var(--orange)" : "var(--text-2)" }}>
                      {hit.title}
                      {hit.is_off_target && <span style={{ marginLeft: 4, color: "var(--orange)", fontWeight: 500 }}>⚠ {t("off_target")}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PrimerPropsTable({ p }: { p: ValidatedPrimerPair }) {
  const t = useTranslations("primer");
  if (!p.left_props || !p.right_props) return null;
  const rows = [
    { label: t("self_any_label"), left: `${p.left_props.self_any_th}°C`, right: `${p.right_props.self_any_th}°C`, threshold: "< 45°C", leftOk: p.left_props.self_any_th < 45, rightOk: p.right_props.self_any_th < 45 },
    { label: t("self_end_label"), left: `${p.left_props.self_end_th}°C`, right: `${p.right_props.self_end_th}°C`, threshold: "< 35°C", leftOk: p.left_props.self_end_th < 35, rightOk: p.right_props.self_end_th < 35 },
    { label: t("hairpin_label"), left: `${p.left_props.hairpin_th}°C`, right: `${p.right_props.hairpin_th}°C`, threshold: "< 24°C", leftOk: p.left_props.hairpin_th < 24, rightOk: p.right_props.hairpin_th < 24 },
    { label: t("gc_clamp_label"), left: `${p.left_props.gc_clamp}`, right: `${p.right_props.gc_clamp}`, threshold: "1–3", leftOk: p.left_props.gc_clamp >= 1 && p.left_props.gc_clamp <= 3, rightOk: p.right_props.gc_clamp >= 1 && p.right_props.gc_clamp <= 3 },
    { label: t("position_label"), left: `${p.left_props.start}`, right: `${p.right_props.start}`, threshold: "—", leftOk: true, rightOk: true },
    { label: t("length_label"), left: `${p.left_props.length} bp`, right: `${p.right_props.length} bp`, threshold: "18–25 bp", leftOk: p.left_props.length >= 18 && p.left_props.length <= 25, rightOk: p.right_props.length >= 18 && p.right_props.length <= 25 },
  ];
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t("primer_props_title")}</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400 border-b border-slate-100">
            <th className="text-left pb-1.5 font-medium">{t("param_label")}</th>
            <th className="text-center pb-1.5 font-medium text-blue-500">{t("forward_short")}</th>
            <th className="text-center pb-1.5 font-medium text-emerald-500">{t("reverse_short")}</th>
            <th className="text-right pb-1.5 font-medium">{t("standard_label")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map(row => (
            <tr key={row.label}>
              <td className="py-1.5 text-slate-500">{row.label}</td>
              <td className={`py-1.5 text-center font-mono font-medium ${row.leftOk ? "text-emerald-600" : "text-red-500"}`}>{row.left}</td>
              <td className={`py-1.5 text-center font-mono font-medium ${row.rightOk ? "text-emerald-600" : "text-red-500"}`}>{row.right}</td>
              <td className="py-1.5 text-right text-slate-400">{row.threshold}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AmpliconViewer({ pair }: { pair: ValidatedPrimerPair }) {
  const t = useTranslations("primer");
  const [copied, setCopied] = useState(false);
  const { amplicon_sequence: amplicon, left_primer, right_primer } = pair;
  if (!amplicon) return null;

  const lIdx = amplicon.toUpperCase().indexOf(left_primer.toUpperCase());
  const comp = (s: string) => s.split("").map(b => ({ A:"T",T:"A",G:"C",C:"G" }[b] || b)).reverse().join("");
  const rRc = comp(right_primer.toUpperCase());
  const rIdx = amplicon.toUpperCase().lastIndexOf(rRc);

  const parts: { text: string; type: "left" | "mid" | "right" | "plain" }[] = [];
  if (lIdx === -1 || rIdx === -1) {
    parts.push({ text: amplicon, type: "plain" });
  } else {
    if (lIdx > 0) parts.push({ text: amplicon.slice(0, lIdx), type: "plain" });
    parts.push({ text: amplicon.slice(lIdx, lIdx + left_primer.length), type: "left" });
    parts.push({ text: amplicon.slice(lIdx + left_primer.length, rIdx), type: "mid" });
    parts.push({ text: amplicon.slice(rIdx, rIdx + right_primer.length), type: "right" });
    if (rIdx + right_primer.length < amplicon.length)
      parts.push({ text: amplicon.slice(rIdx + right_primer.length), type: "plain" });
  }

  function copy() {
    navigator.clipboard.writeText(amplicon);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("amplicon_label")} ({amplicon.length} bp)</p>
        <button onClick={copy} className="text-xs text-indigo-500 hover:text-indigo-700 transition">
          {copied ? `✓ ${t("amplicon_copied")}` : t("amplicon_copy")}
        </button>
      </div>
      <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs leading-relaxed break-all border border-slate-100">
        {parts.map((part, i) => (
          <span key={i} className={
            part.type === "left" ? "bg-blue-100 text-blue-700 rounded px-0.5" :
            part.type === "right" ? "bg-emerald-100 text-emerald-700 rounded px-0.5" :
            part.type === "mid" ? "text-slate-600" : "text-slate-400"
          }>{part.text}</span>
        ))}
      </div>
      <div className="flex gap-4 mt-1.5 text-xs text-slate-400">
        <span><span className="inline-block w-3 h-3 bg-blue-100 rounded mr-1 align-middle" />{t("amplicon_forward_legend")}</span>
        <span><span className="inline-block w-3 h-3 bg-emerald-100 rounded mr-1 align-middle" />{t("amplicon_reverse_legend")}</span>
      </div>
    </div>
  );
}

function ScoreRing({ score, uid }: { score: number; uid: string }) {
  const r = 21;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const colorA = score >= 75 ? "#0f766e" : score >= 50 ? "#4338ca" : "#b91c1c";
  const colorB = score >= 75 ? "#34d399" : score >= 50 ? "#818cf8" : "#fb7185";
  const glow = score >= 75 ? "rgba(16,185,129,0.18)" : score >= 50 ? "rgba(99,102,241,0.18)" : "rgba(244,63,94,0.16)";
  const gradId = `psg-${uid}`;
  return (
    <div className="primer-score-ring-shell" style={{ filter: `drop-shadow(0 10px 18px ${glow})` }}>
      <svg width="60" height="60" viewBox="0 0 60 60">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorA} />
            <stop offset="100%" stopColor={colorB} />
          </linearGradient>
        </defs>
        <circle cx="30" cy="30" r={r + 4} fill="rgba(255,255,255,0.7)" />
        <circle cx="30" cy="30" r={r} fill="rgba(248,250,252,0.95)" />
        <circle cx="30" cy="30" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="4"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 30 30)"
        />
        <text x="30" y="31" textAnchor="middle" fontSize="15" fontWeight="700" fill={colorA}>{score}</text>
        <text x="30" y="42" textAnchor="middle" fontSize="6.5" letterSpacing="0.18em" fill="#64748b">SCORE</text>
      </svg>
    </div>
  );
}

function PrimerWorkflowModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("primer");
  const steps = [
    { id: "01", title: t("help_step_query_title"), body: t("help_step_query_body") },
    { id: "02", title: t("help_step_transcript_title"), body: t("help_step_transcript_body") },
    { id: "03", title: t("help_step_primer3_title"), body: t("help_step_primer3_body") },
    { id: "04", title: t("help_step_specificity_title"), body: t("help_step_specificity_body") },
    { id: "05", title: t("help_step_scoring_title"), body: t("help_step_scoring_body") },
  ];
  const scoreRules = [
    t("help_score_tm"),
    t("help_score_gc"),
    t("help_score_specificity"),
    t("help_score_exon"),
    t("help_score_dimer"),
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.42)",
        backdropFilter: "blur(6px)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="primer-workflow-title"
        className="primer-modal-shell"
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
          <div className="primer-results-stack">
            <div className="primer-modal-signal">
              {t("how_it_works")}
            </div>
            <h2 id="primer-workflow-title" style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", margin: "6px 0 8px" }}>{t("help_title")}</h2>
            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7, margin: 0 }}>{t("help_intro")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("help_close")}
            className="primer-modal-close"
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div style={{ padding: 14, borderRadius: 18, background: "#eef2ff", border: "1px solid #c7d2fe" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4338ca", marginBottom: 6 }}>
              {t("help_data_title")}
            </div>
            <div style={{ fontSize: 13, color: "#3730a3", lineHeight: 1.7 }}>{t("help_data_body")}</div>
          </div>
          <div style={{ padding: 14, borderRadius: 18, background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#047857", marginBottom: 6 }}>
              {t("help_output_title")}
            </div>
            <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.7 }}>{t("help_output_body")}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
          {steps.map((step) => (
            <div key={step.id} className="primer-modal-step">
              <div className="primer-modal-step-badge">
                {step.id}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 650, color: "var(--text-1)", marginBottom: 4 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.75 }}>{step.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 18, borderRadius: 20, background: "#fff7ed", border: "1px solid #fed7aa", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c2410c", marginBottom: 8 }}>
            {t("help_score_title")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            {scoreRules.map((rule) => (
              <div key={rule} style={{ fontSize: 13, color: "#9a3412", lineHeight: 1.6 }}>
                • {rule}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 16, borderRadius: 18, background: "#fefce8", border: "1px solid #fde68a" }}>
          <div style={{ fontSize: 13, fontWeight: 650, color: "#92400e", marginBottom: 6 }}>{t("help_note_title")}</div>
          <div style={{ fontSize: 13, color: "#a16207", lineHeight: 1.75 }}>{t("help_note_body")}</div>
        </div>
      </div>
    </div>
  );
}

function DesignBasisCard({ result }: { result: PrimerResult }) {
  const t = useTranslations("primer");
  const basis = result.design_basis;

  if (!basis) return null;

  const templateSourceLabel =
    basis.template_source === "ncbi_refseq_transcript"
      ? t("basis_template_refseq")
      : t("basis_template_custom");
  const transcriptLabel = result.transcript_id ?? result.gene_info?.transcript_id ?? t("basis_not_applicable");
  const cdsWindow =
    basis.cds_region_start && basis.cds_region_end
      ? `${basis.cds_region_start}-${basis.cds_region_end} bp`
      : t("basis_not_applicable");
  const templateItems = [
    { label: t("basis_template_source"), value: templateSourceLabel },
    { label: t("basis_transcript_used"), value: transcriptLabel },
    { label: t("basis_design_window"), value: `${basis.design_region_start}-${basis.design_region_end} bp` },
    { label: t("basis_cds_window"), value: cdsWindow },
    { label: t("basis_exon_model"), value: t("basis_exon_count_value", { count: basis.exon_count }) },
    {
      label: t("basis_exon_preference"),
      value: basis.exon_spanning_preferred ? t("basis_exon_preference_yes") : t("basis_exon_preference_no"),
    },
  ];
  const constraintItems = [
    { label: t("basis_constraints_primer_size"), value: `${basis.primer_size_min}-${basis.primer_size_max} bp · ${t("basis_opt_short")} ${basis.primer_size_opt} bp` },
    { label: t("basis_constraints_tm"), value: `${basis.tm_min}-${basis.tm_max}°C · ${t("basis_opt_short")} ${basis.tm_opt}°C` },
    { label: t("basis_constraints_gc"), value: `${basis.gc_min}-${basis.gc_max}%` },
    { label: t("basis_constraints_product"), value: `${basis.product_min}-${basis.product_max} bp` },
    { label: t("basis_constraints_polyx"), value: `≤ ${basis.max_poly_x}` },
    { label: t("basis_constraints_self_any"), value: `< ${basis.max_self_any_th}°C` },
    { label: t("basis_constraints_self_end"), value: `< ${basis.max_self_end_th}°C` },
    { label: t("basis_constraints_hairpin"), value: `< ${basis.max_hairpin_th}°C` },
  ];
  const screeningItems = [
    { label: t("basis_candidates_designed"), value: String(basis.candidate_pairs_designed) },
    { label: t("basis_candidates_blasted"), value: String(basis.candidate_pairs_blasted) },
    { label: t("basis_pairs_returned"), value: String(basis.returned_pairs) },
  ];
  const specificityItems = [
    { label: t("basis_blast_database"), value: basis.blast_database },
    {
      label: t("basis_specificity_scope"),
      value: basis.specificity_scope === "refseq_rna_transcripts" ? t("basis_scope_refseq_rna") : basis.specificity_scope,
    },
    {
      label: t("basis_genome_scope"),
      value: basis.genome_wide_specificity_checked ? t("basis_genome_scope_yes") : t("basis_genome_scope_no"),
    },
    {
      label: t("basis_offtarget_threshold"),
      value: `identity > ${basis.off_target_identity_threshold}%`,
    },
  ];
  const scoringFactors = [t("score_tm"), t("score_gc"), t("score_specificity"), t("score_exon"), t("score_dimer")];

  return (
    <div className="card primer-section-card" style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
        <div>
          <p className="label-caps" style={{ marginBottom: 8 }}>{t("design_basis_title")}</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, margin: 0 }}>{t("design_basis_intro")}</p>
        </div>
        <div style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 11, fontWeight: 700 }}>
          Primer3 · BLAST · NCBI
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 14 }}>
        <div style={{ padding: 16, borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", marginBottom: 10 }}>
            {t("basis_template_block")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {templateItems.map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                <span style={{ color: "var(--text-3)" }}>{item.label}</span>
                <span style={{ color: "var(--text-1)", fontWeight: 500, textAlign: "right" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 16, borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", marginBottom: 10 }}>
            {t("basis_constraints_block")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {constraintItems.map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                <span style={{ color: "var(--text-3)" }}>{item.label}</span>
                <span style={{ color: "var(--text-1)", fontWeight: 500, textAlign: "right" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 16, borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", marginBottom: 10 }}>
            {t("basis_screening_block")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {screeningItems.map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>{item.label}</span>
                <span style={{ minWidth: 44, padding: "4px 8px", borderRadius: 999, background: "#eef2ff", color: "#4338ca", fontSize: 12, fontWeight: 700, textAlign: "center" }}>
                  {item.value}
                </span>
              </div>
            ))}
            <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid #e2e8f0", fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
              {t("basis_scoring_caption")}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 14 }}>
        <div style={{ padding: 16, borderRadius: 18, background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c2410c", marginBottom: 10 }}>
            {t("basis_specificity_block")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {specificityItems.map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                <span style={{ color: "#9a3412" }}>{item.label}</span>
                <span style={{ color: "#7c2d12", fontWeight: 500, textAlign: "right" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 16, borderRadius: 18, background: "#fefce8", border: "1px solid #fde68a" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>{t("basis_scope_note_title")}</div>
          <div style={{ fontSize: 12, color: "#a16207", lineHeight: 1.75 }}>{t("basis_scope_note_body")}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {scoringFactors.map((factor) => (
          <span
            key={factor}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "var(--bg-inset)",
              border: "1px solid var(--border)",
              fontSize: 12,
              color: "var(--text-2)",
            }}
          >
            {factor}
          </span>
        ))}
      </div>
    </div>
  );
}

function PrimerRecommendationCard({ p }: { p: ValidatedPrimerPair }) {
  const t = useTranslations("primer");
  const tmDiff = Math.abs(p.left_tm - p.right_tm);
  const tmAvg = (p.left_tm + p.right_tm) / 2;
  const gcAvg = (p.left_gc + p.right_gc) / 2;
  const blastLeftStatus = p.blast_left.status ?? "validated";
  const blastRightStatus = p.blast_right.status ?? "validated";
  const bothBlastValidated = blastLeftStatus === "validated" && blastRightStatus === "validated";
  const offTargetCount = p.blast_left.off_target_count + p.blast_right.off_target_count;
  const leftSelfEnd = p.left_props?.self_end_th ?? 0;
  const rightSelfEnd = p.right_props?.self_end_th ?? 0;
  const leftHairpin = p.left_props?.hairpin_th ?? 0;
  const rightHairpin = p.right_props?.hairpin_th ?? 0;
  const worstSelfEnd = Math.max(leftSelfEnd, rightSelfEnd);
  const worstHairpin = Math.max(leftHairpin, rightHairpin);
  const toneStyles = {
    strong: { bg: "#ecfdf5", border: "#a7f3d0", label: "#047857", value: "#065f46" },
    ok: { bg: "#eef2ff", border: "#c7d2fe", label: "#4338ca", value: "#3730a3" },
    watch: { bg: "#fffbeb", border: "#fde68a", label: "#b45309", value: "#92400e" },
  } as const;

  const tmTone =
    tmAvg >= 59 && tmAvg <= 61 && tmDiff < 1
      ? "strong"
      : tmAvg >= 58 && tmAvg <= 62 && tmDiff < 2
        ? "ok"
        : "watch";
  const gcTone =
    gcAvg >= 45 && gcAvg <= 55 && p.left_gc >= 40 && p.left_gc <= 60 && p.right_gc >= 40 && p.right_gc <= 60
      ? "strong"
      : gcAvg >= 40 && gcAvg <= 60
        ? "ok"
        : "watch";
  const specificityTone = bothBlastValidated && p.is_specific ? "strong" : "watch";
  const exonTone = p.exon_span.spans_junction ? "strong" : "watch";
  const dimerTone =
    worstSelfEnd < 20 && worstHairpin < 10
      ? "strong"
      : worstSelfEnd < 35 && worstHairpin < 24
        ? "ok"
        : "watch";

  const insights = [
    {
      key: "tm",
      label: t("score_tm"),
      score: p.score.tm_score,
      tone: tmTone,
      metric: `F ${p.left_tm}°C · R ${p.right_tm}°C · Δ${tmDiff.toFixed(1)}°C`,
      observation: tmTone === "strong" ? t("reason_tm_ideal") : tmTone === "ok" ? t("reason_tm_ok") : t("reason_tm_watch"),
    },
    {
      key: "gc",
      label: t("score_gc"),
      score: p.score.gc_score,
      tone: gcTone,
      metric: `F ${p.left_gc}% · R ${p.right_gc}%`,
      observation: gcTone === "strong" ? t("reason_gc_ideal") : gcTone === "ok" ? t("reason_gc_ok") : t("reason_gc_watch"),
    },
    {
      key: "specificity",
      label: t("score_specificity"),
      score: p.score.specificity_score,
      tone: specificityTone,
      metric: bothBlastValidated
        ? `Top hit ${p.blast_left.top_hit_identity}% / ${p.blast_right.top_hit_identity}% · off-target ${offTargetCount}`
        : t("reason_specificity_metric_pending"),
      observation:
        bothBlastValidated && p.is_specific
          ? t("reason_specificity_validated")
          : blastLeftStatus === "error" || blastRightStatus === "error"
            ? t("reason_specificity_unvalidated")
            : bothBlastValidated
              ? t("reason_specificity_offtarget")
              : t("reason_specificity_partial"),
    },
    {
      key: "exon",
      label: t("score_exon"),
      score: p.score.exon_score,
      tone: exonTone,
      metric: p.exon_span.spans_junction ? t("check_exon_spans", { n: p.exon_span.junction_count }) : t("check_exon_none"),
      observation: p.exon_span.spans_junction ? t("reason_exon_yes", { n: p.exon_span.junction_count }) : t("reason_exon_no"),
    },
    {
      key: "dimer",
      label: t("score_dimer"),
      score: p.score.dimer_score,
      tone: dimerTone,
      metric: `3' self-end ${leftSelfEnd} / ${rightSelfEnd}°C · hairpin ${leftHairpin} / ${rightHairpin}°C`,
      observation: dimerTone === "strong" ? t("reason_dimer_low") : dimerTone === "ok" ? t("reason_dimer_ok") : t("reason_dimer_watch"),
    },
  ] as const;

  const strengths = insights
    .filter((item) => item.score > 0 && item.tone !== "watch")
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const cautions = insights.filter((item) => item.tone === "watch");

  return (
    <div className="primer-recommendation-card" style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
        <div>
          <p className="label-caps" style={{ marginBottom: 8 }}>{t("reason_title")}</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, margin: 0 }}>{t("reason_subtitle", { rank: p.rank })}</p>
        </div>
        <div style={{ flexShrink: 0, padding: "10px 12px", borderRadius: 16, background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{t("score_total")}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)", lineHeight: 1 }}>{p.score.total}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 14 }}>
        <div style={{ padding: 14, borderRadius: 18, background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#047857", marginBottom: 8 }}>{t("reason_strengths_title")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {strengths.map((item) => (
              <div key={item.key} style={{ fontSize: 12, color: "#065f46", lineHeight: 1.7 }}>
                <strong>{item.label}:</strong> {item.observation}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 14, borderRadius: 18, background: "#fffbeb", border: "1px solid #fde68a" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#b45309", marginBottom: 8 }}>{t("reason_cautions_title")}</div>
          {cautions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cautions.map((item) => (
                <div key={item.key} style={{ fontSize: 12, color: "#92400e", lineHeight: 1.7 }}>
                  <strong>{item.label}:</strong> {item.observation}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.7 }}>{t("reason_no_cautions")}</div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {insights.map((item) => {
          const palette = toneStyles[item.tone];
          return (
            <div key={item.key} style={{ padding: 14, borderRadius: 18, background: palette.bg, border: `1px solid ${palette.border}` }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>{item.label}</div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: palette.label, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("contribution_label")}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: palette.value, lineHeight: 1 }}>{item.score.toFixed(1)}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.65, marginBottom: 6 }}>
                <span style={{ color: palette.label, fontWeight: 600 }}>{t("metric_label")}:</span> {item.metric}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
                <span style={{ color: palette.label, fontWeight: 600 }}>{t("observation_label")}:</span> {item.observation}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GeneInfoCard({ info }: { info: GeneInfo }) {
  const t = useTranslations("primer");
  const [expanded, setExpanded] = useState(false);
  const summaryShort = info.summary.length > 200 ? info.summary.slice(0, 200) + "..." : info.summary;

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 mb-5 primer-gene-card">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xl font-bold text-slate-900">{info.gene_symbol}</span>
            {info.full_name && <span className="text-sm text-slate-500">{info.full_name}</span>}
          </div>
          <div className="text-xs text-slate-400 italic">{info.organism}</div>
        </div>
        <div className="flex gap-4 text-xs text-center shrink-0">
          {info.chromosome && (
            <div className="bg-white rounded-lg px-3 py-2 border border-slate-100 shadow-sm">
              <div className="font-bold text-slate-800">Chr {info.chromosome}</div>
              <div className="text-slate-400">{info.map_location || t("chromosome_short")}</div>
            </div>
          )}
          <div className="bg-white rounded-lg px-3 py-2 border border-slate-100 shadow-sm">
            <div className="font-bold text-slate-800">{info.protein_length}</div>
            <div className="text-slate-400">aa</div>
          </div>
          <div className="bg-white rounded-lg px-3 py-2 border border-slate-100 shadow-sm">
            <div className="font-bold text-slate-800">{info.exon_count}</div>
            <div className="text-slate-400">{t("viz_exon")}</div>
          </div>
        </div>
      </div>

      {info.summary && info.summary !== "暂无功能摘要" && (
        <div className="mb-3">
          <p className="text-sm text-slate-600 leading-relaxed">
            {expanded ? info.summary : summaryShort}
          </p>
          {info.summary.length > 200 && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-indigo-500 hover:text-indigo-700 mt-1">
              {expanded ? t("collapse_summary") : t("expand_summary")}
            </button>
          )}
        </div>
      )}

      {info.aliases && (
        <div className="mb-3 text-xs text-slate-500">
          <span className="font-medium text-slate-600">{t("aliases_label")}</span>{info.aliases}
        </div>
      )}

      <div className="border-t border-indigo-100 my-3" />

      <div className="bg-white rounded-lg p-3 border border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("selected_transcript_used")}</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-medium">{info.transcript_id}</span>
        </div>
        {info.transcript_description && (
          <p className="text-xs text-slate-500 mb-2">{info.transcript_description}</p>
        )}
        <div className="grid grid-cols-3 gap-3 mb-2 text-xs">
          <div><span className="text-slate-400">{t("cds_length_label")}：</span><span className="font-medium text-slate-700">{info.cds_length} bp</span></div>
          <div><span className="text-slate-400">{t("protein_length_label")}：</span><span className="font-medium text-slate-700">{info.protein_length} aa</span></div>
          <div><span className="text-slate-400">{t("exon_count_label")}：</span><span className="font-medium text-slate-700">{info.exon_count}</span></div>
        </div>
        <div className="flex items-start gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          <span className="shrink-0 font-bold">✓ {t("selection_basis")}</span>
          <span>{info.selection_reason}（{t("total_nm_text", { n: info.total_nm_found })}）</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
        <span>📦 {t("data_source_text")}</span>
        <span className="font-medium">NCBI Gene</span>
        <span>·</span>
        <span className="font-medium">NCBI RefSeq</span>
        <span>{t("data_realtime_note")}</span>
      </div>
    </div>
  );
}

function TranscriptViz({ seqLen, cdsStart, cdsEnd, exons, pairs }: {
  seqLen: number; cdsStart: number; cdsEnd: number; exons: ExonViz[]; pairs: ValidatedPrimerPair[];
}) {
  const t = useTranslations("primer");
  const W = 620;
  const s = (p: number) => (p / seqLen) * W;
  return (
    <div className="overflow-x-auto mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
      <svg width={W} height={110} className="block">
        <rect x={0} y={30} width={W} height={12} rx={3} fill="#e2e8f0" />
        <rect x={s(cdsStart)} y={26} width={s(cdsEnd - cdsStart)} height={20} rx={3} fill="rgba(99,102,241,0.15)" />
        {exons.map((e) => (
          <g key={e.index}>
            <rect x={s(e.start)} y={22} width={Math.max(3, s(e.end - e.start))} height={28} rx={2} fill="#6366f1" opacity={0.9} />
            {s(e.end - e.start) > 20 && (
              <text x={s(e.start) + s(e.end - e.start) / 2} y={39} textAnchor="middle" fontSize="8" fill="white" fontWeight="600">E{e.index + 1}</text>
            )}
          </g>
        ))}
        {pairs.map((p, i) => {
          const y = 62 + i * 13;
          const color = p.is_specific ? "#059669" : "#d97706";
          const lx = s(exons[Math.min(p.exon_span.left_exon ?? 0, exons.length - 1)]?.start ?? 0);
          const rx = s(exons[Math.min(p.exon_span.right_exon ?? exons.length - 1, exons.length - 1)]?.end ?? seqLen);
          return (
            <g key={p.rank}>
              <line x1={lx} y1={y + 4} x2={rx} y2={y + 4} stroke={color} strokeWidth={1.5}
                strokeDasharray={p.exon_span.spans_junction ? "none" : "4 2"} opacity={0.8} />
              <polygon points={`${lx},${y+1} ${lx+7},${y+4} ${lx},${y+7}`} fill={color} />
              <polygon points={`${rx},${y+1} ${rx-7},${y+4} ${rx},${y+7}`} fill={color} />
              <text x={lx + 2} y={y + 2} fontSize="7" fill={color} fontWeight="600">F{p.rank}</text>
            </g>
          );
        })}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={f} x={f * W} y={108} fontSize="8" fill="#94a3b8" textAnchor="middle">{Math.round(f * seqLen)}</text>
        ))}
      </svg>
      <div className="flex gap-5 mt-2 text-xs text-slate-400">
        <span><span className="inline-block w-2.5 h-2.5 bg-indigo-500 rounded mr-1" />{t("viz_exon")}</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-indigo-100 rounded mr-1" />{t("viz_cds")}</span>
        <span className="text-emerald-600">{t("viz_specific")}</span>
        <span className="text-amber-600">{t("viz_offtarget")}</span>
      </div>
    </div>
  );
}

function exportCSV(pairs: ValidatedPrimerPair[], geneName?: string) {
  const header = ["Rank","Score","Forward","Reverse","F-Tm","R-Tm","F-GC%","R-GC%","Amplicon(bp)","RefSeqRNA_BLAST_Pass","ExonSpan","Introns","F-HairpinTm","F-SelfEnd","F-GCclamp","R-HairpinTm","R-SelfEnd","R-GCclamp","F-Identity%","F-Offtarget","R-Identity%","R-Offtarget"].join(",");
  const rows = pairs.map(p => [p.rank,p.score.total,p.left_primer,p.right_primer,p.left_tm,p.right_tm,p.left_gc,p.right_gc,p.product_size,p.is_specific?"Yes":"No",p.exon_span.spans_junction?"Yes":"No",p.exon_span.junction_count,p.left_props?.hairpin_th??"",p.left_props?.self_end_th??"",p.left_props?.gc_clamp??"",p.right_props?.hairpin_th??"",p.right_props?.self_end_th??"",p.right_props?.gc_clamp??"",p.blast_left.top_hit_identity,p.blast_left.off_target_count,p.blast_right.top_hit_identity,p.blast_right.off_target_count].join(","));
  const csv = [header,...rows].join("\n");
  const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`PrimerCat_${geneName||"primers"}_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
}

function exportHTMLReport(result: PrimerResult) {
  const now = new Date().toLocaleString();
  const pairsHtml = result.primer_pairs.map(p => {
    const tmDiff = Math.abs(p.left_tm - p.right_tm);
    const checks: [string,boolean][] = [["Tm 58-62C",p.left_tm>=58&&p.left_tm<=62&&p.right_tm>=58&&p.right_tm<=62],["Tm diff<2C",tmDiff<2],["GC 40-60%",p.left_gc>=40&&p.left_gc<=60&&p.right_gc>=40&&p.right_gc<=60],["GC clamp>=1",(p.left_props?.gc_clamp??0)>=1&&(p.right_props?.gc_clamp??0)>=1],["Hairpin<24C",(p.left_props?.hairpin_th??0)<24&&(p.right_props?.hairpin_th??0)<24],["RefSeq RNA BLAST pass",p.is_specific],["Exon-spanning",p.exon_span.spans_junction]];
    const passN = checks.filter(c=>c[1]).length;
    return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px"><h3>Primer Pair #${p.rank} — Score ${p.score.total} — ${passN}/${checks.length} passed — ${p.product_size} bp</h3><p>F: <code>${p.left_primer}</code> Tm ${p.left_tm}°C GC ${p.left_gc}%</p><p>R: <code>${p.right_primer}</code> Tm ${p.right_tm}°C GC ${p.right_gc}%</p><div>${checks.map(([l,ok])=>`<span style="margin:2px;padding:2px 8px;border-radius:12px;font-size:12px;background:${ok?"#d1fae5":"#fee2e2"};color:${ok?"#065f46":"#991b1b"}">${ok?"✓":"✗"} ${l}</span>`).join("")}</div></div>`;
  }).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PrimerCat Report</title></head><body style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:32px"><h1>PrimerCat Report</h1><p>${result.gene_name?`Gene: ${result.gene_name} · `:""}${result.sequence_length} bp · ${now}</p>${pairsHtml}<p style="color:#94a3b8;font-size:12px">Generated by PrimerCat · ${now}</p></body></html>`;
  const blob = new Blob([html],{type:"text/html;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`PrimerCat_${result.gene_name||"report"}_${new Date().toISOString().slice(0,10)}.html`; a.click(); URL.revokeObjectURL(url);
}

export default function PrimerPage() {
  const t = useTranslations("primer");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"sequence" | "gene">("gene");
  const [sequence, setSequence] = useState("");
  const [geneName, setGeneName] = useState("");
  const [species, setSpecies] = useState<"human" | "mouse">("human");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ step: number; total: number; msg: string }[]>([]);
  const [result, setResult] = useState<PrimerResult | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"checklist" | "blast" | "props" | "amplicon">("checklist");
  const [showHelp, setShowHelp] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!showHelp) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowHelp(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showHelp]);

  function getProgressLabel(step: number) {
    switch (step) {
      case 1:
        return t("progress_fetch");
      case 2:
        return t("progress_design");
      case 3:
        return t("progress_validate");
      case 4:
        return t("progress_rank");
      default:
        return t("progress_live");
    }
  }

  function extractServerMessage(raw: string) {
    const value = raw.trim();
    if (!value) return "";

    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "string") return parsed;
      if (typeof parsed?.detail === "string") return parsed.detail;
      if (Array.isArray(parsed?.detail) && parsed.detail.length > 0) {
        const first = parsed.detail[0];
        if (typeof first === "string") return first;
        if (typeof first?.msg === "string") return first.msg;
      }
    } catch {}

    return value;
  }

  function mapPrimerError(raw: string) {
    const message = extractServerMessage(raw);
    const normalized = message.toLowerCase();

    if (!message) return tCommon("request_failed");
    if (normalized.includes("failed to fetch") || normalized.includes("networkerror")) {
      return tCommon("network_error");
    }
    if (
      normalized.includes("response body") ||
      normalized.includes("readable stream") ||
      normalized.includes("stream")
    ) {
      return t("stream_unavailable");
    }
    if (normalized.includes("ncbi") || normalized.includes("blast")) {
      return `${tCommon("service_unavailable")} ${tCommon("retry_later")}`;
    }
    return message;
  }

  function pushProgress(entry: { step: number; total: number; msg: string }) {
    setProgress((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.step === entry.step && last.msg === entry.msg) return prev;
      return [...prev, entry];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ── 提交前输入校验 ──
    if (mode === "gene") {
      const trimmed = geneName.trim();
      if (!trimmed) { setError(t("validate_gene_empty")); return; }
      if (!/^[\w\-]+$/.test(trimmed)) { setError(t("validate_gene_format")); return; }
    } else {
      const trimmed = sequence.trim();
      if (!trimmed) { setError(t("validate_seq_empty")); return; }
      if (trimmed.length < 100) { setError(t("validate_seq_short")); return; }
      if (/[^ATGCNatgcn\s]/.test(trimmed)) { setError(t("validate_seq_invalid")); return; }
    }

    setLoading(true); setError(""); setNotice(""); setResult(null); setProgress([]); setExpandedRow(null);
    abortRef.current = new AbortController();

    // 3 分钟全局超时
    const timeoutId = setTimeout(() => abortRef.current?.abort("timeout"), 3 * 60 * 1000);

    const body = mode === "gene" ? { mode: "gene", gene_name: geneName, species } : { mode: "sequence", sequence, species };
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("primercat_token") : null;
      const res = await fetch(`${API}/gene-primer/design`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body), signal: abortRef.current.signal });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      if (!res.body) {
        throw new Error(t("stream_unavailable"));
      }

      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = "";
      let gotResult = false;
      let gotError = false;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split("\n\n"); buf = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const ev = chunk.match(/^event: (\w+)/m)?.[1]; const raw = chunk.match(/^data: (.+)/m)?.[1];
          if (!ev || !raw) continue; const data = JSON.parse(raw);
          if (ev === "progress") pushProgress(data);
          else if (ev === "result") {
            gotResult = true;
            setResult(data);
            pushProgress({ step: 4, total: 4, msg: data.message || t("progress_rank") });
            if (user && data.success) toast("已保存到历史记录");
          }
          else if (ev === "error") {
            gotError = true;
            setError(mapPrimerError(String(data.msg ?? "")));
            break;
          }
        }
        if (gotError) break;
      }
      if (!gotResult && !gotError && !abortRef.current?.signal.aborted) {
        setError(t("stream_incomplete"));
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        if (abortRef.current?.signal.reason === "timeout") {
          setError(t("timeout_error"));
        } else {
          setNotice(t("stopped_notice"));
          setProgress((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            return [...prev, { step: last.step, total: last.total, msg: t("stopped_notice") }];
          });
        }
      } else {
        setError(mapPrimerError(err.message || ""));
      }
    }
    finally {
      clearTimeout(timeoutId);
      setLoading(false);
      abortRef.current = null;
    }
  }

  const lastStep = progress[progress.length - 1];
  const blastWarningCount = result
    ? result.primer_pairs.filter((pair) => {
        const leftStatus = pair.blast_left.status ?? "validated";
        const rightStatus = pair.blast_right.status ?? "validated";
        return leftStatus !== "validated" || rightStatus !== "validated";
      }).length
    : 0;
  const validatedPrimerCount = result
    ? result.primer_pairs.filter((pair) => {
        const leftStatus = pair.blast_left.status ?? "validated";
        const rightStatus = pair.blast_right.status ?? "validated";
        return leftStatus === "validated" && rightStatus === "validated" && pair.is_specific;
      }).length
    : 0;
  const exonPreferredCount = result ? result.primer_pairs.filter((pair) => pair.exon_span.spans_junction).length : 0;
  const topScore = result ? Math.max(...result.primer_pairs.map((pair) => pair.score.total), 0) : 0;
  const specificityScopeLabel =
    result?.design_basis?.specificity_scope === "refseq_rna_transcripts"
      ? t("basis_scope_refseq_rna")
      : result?.design_basis?.specificity_scope ?? t("basis_not_applicable");
  const resultHeadline = result?.gene_name ?? result?.transcript_id ?? t("result_title");
  const resultMeta = result
    ? result.transcript_id
      ? `${result.transcript_id} · ${result.sequence_length} bp · ${result.exons.length} ${t("viz_exon")} · ${result.message}`
      : `${result.sequence_length} bp · ${result.message}`
    : "";
  const featureHighlights = [t("feat_transcript"), t("feat_exon_design"), t("feat_blast_verify"), t("feat_score_range")];

  return (
    <div className="page-sidebar-layout primer-page-shell" style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
      <aside className="page-sidebar primer-control-panel" style={{ width: 320, flexShrink: 0, position: "sticky", top: 72, background: "#ffffff", borderRadius: "var(--r-lg)", padding: 20, border: "1px solid var(--border)", borderLeft: "3px solid var(--primer-color)", boxShadow: "var(--shadow-xs)" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
            <div>
              <div className="primer-panel-kicker">PrimerCat qPCR</div>
              <h1 className="primer-page-headline">{t("title")}</h1>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              aria-label={t("how_it_works")}
              aria-haspopup="dialog"
              aria-expanded={showHelp}
              title={t("how_it_works")}
              className="primer-help-trigger"
            >
              ?
            </button>
          </div>
          <p className="primer-panel-subtitle">{t("subtitle")}</p>
          <div className="primer-panel-chips">
            {["Primer3", "NCBI RefSeq", "RefSeq RNA BLAST"].map((item) => (
              <span key={item} className="primer-panel-chip">{item}</span>
            ))}
          </div>
        </div>
        <div className="tab-bar primer-tab-shell mb-5" style={{ width: "100%" }}>
          {(["gene", "sequence"] as const).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`px-4 py-2 rounded-lg text-sm font-medium transition flex-1 ${mode === m ? "tab-active" : "tab-inactive"}`}>
              {m === "gene" ? t("mode_gene") : t("mode_sequence")}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "gene" ? (
              <>
                <div>
                  <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>{t("gene_label")}</label>
                  <input className="input-field" style={{ width: "100%", padding: "10px 14px" }} placeholder={t("gene_placeholder")} value={geneName} onChange={e => setGeneName(e.target.value)} required />
                </div>
                <div>
                  <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>{t("species_label")}</label>
                  <div className="primer-species-grid">
                    {(["human", "mouse"] as const).map(s => (
                      <label key={s} className="primer-choice-tile" data-selected={species === s ? "true" : "false"}>
                        <input type="radio" name="species" value={s} checked={species === s} onChange={() => setSpecies(s)} style={{ display: "none" }} />
                        {s === "human" ? "🧑 " + t("human_short") : "🐭 " + t("mouse_short")}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>{t("seq_label")}</label>
                  <textarea className="input-field" style={{ width: "100%", padding: "10px 14px", height: 120, resize: "none", fontFamily: "monospace", fontSize: 13 }} placeholder={t("seq_placeholder")} value={sequence} onChange={e => setSequence(e.target.value.replace(/\s/g, ""))} required />
                  {sequence && <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>{sequence.length} bp</p>}
                </div>
                <div>
                  <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>{t("species_label")}</label>
                  <div className="primer-species-grid">
                    {(["human", "mouse"] as const).map(s => (
                      <label key={s} className="primer-choice-tile" data-selected={species === s ? "true" : "false"}>
                        <input type="radio" name="species" value={s} checked={species === s} onChange={() => setSpecies(s)} style={{ display: "none" }} />
                        {s === "human" ? "🧑 " + t("human_short") : "🐭 " + t("mouse_short")}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="primer-action-row">
              <button type="submit" disabled={loading} className="btn-primary primer-primary-btn" style={{ flex: 1, padding: "11px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? (<><svg className="animate-spin" style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>{t("designing_btn")}</>) : t("submit_btn")}
              </button>
              {loading && (
                <button type="button" onClick={() => abortRef.current?.abort()} className="primer-stop-btn">
                  {t("stop_btn")}
                </button>
              )}
            </div>
          </form>
        </div>
        {progress.length > 0 && (
          <div className="card primer-progress-card" style={{ padding: 16, marginBottom: 12 }}>
            {lastStep && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>{getProgressLabel(lastStep.step)}</span>
                  <span style={{ fontSize: 12, color: "var(--text-3)", whiteSpace: "nowrap" }}>{lastStep.step}/{lastStep.total}</span>
                </div>
                <div style={{ display: "flex", gap: 3, flex: 1 }}>
                  {Array.from({ length: lastStep.total }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < lastStep.step ? "var(--accent)" : "var(--border-mid)", transition: "background 0.3s" }} className={i === lastStep.step - 1 && loading ? "pulse-bar" : ""} />
                  ))}
                </div>
              </div>
            )}
            <div className="primer-progress-log">
              {progress.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--text-3)", minWidth: 76 }}>[{getProgressLabel(p.step)}]</span>
                  <span>{p.msg}</span>
                </div>
              ))}
              {loading && <div style={{ color: "#d97706" }}>{t("progress_live")}</div>}
            </div>
          </div>
        )}
        {notice && <div className="card primer-alert-card notice">{notice}</div>}
        {error && <div className="card primer-alert-card error">{error}</div>}
      </aside>

      <main className="primer-main-panel" style={{ flex: 1, minWidth: 0 }}>
        {!result && !loading && progress.length === 0 && (
          <div className="empty-state primer-empty-state">
            <div className="primer-workflow-bar">
              {([
                { n: 1, label: t("workflow_step_1"), hint: t("workflow_step_1_hint") },
                { n: 2, label: t("workflow_step_2"), hint: t("workflow_step_2_hint") },
                { n: 3, label: t("workflow_step_3"), hint: t("workflow_step_3_hint") },
              ] as const).map((step, i) => (
                <>
                  <div key={step.n} className="primer-workflow-step">
                    <div className="primer-workflow-num">{step.n}</div>
                    <div>
                      <div className="primer-workflow-label">{step.label}</div>
                      <div className="primer-workflow-hint">{step.hint}</div>
                    </div>
                  </div>
                  {i < 2 && <div key={`sep-${i}`} className="primer-workflow-sep">→</div>}
                </>
              ))}
            </div>
            <div className="primer-feature-grid">
              {[{ icon: "🧬", text: t("feat_transcript") },{ icon: "🔗", text: t("feat_exon_design") },{ icon: "🎯", text: t("feat_blast_verify") },{ icon: "📊", text: t("feat_score_range") }].map(f => (
                <div key={f.text} className="primer-feature-pill"><span className="primer-feature-icon">{f.icon}</span><span className="primer-feature-text">{f.text}</span></div>
              ))}
            </div>
          </div>
        )}
        {result && (
          <div className="primer-results-stack">
            <div className="primer-result-hero">
              <div className="primer-result-hero-top">
                <div>
                  <div className="primer-panel-kicker primer-result-kicker">{t("result_title")}</div>
                  <h2 className="primer-result-headline">{resultHeadline}</h2>
                  <p className="primer-result-meta">{resultMeta}</p>
                </div>
                <div className="primer-result-actions">
                  <button onClick={() => exportCSV(result.primer_pairs, result.gene_name)} className="primer-result-btn">
                    {t("export_csv")}
                  </button>
                  <button onClick={() => exportHTMLReport(result)} className="primer-result-btn ghost">
                    {t("export_report")}
                  </button>
                </div>
              </div>
              <div className="primer-result-stats">
                {[
                  { label: t("basis_pairs_returned"), value: result.primer_pairs.length, body: result.message },
                  { label: t("score_total"), value: topScore, body: t("reason_strengths_title") },
                  { label: t("check_exon"), value: exonPreferredCount, body: t("basis_exon_preference_yes") },
                  { label: t("score_specificity"), value: validatedPrimerCount, body: specificityScopeLabel },
                ].map((item) => (
                  <div key={item.label} className="primer-result-stat">
                    <div className="primer-result-stat-label">{item.label}</div>
                    <div className="primer-result-stat-value">{item.value}</div>
                    <div className="primer-result-stat-body">{item.body}</div>
                  </div>
                ))}
              </div>
              <div className="primer-result-scope">
                <span>{t("basis_specificity_scope")}: {specificityScopeLabel}</span>
                <span>{t("basis_scope_note_body")}</span>
              </div>
            </div>
            {result.gene_info && <GeneInfoCard info={result.gene_info} />}
            <div style={{ display: "none" }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-1)", marginBottom: 2 }}>{t("result_title")}</h2>
                <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                  {result.transcript_id
                    ? `${result.transcript_id} · ${result.sequence_length} bp · ${result.exons.length} ${t("viz_exon")} · ${result.message}`
                    : `${result.sequence_length} bp · ${result.message}`}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => exportCSV(result.primer_pairs, result.gene_name)} className="btn-secondary" style={{ padding: "7px 14px", display: "flex", alignItems: "center", gap: 6 }}>⬇ {t("export_csv")}</button>
                <button onClick={() => exportHTMLReport(result)} className="btn-ghost" style={{ padding: "7px 14px", display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--accent-soft)", background: "var(--accent-soft)" }}>📄 {t("export_report")}</button>
              </div>
            </div>
            {blastWarningCount > 0 && (
              <div className="card primer-alert-card notice" style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>{t("blast_warning_title")}</p>
                <p style={{ fontSize: 12, color: "#a16207", lineHeight: 1.6 }}>{t("blast_warning_body", { count: blastWarningCount })}</p>
              </div>
            )}
            <DesignBasisCard result={result} />
            {result.exons.length > 0 && (
              <div className="card primer-section-card" style={{ padding: 20, marginBottom: 16, overflow: "hidden" }}>
                <p className="label-caps" style={{ marginBottom: 12 }}>{t("transcript_structure")}</p>
                <TranscriptViz seqLen={result.sequence_length} cdsStart={result.cds_start} cdsEnd={result.cds_end} exons={result.exons} pairs={result.primer_pairs} />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {result.primer_pairs.map((p, idx) => (
                <div key={p.rank} className={`card primer-pair-card fade-in-up delay-${Math.min(idx + 1, 5)}`} data-expanded={expandedRow === p.rank ? "true" : "false"} style={{ overflow: "hidden", padding: 0 }}>
                  <div onClick={() => setExpandedRow(expandedRow === p.rank ? null : p.rank)} className="primer-row primer-row-summary" style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", background: expandedRow === p.rank ? "var(--bg-inset)" : "transparent" }}>
                    <ScoreRing score={p.score.total} uid={String(p.rank)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="primer-pair-badges">
                        <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>#{p.rank}</span>
                        {p.is_specific && <span className="badge badge-green">✓ {t("specificity_pass")}</span>}
                        {p.exon_span.spans_junction && <span className="badge badge-blue">{t("check_exon_spans", { n: p.exon_span.junction_count })}</span>}
                        {(() => {
                          const tmDiff = Math.abs(p.left_tm - p.right_tm);
                          const blastLeftStatus = p.blast_left.status ?? "validated";
                          const blastRightStatus = p.blast_right.status ?? "validated";
                          const blastOk = blastLeftStatus === "validated" && blastRightStatus === "validated" && p.is_specific;
                          const passN = [p.left_tm>=58&&p.left_tm<=62&&p.right_tm>=58&&p.right_tm<=62,tmDiff<2,p.left_gc>=40&&p.left_gc<=60&&p.right_gc>=40&&p.right_gc<=60,(p.left_props?.gc_clamp??0)>=1&&(p.right_props?.gc_clamp??0)>=1,(p.left_props?.hairpin_th??0)<24&&(p.right_props?.hairpin_th??0)<24,(p.left_props?.self_end_th??0)<35&&(p.right_props?.self_end_th??0)<35,blastOk,p.exon_span.spans_junction].filter(Boolean).length;
                          return <span className={`badge ${passN===8?"badge-green":passN>=6?"badge-blue":"badge-orange"}`}>✓ {passN}/8</span>;
                        })()}
                      </div>
                      <div className="primer-sequence-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                        <p className="primer-sequence-pill forward" style={{ fontFamily: "monospace", fontSize: 12, color: "#0051a2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>F: {p.left_primer}</p>
                        <p className="primer-sequence-pill reverse" style={{ fontFamily: "monospace", fontSize: 12, color: "#1a7a35", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>R: {p.right_primer}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{p.product_size} bp</p>
                      <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Tm {p.left_tm}° / {p.right_tm}°</p>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 4 }}>{expandedRow === p.rank ? "▲" : "▼"}</span>
                  </div>
                  {expandedRow === p.rank && (
                    <div style={{ borderTop: "1px solid var(--border)" }}>
                      <PrimerRecommendationCard p={p} />
                      <div className="primer-tab-strip" style={{ display: "flex", alignItems: "center", background: "var(--bg-inset)", borderBottom: "1px solid var(--border)" }}>
                        {([{ id: "checklist", label: t("tab_checklist") },{ id: "blast", label: t("tab_blast") },{ id: "props", label: t("tab_props") },{ id: "amplicon", label: t("tab_amplicon") }] as const).map(tab => (
                          <button key={tab.id} type="button" onClick={e => { e.stopPropagation(); setActiveTab(tab.id); }} className={`primer-tab-button${activeTab === tab.id ? " active" : ""}`}>
                            {tab.label}
                          </button>
                        ))}
                        <div className="primer-score-chipbar">
                          {[{ label: "Tm", v: p.score.tm_score },{ label: "GC", v: p.score.gc_score },{ label: t("score_specificity"), v: p.score.specificity_score },{ label: t("score_exon"), v: p.score.exon_score },{ label: t("score_dimer"), v: p.score.dimer_score }].map(s => (
                            <div key={s.label} className="primer-score-chip" style={{ textAlign: "center" }}>
                              <div className="primer-score-chip-value">{s.v}</div>
                              <div className="primer-score-chip-label">{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ padding: "20px 24px" }}>
                        {activeTab === "checklist" && <ValidationChecklist p={p} />}
                        {activeTab === "blast" && <BlastHitsTable left={p.blast_left} right={p.blast_right} />}
                        {activeTab === "props" && <PrimerPropsTable p={p} />}
                        {activeTab === "amplicon" && <AmpliconViewer pair={p} />}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="primer-click-hint">{t("click_hint")}</p>
          </div>
        )}
      </main>

      {showHelp && <PrimerWorkflowModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
