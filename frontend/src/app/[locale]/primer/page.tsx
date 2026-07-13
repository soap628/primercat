"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/lib/useToast";
import type {
  BlastTopHit,
  BlastValidation,
  ExonSpan,
  PrimerScore,
  PrimerProperties,
  PrimerDesignBasis,
  GeneInfo,
  ValidatedPrimerPair,
  ExonViz,
  GenePrimerResult,
} from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const ValidationChecklist = memo(function ValidationChecklist({ p }: { p: ValidatedPrimerPair }) {
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
    { label: t("check_tm_range"), pass: tmOk, detail: `F: ${p.left_tm}°C / R: ${p.right_tm}°C · ${t("tm_conditions_note")}` },
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
        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: countBg.bg, color: countBg.color }}>
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
});

const BlastHitsTable = memo(function BlastHitsTable({ left, right }: { left: BlastValidation; right: BlastValidation }) {
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
});

const PrimerPropsTable = memo(function PrimerPropsTable({ p }: { p: ValidatedPrimerPair }) {
  const t = useTranslations("primer");
  if (!p.left_props || !p.right_props) return null;
  const rows = [
    { label: t("self_any_label"), left: `${p.left_props.self_any_th}°C`, right: `${p.right_props.self_any_th}°C`, threshold: "< 45°C", leftOk: p.left_props.self_any_th < 45, rightOk: p.right_props.self_any_th < 45 },
    { label: t("self_end_label"), left: `${p.left_props.self_end_th}°C`, right: `${p.right_props.self_end_th}°C`, threshold: "< 35°C", leftOk: p.left_props.self_end_th < 35, rightOk: p.right_props.self_end_th < 35 },
    { label: t("hairpin_label"), left: `${p.left_props.hairpin_th}°C`, right: `${p.right_props.hairpin_th}°C`, threshold: "< 24°C", leftOk: p.left_props.hairpin_th < 24, rightOk: p.right_props.hairpin_th < 24 },
    { label: t("gc_clamp_label"), left: `${p.left_props.gc_clamp}`, right: `${p.right_props.gc_clamp}`, threshold: "1–3", leftOk: p.left_props.gc_clamp >= 1 && p.left_props.gc_clamp <= 3, rightOk: p.right_props.gc_clamp >= 1 && p.right_props.gc_clamp <= 3 },
    { label: t("position_label"), left: `${p.left_props.pos}`, right: `${p.right_props.pos}`, threshold: "—", leftOk: true, rightOk: true },
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
});

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
      <div className="bg-slate-50 rounded p-3 font-mono text-xs leading-relaxed break-all border border-slate-200">
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
          <div style={{ padding: 14, borderRadius: 6, background: "var(--tone-blue-bg)", border: "1px solid var(--tone-blue-border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--tone-blue-label)", marginBottom: 6 }}>
              {t("help_data_title")}
            </div>
            <div style={{ fontSize: 13, color: "var(--tone-blue-value)", lineHeight: 1.7 }}>{t("help_data_body")}</div>
          </div>
          <div style={{ padding: 14, borderRadius: 6, background: "var(--tone-green-bg)", border: "1px solid var(--tone-green-border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--tone-green-label)", marginBottom: 6 }}>
              {t("help_output_title")}
            </div>
            <div style={{ fontSize: 13, color: "var(--tone-green-value)", lineHeight: 1.7 }}>{t("help_output_body")}</div>
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

        <div style={{ padding: 18, borderRadius: 6, background: "var(--tone-orange-bg)", border: "1px solid var(--tone-orange-border)", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--tone-orange-label)", marginBottom: 8 }}>
            {t("help_score_title")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            {scoreRules.map((rule) => (
              <div key={rule} style={{ fontSize: 13, color: "var(--tone-orange-value)", lineHeight: 1.6 }}>
                • {rule}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 16, borderRadius: 6, background: "var(--tone-amber-bg)", border: "1px solid var(--tone-amber-border)" }}>
          <div style={{ fontSize: 13, fontWeight: 650, color: "var(--tone-amber-label)", marginBottom: 6 }}>{t("help_note_title")}</div>
          <div style={{ fontSize: 13, color: "var(--tone-amber-value)", lineHeight: 1.75 }}>{t("help_note_body")}</div>
        </div>
      </div>
    </div>
  );
}

function DesignBasisCard({ result }: { result: GenePrimerResult }) {
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
    <div className="card primer-section-card" style={{ padding: "16px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
        <div>
          <p className="label-caps" style={{ marginBottom: 4 }}>{t("design_basis_title")}</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>{t("design_basis_intro")}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {["Primer3", "BLAST", "NCBI"].map(s => (
            <span key={s} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 3, background: "var(--bg-inset)", border: "1px solid var(--border)", color: "var(--text-3)", fontWeight: 600 }}>{s}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
        {[
          { title: t("basis_template_block"), items: templateItems },
          { title: t("basis_constraints_block"), items: constraintItems },
          { title: t("basis_specificity_block"), items: specificityItems },
          { title: t("basis_screening_block"), items: screeningItems },
        ].map(({ title, items }) => (
          <div key={title} style={{ padding: "12px 14px", background: "var(--bg-card)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>{title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {items.map((item: { label: string; value: string }) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                  <span style={{ color: "var(--text-3)" }}>{item.label}</span>
                  <span style={{ color: "var(--text-1)", fontWeight: 500, textAlign: "right" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 4, background: "var(--orange-soft)", border: "1px solid rgba(180,83,9,0.15)", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--orange)", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("basis_scope_note_title")}</span>
        <span style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.65 }}>{t("basis_scope_note_body")}</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {scoringFactors.map((factor) => (
          <span key={factor} style={{ padding: "3px 8px", borderRadius: 3, background: "var(--bg-inset)", border: "1px solid var(--border)", fontSize: 11, color: "var(--text-2)" }}>
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
      metric: `F ${p.left_tm}°C · R ${p.right_tm}°C · Δ${tmDiff.toFixed(1)}°C · ${t("tm_conditions_note")}`,
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

  const toneColor = { strong: "var(--green)", ok: "var(--primer-color)", watch: "var(--orange)" } as const;
  const toneDot = { strong: "●", ok: "●", watch: "▲" } as const;

  return (
    <div className="primer-recommendation-card" style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <p className="label-caps" style={{ marginBottom: 4 }}>{t("reason_title")}</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>{t("reason_subtitle", { rank: p.rank })}</p>
        </div>
        <div style={{ flexShrink: 0, padding: "4px 10px", borderRadius: 4, background: "var(--bg-inset)", border: "1px solid var(--border)", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("score_total")}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.2 }}>{p.score.total}</div>
        </div>
      </div>

      {/* Insights table */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
        {insights.map((item, i) => (
          <div key={item.key} style={{ display: "grid", gridTemplateColumns: "120px 56px 1fr", alignItems: "start", gap: 0, borderTop: i > 0 ? "1px solid var(--border)" : undefined, background: "var(--bg-card)" }}>
            <div style={{ padding: "8px 12px", borderRight: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: toneColor[item.tone] }}>{toneDot[item.tone]}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>{item.label}</span>
            </div>
            <div style={{ padding: "8px 10px", borderRight: "1px solid var(--border)", textAlign: "right" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: toneColor[item.tone] }}>{item.score.toFixed(1)}</span>
            </div>
            <div style={{ padding: "8px 12px" }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>{item.metric}</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>{item.observation}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Strengths / Cautions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ padding: "10px 12px", border: "1px solid var(--border)", borderLeft: "3px solid var(--green)", borderRadius: 4, background: "var(--bg-card)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("reason_strengths_title")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {strengths.map((item) => (
              <div key={item.key} style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>
                <span style={{ fontWeight: 600, color: "var(--text-1)" }}>{item.label}:</span> {item.observation}
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "10px 12px", border: "1px solid var(--border)", borderLeft: `3px solid ${cautions.length > 0 ? "var(--orange)" : "var(--border)"}`, borderRadius: 4, background: "var(--bg-card)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: cautions.length > 0 ? "var(--orange)" : "var(--text-3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("reason_cautions_title")}</div>
          {cautions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {cautions.map((item) => (
                <div key={item.key} style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-1)" }}>{item.label}:</span> {item.observation}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.55 }}>{t("reason_no_cautions")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function GeneInfoCard({ info }: { info: GeneInfo }) {
  const t = useTranslations("primer");
  const [expanded, setExpanded] = useState(false);
  const summaryShort = info.summary.length > 200 ? info.summary.slice(0, 200) + "..." : info.summary;

  return (
    <div className="primer-gene-card" style={{ padding: 16, marginBottom: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>{info.gene_symbol}</span>
            {info.full_name && <span style={{ fontSize: 13, color: "var(--text-2)" }}>{info.full_name}</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>{info.organism}</div>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 12, flexShrink: 0 }}>
          {info.chromosome && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, color: "var(--text-1)" }}>Chr {info.chromosome}</div>
              <div style={{ color: "var(--text-3)" }}>{info.map_location || t("chromosome_short")}</div>
            </div>
          )}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: "var(--text-1)" }}>{info.protein_length}</div>
            <div style={{ color: "var(--text-3)" }}>aa</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: "var(--text-1)" }}>{info.exon_count}</div>
            <div style={{ color: "var(--text-3)" }}>{t("viz_exon")}</div>
          </div>
        </div>
      </div>

      {info.summary && info.summary !== "暂无功能摘要" && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65 }}>
            {expanded ? info.summary : summaryShort}
          </p>
          {info.summary.length > 200 && (
            <button onClick={() => setExpanded(!expanded)} style={{ fontSize: 12, color: "var(--primer-color)", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4 }}>
              {expanded ? t("collapse_summary") : t("expand_summary")}
            </button>
          )}
        </div>
      )}

      {info.aliases && (
        <div style={{ marginBottom: 10, fontSize: 12, color: "var(--text-2)" }}>
          <span style={{ fontWeight: 600 }}>{t("aliases_label")}</span>{info.aliases}
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("selected_transcript_used")}</span>
          <span style={{ fontSize: 11, background: "rgba(99,102,241,0.1)", color: "#4338ca", padding: "1px 7px", borderRadius: 4, fontFamily: "monospace", fontWeight: 600 }}>{info.transcript_id}</span>
        </div>
        {info.transcript_description && (
          <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>{info.transcript_description}</p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8, fontSize: 12 }}>
          <div><span style={{ color: "var(--text-3)" }}>{t("cds_length_label")}：</span><span style={{ fontWeight: 600, color: "var(--text-1)" }}>{info.cds_length} bp</span></div>
          <div><span style={{ color: "var(--text-3)" }}>{t("protein_length_label")}：</span><span style={{ fontWeight: 600, color: "var(--text-1)" }}>{info.protein_length} aa</span></div>
          <div><span style={{ color: "var(--text-3)" }}>{t("exon_count_label")}：</span><span style={{ fontWeight: 600, color: "var(--text-1)" }}>{info.exon_count}</span></div>
        </div>
        <div style={{ fontSize: 12, color: "var(--green)", background: "var(--green-soft)", borderRadius: 4, padding: "6px 10px", display: "flex", gap: 6 }}>
          <span style={{ fontWeight: 700, flexShrink: 0 }}>✓ {t("selection_basis")}</span>
          <span>{info.selection_reason}（{t("total_nm_text", { n: info.total_nm_found })}）</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 11, color: "var(--text-3)" }}>
        <span>{t("data_source_text")}</span>
        <span style={{ fontWeight: 600 }}>NCBI Gene</span>
        <span>·</span>
        <span style={{ fontWeight: 600 }}>NCBI RefSeq</span>
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
    <div className="overflow-x-auto mt-4 p-3 bg-slate-50 rounded border border-slate-200">
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
              <rect x={lx} y={y} width={Math.max(1, rx - lx)} height={8} rx={2}
                fill={color} opacity={0.12} />
              <line x1={lx} y1={y + 4} x2={rx} y2={y + 4} stroke={color} strokeWidth={1.5}
                strokeDasharray={p.exon_span.spans_junction ? "none" : "4 2"} opacity={0.8} />
              <polygon points={`${lx},${y+1} ${lx+7},${y+4} ${lx},${y+7}`} fill={color} />
              <polygon points={`${rx},${y+1} ${rx-7},${y+4} ${rx},${y+7}`} fill={color} />
              <text x={lx + 2} y={y + 2} fontSize="7" fill={color} fontWeight="600">F{p.rank}</text>
              <text x={lx + 2} y={y + 8} fontSize="6" fill={color} opacity={0.75}>{p.product_size}bp</text>
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

function exportHTMLReport(result: GenePrimerResult) {
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
  const locale = useLocale();
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"sequence" | "gene">("gene");
  const [sequence, setSequence] = useState("");
  const [geneName, setGeneName] = useState("");
  const [species, setSpecies] = useState<"human" | "mouse">("human");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ step: number; total: number; msg: string }[]>([]);
  const [result, setResult] = useState<GenePrimerResult | null>(null);
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
      const res = await fetch(`${API}/gene-primer/design`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body), signal: abortRef.current.signal });
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
      <aside className="page-sidebar primer-control-panel">
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
        {/* Wait time explanation — shown while loading */}
        {loading && (
          <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 6, border: "1px solid var(--border)", borderLeft: "3px solid var(--primer-color)", background: "var(--bg-card)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primer-color)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{t("wait_title")}</div>
            <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.65, marginBottom: 10 }}>{t("wait_body")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[t("wait_step1"), t("wait_step2"), t("wait_step3"), t("wait_step4")].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, background: lastStep && i < lastStep.step ? "var(--primer-color)" : "var(--bg-inset)", border: `1px solid ${lastStep && i < lastStep.step ? "var(--primer-color)" : "var(--border-mid)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {lastStep && i < lastStep.step && <span style={{ fontSize: 9, color: "white", fontWeight: 700 }}>✓</span>}
                    {lastStep && i === lastStep.step - 1 && loading && <span style={{ fontSize: 8, color: "white", fontWeight: 700 }}>…</span>}
                  </div>
                  <span style={{ fontSize: 11, color: lastStep && i < lastStep.step ? "var(--text-1)" : "var(--text-3)", fontWeight: lastStep && i === lastStep.step - 1 ? 600 : 400 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
            {/* ── Result Hero ── */}
            <div className="primer-result-hero">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--primer-color)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{t("result_title")}</div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0, lineHeight: 1.2 }}>{resultHeadline}</h2>
                  {result.transcript_id && (
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>{result.transcript_id} · {result.sequence_length} bp · {result.exons.length} {t("viz_exon")}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => exportCSV(result.primer_pairs, result.gene_name)} className="primer-result-btn">
                    {t("export_csv")}
                  </button>
                  <button onClick={() => exportHTMLReport(result)} className="primer-result-btn ghost">
                    {t("export_report")}
                  </button>
                </div>
              </div>
              {/* Stat row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
                {[
                  { label: t("basis_pairs_returned"), value: String(result.primer_pairs.length), sub: result.message },
                  { label: t("score_total") + " (top)", value: String(topScore), sub: t("reason_strengths_title") },
                  { label: t("check_exon"), value: String(exonPreferredCount), sub: t("basis_exon_preference_yes") },
                  { label: t("score_specificity"), value: String(validatedPrimerCount), sub: specificityScopeLabel },
                ].map((item) => (
                  <div key={item.label} style={{ padding: "10px 12px", background: "var(--bg-card)" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)", lineHeight: 1, marginBottom: 3 }}>{item.value}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.4 }}>{item.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: "var(--primer-color)", fontWeight: 600 }}>{t("basis_specificity_scope")}:</span>
                <span>{specificityScopeLabel}</span>
                <span style={{ color: "var(--border-mid)" }}>·</span>
                <span>{t("basis_scope_note_body")}</span>
              </div>
            </div>

            {result.gene_info && <GeneInfoCard info={result.gene_info} />}

            {blastWarningCount > 0 && (
              <div className="card primer-alert-card notice" style={{ marginBottom: 0 }}>
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

            {/* ── Primer Pair Cards ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              {result.primer_pairs.map((p, idx) => {
                const isExpanded = expandedRow === p.rank;
                const tmDiff2 = Math.abs(p.left_tm - p.right_tm);
                const blastLS = p.blast_left.status ?? "validated";
                const blastRS = p.blast_right.status ?? "validated";
                const blastOk2 = blastLS === "validated" && blastRS === "validated" && p.is_specific;
                const passN = [p.left_tm>=58&&p.left_tm<=62&&p.right_tm>=58&&p.right_tm<=62, tmDiff2<2, p.left_gc>=40&&p.left_gc<=60&&p.right_gc>=40&&p.right_gc<=60, (p.left_props?.gc_clamp??0)>=1&&(p.right_props?.gc_clamp??0)>=1, (p.left_props?.hairpin_th??0)<24&&(p.right_props?.hairpin_th??0)<24, (p.left_props?.self_end_th??0)<35&&(p.right_props?.self_end_th??0)<35, blastOk2, p.exon_span.spans_junction].filter(Boolean).length;
                const scoreColor = p.score.total >= 75 ? "var(--green)" : p.score.total >= 50 ? "var(--primer-color)" : "var(--red)";
                return (
                  <div key={p.rank} className={`fade-in-up delay-${Math.min(idx + 1, 5)}`} style={{ borderTop: idx > 0 ? "1px solid var(--border)" : undefined, background: isExpanded ? "var(--bg-card)" : "var(--bg-page)" }}>
                    {/* Summary row */}
                    <div onClick={() => setExpandedRow(isExpanded ? null : p.rank)} style={{ display: "flex", alignItems: "center", gap: 0, cursor: "pointer", userSelect: "none" }}>
                      {/* Score box */}
                      <div style={{ width: 56, flexShrink: 0, padding: "14px 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: "1px solid var(--border)", background: isExpanded ? "var(--bg-inset)" : "var(--bg-card)" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{p.score.total}</div>
                        <div style={{ fontSize: 9, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>score</div>
                      </div>
                      {/* Main content */}
                      <div style={{ flex: 1, minWidth: 0, padding: "12px 14px" }}>
                        {/* badges row */}
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, marginBottom: 7 }}>
                          <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>#{p.rank}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", background: "var(--bg-inset)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 6px" }}>{p.product_size} bp</span>
                          <span style={{ fontSize: 11, color: "var(--text-3)" }}>Tm {p.left_tm}° / {p.right_tm}°</span>
                          <span style={{ fontSize: 11, color: "var(--text-3)" }}>GC {p.left_gc}% / {p.right_gc}%</span>
                          {p.is_specific && <span className="badge badge-green">✓ {t("specificity_pass")}</span>}
                          {p.exon_span.spans_junction && <span className="badge badge-blue">{t("check_exon_spans", { n: p.exon_span.junction_count })}</span>}
                          <span className={`badge ${passN===8?"badge-green":passN>=6?"badge-blue":"badge-orange"}`}>{passN}/8</span>
                        </div>
                        {/* Sequences */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 7 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#0051a2", minWidth: 10 }}>F</span>
                            <code style={{ fontSize: 12, color: "#0051a2", fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.left_primer}</code>
                            <button type="button" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(p.left_primer); }} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#0051a2", cursor: "pointer", flexShrink: 0 }}>copy</button>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#1a7a35", minWidth: 10 }}>R</span>
                            <code style={{ fontSize: 12, color: "#1a7a35", fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.right_primer}</code>
                            <button type="button" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(p.right_primer); }} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#1a7a35", cursor: "pointer", flexShrink: 0 }}>copy</button>
                          </div>
                        </div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`F: ${p.left_primer}\nR: ${p.right_primer}`); }} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, border: "1px solid var(--border-mid)", background: "var(--bg-inset)", color: "var(--text-3)", cursor: "pointer" }}>Copy Both</button>
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0, padding: "0 14px" }}>{isExpanded ? "▲" : "▼"}</span>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid var(--border)" }}>
                        <PrimerRecommendationCard p={p} />
                        {/* Tab strip */}
                        <div style={{ display: "flex", alignItems: "center", background: "var(--bg-inset)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                          {([{ id: "checklist", label: t("tab_checklist") },{ id: "blast", label: t("tab_blast") },{ id: "props", label: t("tab_props") },{ id: "amplicon", label: t("tab_amplicon") }] as const).map(tab => (
                            <button key={tab.id} type="button" onClick={e => { e.stopPropagation(); setActiveTab(tab.id); }} className={`primer-tab-button${activeTab === tab.id ? " active" : ""}`}>
                              {tab.label}
                            </button>
                          ))}
                          <div style={{ flex: 1 }} />
                          <div style={{ display: "flex", gap: 8, padding: "0 14px" }}>
                            {[{ label: "Tm", v: p.score.tm_score },{ label: "GC", v: p.score.gc_score },{ label: t("score_specificity"), v: p.score.specificity_score },{ label: t("score_exon"), v: p.score.exon_score },{ label: t("score_dimer"), v: p.score.dimer_score }].map(s => (
                              <div key={s.label} style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)", lineHeight: 1 }}>{s.v}</div>
                                <div style={{ fontSize: 9, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
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
                );
              })}
            </div>
            <p className="primer-click-hint">{t("click_hint")}</p>
          </div>
        )}
      </main>

      {showHelp && <PrimerWorkflowModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
