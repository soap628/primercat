"use client";

import { Fragment, memo, useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/navigation";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/lib/useToast";
import type {
  BlastTopHit,
  BlastValidation,
  GenomePairValidation,
  TranscriptomePairValidation,
  ExonSpan,
  PrimerScore,
  PrimerProperties,
  PrimerDesignBasis,
  GeneInfo,
  ValidatedPrimerPair,
  ExonViz,
  GenePrimerResult,
  KnownPrimerCatalogResponse,
  KnownQpcrPrimerRecord,
  KnownPrimerValidationResponse,
} from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const ValidationChecklist = memo(function ValidationChecklist({ p }: { p: ValidatedPrimerPair }) {
  const t = useTranslations("primer");
  const tmDiff = Math.abs(p.left_tm - p.right_tm);
  const blastLeftStatus = p.blast_left.status ?? "validated";
  const blastRightStatus = p.blast_right.status ?? "validated";
  const genomePair = p.genome_pair_validation;
  const transcriptPair = p.transcriptome_pair_validation;
  const specificityState = getSpecificityEvidenceState(p);
  const genomeCompatible = genomePair
    ? genomePair.checked &&
      Boolean(genomePair.target_locus_accession) &&
      !genomePair.hit_limit_reached &&
      genomePair.off_target_amplicon_count === 0 &&
      genomePair.unclassified_amplicon_count === 0 &&
      ((genomePair.target_amplicon_count === 1 && genomePair.paired_amplicon_count === 1) || genomePair.paired_amplicon_count === 0)
    : false;
  const blastDetail = genomePair
    ? genomePair.specific
      ? t("check_genome_pair_specific")
      : transcriptPair && genomeCompatible && genomePair.paired_amplicon_count === 0
        ? t("check_genome_no_contiguous_product")
      : genomePair.status === "truncated"
        ? t("check_genome_pair_truncated")
        : genomePair.status === "target_not_anchored"
          ? t("check_genome_pair_unanchored")
          : genomePair.status === "no_paired_amplicons"
            ? t("check_genome_pair_no_product")
            : t("check_genome_pair_offtarget")
    : p.blast_left.hit_limit_reached || p.blast_right.hit_limit_reached
      ? t("check_blast_limited")
    : blastLeftStatus === "error" || blastRightStatus === "error"
      ? t("check_blast_error")
      : blastLeftStatus === "no_hits" || blastRightStatus === "no_hits"
        ? t("check_blast_unavailable")
        : p.is_specific
          ? t("check_blast_specific")
          : t("check_blast_offtarget");
  const transcriptDetail = transcriptPair
    ? transcriptPair.gene_specific
      ? transcriptPair.isoform_specific
        ? t("check_transcriptome_isoform_specific")
        : t("check_transcriptome_same_gene_isoform")
      : transcriptPair.status === "truncated"
        ? t("check_transcriptome_truncated")
        : ["target_not_found", "no_paired_amplicons", "ambiguous_target"].includes(transcriptPair.status)
          ? t("check_transcriptome_target_missing")
          : t("check_transcriptome_cross_gene")
    : "";
  const gcOk = p.left_gc >= 40 && p.left_gc <= 60 && p.right_gc >= 40 && p.right_gc <= 60;
  const tmOk = p.left_tm >= 58 && p.left_tm <= 62 && p.right_tm >= 58 && p.right_tm <= 62;
  const tmMatchOk = tmDiff < 2;
  const clampOk = (p.left_props?.gc_clamp ?? 0) >= 1 && (p.right_props?.gc_clamp ?? 0) >= 1;
  const hairpinOk = (p.left_props?.hairpin_th ?? 0) < 24 && (p.right_props?.hairpin_th ?? 0) < 24;
  const dimerOk = (p.left_props?.self_end_th ?? 0) < 35 && (p.right_props?.self_end_th ?? 0) < 35;

  type ChecklistState = "pass" | "fail" | "incomplete";
  const stateFor = (pass: boolean): ChecklistState => pass ? "pass" : "fail";
  const specificityChecklistState: ChecklistState = specificityState === "passed"
    ? "pass"
    : specificityState === "incomplete" ? "incomplete" : "fail";
  const transcriptChecklistState: ChecklistState = transcriptPair
    ? !transcriptPair.checked || transcriptPair.hit_limit_reached || ["error", "truncated", "target_not_found", "no_paired_amplicons", "ambiguous_target"].includes(transcriptPair.status)
      ? "incomplete"
      : stateFor(transcriptPair.gene_specific)
    : "incomplete";
  const items: { label: string; state: ChecklistState; detail: string }[] = [
    { label: t("check_tm_range"), state: stateFor(tmOk), detail: `F: ${p.left_tm}°C / R: ${p.right_tm}°C · ${t("tm_conditions_note")}` },
    { label: t("check_tm_diff"), state: stateFor(tmMatchOk), detail: `${t("diff_label")} ${tmDiff.toFixed(1)}°C` },
    { label: t("check_gc"), state: stateFor(gcOk), detail: `F: ${p.left_gc}% / R: ${p.right_gc}%` },
    { label: t("check_clamp"), state: stateFor(clampOk), detail: `F: ${p.left_props?.gc_clamp ?? "—"} / R: ${p.right_props?.gc_clamp ?? "—"}` },
    { label: t("check_hairpin"), state: stateFor(hairpinOk), detail: `F: ${p.left_props?.hairpin_th ?? "—"}°C / R: ${p.right_props?.hairpin_th ?? "—"}°C` },
    { label: t("check_dimer"), state: stateFor(dimerOk), detail: `F: ${p.left_props?.self_end_th ?? "—"}°C / R: ${p.right_props?.self_end_th ?? "—"}°C` },
    { label: genomePair ? t("check_genome_pair") : t("check_blast"), state: specificityChecklistState, detail: blastDetail },
    ...(transcriptPair ? [{ label: t("check_transcriptome_pair"), state: transcriptChecklistState, detail: transcriptDetail }] : []),
    { label: t("check_exon"), state: stateFor(p.exon_span.spans_junction), detail: p.exon_span.spans_junction ? t("check_exon_spans", { n: p.exon_span.junction_count }) : t("check_exon_none") },
  ];

  const passCount = items.filter(i => i.state === "pass").length;
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
      <div className="primer-checklist-list">
        {items.map(item => {
          const isPass = item.state === "pass";
          const isIncomplete = item.state === "incomplete";
          const tone = isPass ? "#10b981" : isIncomplete ? "#d97706" : "#ef4444";
          return (
          <div key={item.label} className={`primer-checklist-item is-${item.state}`}>
            <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, background: tone }}>{isPass ? "✓" : isIncomplete ? "!" : "✗"}</span>
            <span className="primer-checklist-label" style={{ color: isPass ? "var(--text-2)" : tone }}>{item.label}</span>
            <span className="primer-checklist-detail">{item.detail}</span>
          </div>
          );
        })}
      </div>
    </div>
  );
});

const BlastHitsTable = memo(function BlastHitsTable({ left, right, genomePair, transcriptPair }: { left: BlastValidation; right: BlastValidation; genomePair?: GenomePairValidation | null; transcriptPair?: TranscriptomePairValidation | null }) {
  const t = useTranslations("primer");
  return (
    <div>
      {transcriptPair && (
        <div style={{ marginBottom: 20 }}>
          <p className="label-caps" style={{ marginBottom: 8 }}>{t("transcriptome_pair_title")}</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.65, marginBottom: 12 }}>{t("transcriptome_pair_scope_note")}</p>
          <div className="primer-basis-grid" style={{ marginBottom: 12 }}>
            {[
              [t("transcriptome_target"), transcriptPair.target_transcript || "—"],
              [t("transcriptome_target_gene"), transcriptPair.target_gene_name || transcriptPair.target_gene_id || "—"],
              [t("transcriptome_products"), String(transcriptPair.paired_amplicon_count)],
              [t("transcriptome_target_products"), String(transcriptPair.target_transcript_amplicon_count)],
              [t("transcriptome_same_gene_products"), String(transcriptPair.same_gene_isoform_amplicon_count)],
              [t("transcriptome_other_gene_products"), String(transcriptPair.other_gene_amplicon_count)],
              [t("transcriptome_unclassified_products"), String(transcriptPair.unclassified_amplicon_count)],
              [t("transcriptome_isoform_conclusion"), t(transcriptPair.isoform_specific ? "transcriptome_isoform_yes" : "transcriptome_isoform_no")],
            ].map(([label, value]) => (
              <div key={label} className="primer-basis-item">
                <span style={{ color: "var(--text-3)" }}>{label}</span>
                <span style={{ color: "var(--text-1)", fontWeight: 500, textAlign: "right" }}>{value}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: transcriptPair.gene_specific ? "var(--green)" : "var(--orange)", lineHeight: 1.6, marginBottom: 10 }}>
            {transcriptPair.gene_specific
              ? `✓ ${t("check_transcriptome_gene_specific")}`
              : `⚠ ${transcriptPair.status === "truncated" ? t("check_transcriptome_truncated") : transcriptPair.status === "target_not_found" || transcriptPair.status === "no_paired_amplicons" || transcriptPair.status === "ambiguous_target" ? t("check_transcriptome_target_missing") : t("check_transcriptome_cross_gene")}`}
          </p>
          {transcriptPair.top_amplicons.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {transcriptPair.top_amplicons.map((hit) => {
                const classLabel = hit.classification === "target_transcript"
                  ? t("transcript_class_target")
                  : hit.classification === "same_gene_isoform"
                    ? t("transcript_class_same_gene")
                    : hit.classification === "other_gene"
                      ? t("transcript_class_other_gene")
                      : t("transcript_class_unclassified");
                const classTone = hit.classification === "target_transcript"
                  ? "badge-green"
                  : hit.classification === "same_gene_isoform" ? "badge-blue" : "badge-orange";
                return (
                  <div key={`${hit.transcript_accession}:${hit.start}:${hit.end}:${hit.orientation}`} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12, flexWrap: "wrap" }}>
                    <span className={`badge ${classTone}`}>{classLabel}</span>
                    <code style={{ color: "var(--text-2)" }}>{hit.transcript_accession}:{hit.start}-{hit.end}</code>
                    <span style={{ color: "var(--text-3)" }}>{hit.gene_name || hit.gene_id || "—"} · {hit.product_size} bp · MM {hit.left_mismatches}/{hit.right_mismatches}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>{t("transcriptome_no_products")}</p>
          )}
        </div>
      )}
      {genomePair && (
        <div style={{ marginBottom: 20 }}>
          <p className="label-caps" style={{ marginBottom: 8 }}>{t("genome_pair_title")}</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.65, marginBottom: 12 }}>{t("genome_pair_scope_note")}</p>
          <div className="primer-basis-grid" style={{ marginBottom: 12 }}>
            {[
              [t("genome_pair_target_locus"), genomePair.target_locus_accession ? `${genomePair.target_locus_accession}:${genomePair.target_locus_start}-${genomePair.target_locus_end} (${genomePair.target_locus_strand})` : "—"],
              [t("genome_pair_products"), String(genomePair.paired_amplicon_count)],
              [t("genome_pair_target_products"), String(genomePair.target_amplicon_count)],
              [t("genome_pair_offtarget_products"), String(genomePair.off_target_amplicon_count)],
              [t("genome_pair_unclassified_products"), String(genomePair.unclassified_amplicon_count)],
              [t("genome_pair_window"), `${genomePair.min_amplicon_size}–${genomePair.max_amplicon_size} bp`],
              [t("basis_reference_assembly"), genomePair.reference_assembly || "—"],
            ].map(([label, value]) => (
              <div key={label} className="primer-basis-item">
                <span style={{ color: "var(--text-3)" }}>{label}</span>
                <span style={{ color: "var(--text-1)", fontWeight: 500, textAlign: "right" }}>{value}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: genomePair.specific ? "var(--green)" : "var(--orange)", lineHeight: 1.6, marginBottom: 10 }}>
            {genomePair.specific
              ? `✓ ${t("check_genome_pair_specific")}`
              : `⚠ ${genomePair.status === "truncated" ? t("check_genome_pair_truncated") : genomePair.status === "target_not_anchored" ? t("check_genome_pair_unanchored") : genomePair.status === "no_paired_amplicons" ? t("check_genome_pair_no_product") : t("check_genome_pair_offtarget")}`}
          </p>
          {genomePair.top_amplicons.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {genomePair.top_amplicons.map((hit) => (
                <div key={`${hit.accession}:${hit.start}:${hit.end}:${hit.orientation}`} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12 }}>
                  <span className={`badge ${hit.is_target ? "badge-green" : "badge-orange"}`}>{hit.is_target ? t("genome_pair_product_target") : t("genome_pair_product_nontarget")}</span>
                  <code style={{ color: "var(--text-2)" }}>{hit.accession}:{hit.start}-{hit.end}</code>
                  <span style={{ color: "var(--text-3)" }}>{hit.product_size} bp · MM {hit.left_mismatches}/{hit.right_mismatches}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>{t("genome_pair_no_products")}</p>
          )}
        </div>
      )}
      <p className="label-caps" style={{ marginBottom: 12 }}>{genomePair ? t("individual_alignment_title") : t("blast_hits_title")}</p>
      <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.65, marginBottom: 12 }}>
        {genomePair ? t("genome_pair_scope_note") : t("blast_hits_scope_note")}
      </p>
      {[{ label: t("forward"), data: left }, { label: t("reverse"), data: right }].map(({ label, data }) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 6 }}>{label}</p>
          {data.target_accession && (
            <p style={{ fontSize: 11, color: data.target_found ? "var(--green)" : "var(--orange)", lineHeight: 1.5, marginBottom: 6 }}>
              {data.target_found
                ? t("blast_target_found", { accession: data.target_accession })
                : t("blast_target_missing", { accession: data.target_accession })}
              {data.hit_limit_reached ? ` · ${t("blast_hit_limit_warning")}` : ""}
            </p>
          )}
          {data.status === "validated" && !data.target_accession && (
            <p style={{ fontSize: 11, color: "var(--orange)", lineHeight: 1.5, marginBottom: 6 }}>
              {t("blast_target_unspecified")}
              {data.hit_limit_reached ? ` · ${t("blast_hit_limit_warning")}` : ""}
            </p>
          )}
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
                      {hit.is_target && <span style={{ marginLeft: 4, color: "var(--green)", fontWeight: 500 }}>✓ {t("target_hit")}</span>}
                      {hit.is_same_gene && <span style={{ marginLeft: 4, color: "var(--accent)", fontWeight: 500 }}>{t("same_gene_hit")}</span>}
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
      <div className="primer-props-table-wrap">
      <table className="w-full text-xs primer-props-table">
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
      <div className="primer-amplicon-head">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("amplicon_label")} ({amplicon.length} bp)</p>
        <button onClick={copy} className="text-xs text-indigo-500 hover:text-indigo-700 transition">
          {copied ? `✓ ${t("amplicon_copied")}` : t("amplicon_copy")}
        </button>
      </div>
      <div className="bg-slate-50 rounded p-3 font-mono text-xs leading-relaxed break-all border border-slate-200 primer-amplicon-sequence">
        {parts.map((part, i) => (
          <span key={i} className={
            part.type === "left" ? "bg-blue-100 text-blue-700 rounded px-0.5" :
            part.type === "right" ? "bg-emerald-100 text-emerald-700 rounded px-0.5" :
            part.type === "mid" ? "text-slate-600" : "text-slate-400"
          }>{part.text}</span>
        ))}
      </div>
      <div className="flex gap-4 mt-1.5 text-xs text-slate-400 primer-amplicon-legend">
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
      value: basis.specificity_scope === "refseq_rna_transcripts"
        ? t("basis_scope_refseq_rna")
        : basis.paired_amplicon_screen && basis.paired_transcriptome_screen
          ? t("basis_scope_joint_pair")
        : basis.paired_amplicon_screen
          ? t("basis_scope_genome_pair")
          : basis.specificity_scope,
    },
    ...(basis.reference_assembly ? [{ label: t("basis_reference_assembly"), value: basis.reference_assembly }] : []),
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
      <div className="primer-basis-header">
        <div>
          <p className="label-caps" style={{ marginBottom: 4 }}>{t("design_basis_title")}</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>{t("design_basis_intro")}</p>
        </div>
        <div className="primer-basis-services">
          {["Primer3", basis.paired_amplicon_screen ? "Bowtie2" : "BLAST", "NCBI RefSeq"].map(s => (
            <span key={s} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 3, background: "var(--bg-inset)", border: "1px solid var(--border)", color: "var(--text-3)", fontWeight: 600 }}>{s}</span>
          ))}
        </div>
      </div>

      <div className="primer-basis-grid">
        {[
          { title: t("basis_template_block"), items: templateItems },
          { title: t("basis_constraints_block"), items: constraintItems },
          { title: t("basis_specificity_block"), items: specificityItems },
          { title: t("basis_screening_block"), items: screeningItems },
        ].map(({ title, items }) => (
          <div key={title} className="primer-basis-column">
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>{title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {items.map((item: { label: string; value: string }) => (
                <div key={item.label} className="primer-basis-item">
                  <span style={{ color: "var(--text-3)" }}>{item.label}</span>
                  <span style={{ color: "var(--text-1)", fontWeight: 500, textAlign: "right" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="primer-basis-scope-note">
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--orange)", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t(basis.paired_transcriptome_screen ? "basis_joint_note_title" : basis.paired_amplicon_screen ? "basis_genome_note_title" : "basis_scope_note_title")}</span>
        <span style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.65 }}>{t(basis.paired_transcriptome_screen ? "basis_joint_note_body" : basis.paired_amplicon_screen ? "basis_genome_note_body" : "basis_scope_note_body")}</span>
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

type SequenceParameterState = "strong" | "ok" | "review";
type SpecificityEvidenceState = "passed" | "review" | "incomplete";

function getSequenceParameterState(p: ValidatedPrimerPair): SequenceParameterState {
  const tmAverage = (p.left_tm + p.right_tm) / 2;
  const tmDifference = Math.abs(p.left_tm - p.right_tm);
  const gcAverage = (p.left_gc + p.right_gc) / 2;
  const worstSelfEnd = Math.max(p.left_props?.self_end_th ?? 0, p.right_props?.self_end_th ?? 0);
  const worstHairpin = Math.max(p.left_props?.hairpin_th ?? 0, p.right_props?.hairpin_th ?? 0);
  const withinDesignRange =
    p.left_tm >= 58 && p.left_tm <= 62 &&
    p.right_tm >= 58 && p.right_tm <= 62 &&
    tmDifference < 2 &&
    p.left_gc >= 40 && p.left_gc <= 60 &&
    p.right_gc >= 40 && p.right_gc <= 60 &&
    worstSelfEnd < 35 && worstHairpin < 24;

  if (!withinDesignRange) return "review";
  if (tmAverage >= 59 && tmAverage <= 61 && tmDifference < 1 && gcAverage >= 45 && gcAverage <= 55 && worstSelfEnd < 20 && worstHairpin < 10) {
    return "strong";
  }
  return "ok";
}

function getSpecificityEvidenceState(p: ValidatedPrimerPair): SpecificityEvidenceState {
  const transcript = p.transcriptome_pair_validation;
  if (transcript && (
    !transcript.checked || transcript.hit_limit_reached ||
    ["error", "truncated", "target_not_found", "no_paired_amplicons", "ambiguous_target"].includes(transcript.status)
  )) return "incomplete";

  const genome = p.genome_pair_validation;
  if (genome) {
    if (!genome.checked || genome.hit_limit_reached || ["error", "truncated", "target_not_anchored"].includes(genome.status)) return "incomplete";
    if (!transcript && genome.status === "no_paired_amplicons") return "incomplete";
    return p.is_specific ? "passed" : "review";
  }

  const leftStatus = p.blast_left.status ?? "validated";
  const rightStatus = p.blast_right.status ?? "validated";
  if (
    leftStatus !== "validated" || rightStatus !== "validated" ||
    !p.blast_left.target_accession || !p.blast_right.target_accession ||
    !p.blast_left.target_found || !p.blast_right.target_found ||
    p.blast_left.hit_limit_reached || p.blast_right.hit_limit_reached
  ) return "incomplete";
  return p.is_specific ? "passed" : "review";
}

function PrimerRecommendationCard({ p }: { p: ValidatedPrimerPair }) {
  const t = useTranslations("primer");
  const tmDiff = Math.abs(p.left_tm - p.right_tm);
  const tmAvg = (p.left_tm + p.right_tm) / 2;
  const gcAvg = (p.left_gc + p.right_gc) / 2;
  const blastLeftStatus = p.blast_left.status ?? "validated";
  const blastRightStatus = p.blast_right.status ?? "validated";
  const genomePair = p.genome_pair_validation;
  const transcriptPair = p.transcriptome_pair_validation;
  const specificityState = getSpecificityEvidenceState(p);
  const bothBlastValidated = genomePair
    ? genomePair.checked && !genomePair.hit_limit_reached && (!transcriptPair || transcriptPair.checked && !transcriptPair.hit_limit_reached)
    : blastLeftStatus === "validated" && blastRightStatus === "validated" &&
      Boolean(p.blast_left.target_accession && p.blast_right.target_accession) &&
      Boolean(p.blast_left.target_found && p.blast_right.target_found) &&
      !p.blast_left.hit_limit_reached && !p.blast_right.hit_limit_reached;
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
  const specificityTone = specificityState === "passed" ? "strong" : specificityState === "review" ? "watch" : "neutral";
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
      metric: specificityState === "incomplete"
        ? t("reason_specificity_metric_pending")
        : genomePair
        ? transcriptPair
          ? `${genomePair.reference_assembly || "Genome"} · genome target/extra ${genomePair.target_amplicon_count}/${genomePair.off_target_amplicon_count} · RNA target/other-gene ${transcriptPair.target_transcript_amplicon_count}/${transcriptPair.other_gene_amplicon_count}`
          : `${genomePair.reference_assembly || "Genome"} · target ${genomePair.target_amplicon_count} · off-target ${genomePair.off_target_amplicon_count}`
        : bothBlastValidated
          ? `Top hit ${p.blast_left.top_hit_identity}% / ${p.blast_right.top_hit_identity}% · off-target ${offTargetCount}`
          : t("reason_specificity_metric_pending"),
      observation:
        specificityState === "incomplete"
          ? t("reason_specificity_partial")
          : genomePair
          ? specificityState === "passed"
            ? t("reason_genome_specificity_validated")
            : t("reason_genome_specificity_offtarget")
          : bothBlastValidated && specificityState === "passed"
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

  const toneColor = { strong: "var(--green)", ok: "var(--primer-color)", watch: "var(--red)", neutral: "var(--orange)" } as const;
  const toneDot = { strong: "●", ok: "●", watch: "▲", neutral: "!" } as const;

  return (
    <div className="primer-recommendation-card" style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
      {/* Header row */}
      <div className="primer-recommendation-head">
        <div>
          <p className="label-caps" style={{ marginBottom: 4 }}>{t("reason_title")}</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>{t("reason_subtitle", { rank: p.rank })}</p>
          <p style={{ fontSize: 10, color: "var(--text-3)", margin: "3px 0 0" }}>{t("ranking_score_note")}</p>
        </div>
        <div style={{ flexShrink: 0, padding: "4px 10px", borderRadius: 4, background: "var(--bg-inset)", border: "1px solid var(--border)", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("ranking_score")}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.2 }}>{p.score.total}<small style={{ fontSize: 9, fontWeight: 500, color: "var(--text-3)" }}> / 100</small></div>
        </div>
      </div>

      {/* Insights table */}
      <div className="primer-insights-table">
        {insights.map((item, i) => (
          <div key={item.key} className="primer-insight-row" style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
            <div className="primer-insight-label">
              <span style={{ fontSize: 10, color: toneColor[item.tone] }}>{toneDot[item.tone]}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>{item.label}</span>
            </div>
            <div className="primer-insight-score">
              <span style={{ fontSize: 13, fontWeight: 700, color: toneColor[item.tone] }}>{item.score.toFixed(1)}</span>
            </div>
            <div className="primer-insight-body">
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>{item.metric}</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>{item.observation}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Strengths / Cautions */}
      <div className="primer-strength-grid">
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
      <div className="primer-gene-head">
        <div>
          <div className="primer-gene-title-row">
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>{info.gene_symbol}</span>
            {info.full_name && <span style={{ fontSize: 13, color: "var(--text-2)" }}>{info.full_name}</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>{info.organism}</div>
        </div>
        <div className="primer-gene-stats">
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
        <div className="primer-transcript-row">
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("selected_transcript_used")}</span>
          <span style={{ fontSize: 11, background: "rgba(99,102,241,0.1)", color: "#4338ca", padding: "1px 7px", borderRadius: 4, fontFamily: "monospace", fontWeight: 600 }}>{info.transcript_id}</span>
        </div>
        {info.transcript_description && (
          <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>{info.transcript_description}</p>
        )}
        <div className="primer-transcript-stats">
          <div><span style={{ color: "var(--text-3)" }}>{t("cds_length_label")}：</span><span style={{ fontWeight: 600, color: "var(--text-1)" }}>{info.cds_length} bp</span></div>
          <div><span style={{ color: "var(--text-3)" }}>{t("protein_length_label")}：</span><span style={{ fontWeight: 600, color: "var(--text-1)" }}>{info.protein_length} aa</span></div>
          <div><span style={{ color: "var(--text-3)" }}>{t("exon_count_label")}：</span><span style={{ fontWeight: 600, color: "var(--text-1)" }}>{info.exon_count}</span></div>
        </div>
        <div className="primer-selection-basis">
          <span style={{ fontWeight: 700, flexShrink: 0 }}>✓ {t("selection_basis")}</span>
          <span>{info.selection_reason}（{t("total_nm_text", { n: info.total_nm_found })}）</span>
        </div>
      </div>

      <div className="primer-data-source">
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
  const header = ["Rank","RankingScore_NotSuccessProbability","Forward_5to3","Reverse_5to3","F-Tm","R-Tm","F-GC%","R-GC%","Amplicon(bp)","Specificity_Pass","Specificity_Engine","Reference_Assembly","Target_Locus","Genome_Paired_Products","Genome_Target_Products","Genome_Offtarget_Products","Genome_Unclassified_Products","Genome_Hit_Limit_Reached","Target_Transcript","Transcript_Gene_Specific","Transcript_Isoform_Specific","Transcript_Paired_Products","Transcript_Target_Products","Transcript_Same_Gene_Isoforms","Transcript_Other_Gene_Products","Transcript_Unclassified_Products","Transcript_Hit_Limit_Reached","ExonSpan","Introns","F-HairpinTm","F-SelfEnd","F-GCclamp","R-HairpinTm","R-SelfEnd","R-GCclamp","F-Identity%","F-Offtarget","R-Identity%","R-Offtarget"].join(",");
  const rows = pairs.map(p => [p.rank,p.score.total,p.left_primer,p.right_primer,p.left_tm,p.right_tm,p.left_gc,p.right_gc,p.product_size,p.is_specific?"Yes":"No",p.transcriptome_pair_validation?"bowtie2_joint_genome_transcriptome":p.genome_pair_validation?.engine??"ncbi_refseq_rna_blast",p.genome_pair_validation?.reference_assembly??"",p.genome_pair_validation?.target_locus_accession?`${p.genome_pair_validation.target_locus_accession}:${p.genome_pair_validation.target_locus_start}-${p.genome_pair_validation.target_locus_end}`:"",p.genome_pair_validation?.paired_amplicon_count??"",p.genome_pair_validation?.target_amplicon_count??"",p.genome_pair_validation?.off_target_amplicon_count??"",p.genome_pair_validation?.unclassified_amplicon_count??"",p.genome_pair_validation?.hit_limit_reached??p.blast_left.hit_limit_reached??false,p.transcriptome_pair_validation?.target_transcript??"",p.transcriptome_pair_validation?.gene_specific??"",p.transcriptome_pair_validation?.isoform_specific??"",p.transcriptome_pair_validation?.paired_amplicon_count??"",p.transcriptome_pair_validation?.target_transcript_amplicon_count??"",p.transcriptome_pair_validation?.same_gene_isoform_amplicon_count??"",p.transcriptome_pair_validation?.other_gene_amplicon_count??"",p.transcriptome_pair_validation?.unclassified_amplicon_count??"",p.transcriptome_pair_validation?.hit_limit_reached??"",p.exon_span.spans_junction?"Yes":"No",p.exon_span.junction_count,p.left_props?.hairpin_th??"",p.left_props?.self_end_th??"",p.left_props?.gc_clamp??"",p.right_props?.hairpin_th??"",p.right_props?.self_end_th??"",p.right_props?.gc_clamp??"",p.blast_left.top_hit_identity,p.blast_left.off_target_count,p.blast_right.top_hit_identity,p.blast_right.off_target_count].join(","));
  const csv = [header,...rows].join("\n");
  const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`PrimerCat_${geneName||"primers"}_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
}

function exportHTMLReport(result: GenePrimerResult) {
  const now = new Date().toLocaleString();
  const pairsHtml = result.primer_pairs.map(p => {
    const tmDiff = Math.abs(p.left_tm - p.right_tm);
    const checks: [string,boolean][] = [["Tm 58-62C",p.left_tm>=58&&p.left_tm<=62&&p.right_tm>=58&&p.right_tm<=62],["Tm diff<2C",tmDiff<2],["GC 40-60%",p.left_gc>=40&&p.left_gc<=60&&p.right_gc>=40&&p.right_gc<=60],["GC clamp>=1",(p.left_props?.gc_clamp??0)>=1&&(p.right_props?.gc_clamp??0)>=1],["Hairpin<24C",(p.left_props?.hairpin_th??0)<24&&(p.right_props?.hairpin_th??0)<24],[p.transcriptome_pair_validation?"Joint genome + transcript screen pass":p.genome_pair_validation?"Paired genome screen pass":"RefSeq RNA screen pass",p.is_specific],["Exon-spanning",p.exon_span.spans_junction]];
    const passN = checks.filter(c=>c[1]).length;
    return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px"><h3>Primer Pair #${p.rank} — Ranking score ${p.score.total}/100 — ${passN}/${checks.length} checks passed — ${p.product_size} bp</h3><p style="color:#64748b;font-size:12px">The ranking score compares candidates from this run; it is not an experimental success probability.</p><p>F (5′→3′): <code>${p.left_primer}</code> Tm ${p.left_tm}°C GC ${p.left_gc}%</p><p>R (5′→3′): <code>${p.right_primer}</code> Tm ${p.right_tm}°C GC ${p.right_gc}%</p><div>${checks.map(([l,ok])=>`<span style="margin:2px;padding:2px 8px;border-radius:12px;font-size:12px;background:${ok?"#d1fae5":"#fee2e2"};color:${ok?"#065f46":"#991b1b"}">${ok?"✓":"✗"} ${l}</span>`).join("")}</div></div>`;
  }).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PrimerCat Report</title></head><body style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:32px"><h1>PrimerCat Report</h1><p>${result.gene_name?`Gene: ${result.gene_name} · `:""}${result.sequence_length} bp · ${now}</p><p style="color:#475569;font-size:13px"><strong>Sequence orientation:</strong> Forward and reverse primers are both reported 5′→3′. The reverse primer is the reverse complement of its binding site and may be ordered exactly as shown.</p>${pairsHtml}<p style="color:#94a3b8;font-size:12px">Generated by PrimerCat · ${now}</p></body></html>`;
  const blob = new Blob([html],{type:"text/html;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`PrimerCat_${result.gene_name||"report"}_${new Date().toISOString().slice(0,10)}.html`; a.click(); URL.revokeObjectURL(url);
}

function SpeciesChoice({
  value,
  checked,
  label,
  onChange,
}: {
  value: "human" | "mouse";
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="primer-choice-tile" data-selected={checked ? "true" : "false"}>
      <input type="radio" name="species" value={value} checked={checked} onChange={onChange} />
      <span className="primer-species-code" aria-hidden="true">{value === "human" ? "Hs" : "Mm"}</span>
      <span className="primer-species-copy"><strong>{label}</strong><small>{value === "human" ? "H. sapiens" : "M. musculus"}</small></span>
      <span className="primer-species-check" aria-hidden="true">✓</span>
    </label>
  );
}

function PrimerEmptyPreview({ locale }: { locale: string }) {
  const isZh = locale === "zh";
  return (
    <div className="primer-output-preview" aria-label={isZh ? "候选引物结果示意" : "Illustrative primer candidate result"}>
      <div className="primer-output-preview-head">
        <div><span>OUTPUT</span><strong>{isZh ? "候选引物" : "Primer candidates"}</strong></div>
        <span className="primer-preview-badge"><i />{isZh ? "等待输入" : "Awaiting input"}</span>
      </div>
      <div className="primer-preview-transcript">
        <div className="primer-preview-coordinates"><span>5′</span><span>{isZh ? "外显子结构" : "Exon structure"}</span><span>3′</span></div>
        <div className="primer-preview-gene" aria-hidden="true"><i /><b /><i /><b /><i /></div>
        <div className="primer-preview-arrows" aria-hidden="true"><span>F&nbsp; 5′→3′</span><span>R&nbsp; 5′→3′</span></div>
      </div>
      <div className="primer-preview-candidate">
        <div><span>{isZh ? "候选 01" : "Candidate 01"}</span><strong>{isZh ? "跨外显子优先" : "Exon-spanning preferred"}</strong></div>
        <dl>
          <div><dt>Tm</dt><dd>— °C</dd></div>
          <div><dt>GC</dt><dd>— %</dd></div>
          <div><dt>{isZh ? "产物" : "Product"}</dt><dd>— bp</dd></div>
          <div><dt>{isZh ? "特异性" : "Specificity"}</dt><dd>{isZh ? "待筛查" : "Pending"}</dd></div>
        </dl>
      </div>
      <p>{isZh ? "输入目标后显示候选序列、质量指标和筛查依据。" : "Enter a target to see candidate sequences, quality metrics, and screening evidence."}</p>
    </div>
  );
}

function KnownPrimerSection({
  gene,
  species,
  records,
  catalog,
  loading,
  checks,
  checking,
  copiedPrimer,
  copyPrimer,
}: {
  gene: string;
  species: "human" | "mouse";
  records: readonly KnownQpcrPrimerRecord[];
  catalog: KnownPrimerCatalogResponse | null;
  loading: boolean;
  checks: Record<string, KnownPrimerValidationResponse>;
  checking: Record<string, boolean>;
  copiedPrimer: string | null;
  copyPrimer: (key: string, value: string) => void;
}) {
  const t = useTranslations("primer");
  const locale = useLocale();
  const searchGene = (catalog?.resolved_gene_symbol || catalog?.query || gene).trim();
  const primerBankSpecies = species === "mouse" ? "Mouse" : "Human";
  const origeneSearchUrl = `https://www.origene.com/catalog/gene-expression/qpcr-primer-pairs?q=${encodeURIComponent(searchGene)}`;
  const catalogDate = catalog?.catalog_updated_at
    ? new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-CA", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(catalog.catalog_updated_at))
    : null;

  return (
    <section id="known-primers" className="known-primer-section" aria-labelledby="known-primer-title">
      <div className="known-primer-heading">
        <div>
          <span>{t("known_section_label")}</span>
          <h2 id="known-primer-title">{t("known_section_title")}</h2>
        </div>
        <strong>{loading ? t("known_loading_short") : t("known_match_count", { count: records.length })}</strong>
      </div>
      <p className="known-primer-intro">{t("known_section_intro")}</p>
      {catalog?.gene_index_available && (
        <details className="known-primer-catalog-scope">
          <summary>
            {t("known_catalog_scope", {
              genes: catalog.catalog_gene_count.toLocaleString(),
              pairs: catalog.catalog_pair_count.toLocaleString(),
              date: catalogDate ?? t("known_not_reported"),
            })}
          </summary>
          <ul>
            {(catalog.source_summaries ?? []).map((source) => (
              <li key={source.source_name}>
                <span>{source.source_name}</span>
                <strong>{t("known_catalog_source_count", { count: source.record_count.toLocaleString() })}</strong>
              </li>
            ))}
          </ul>
          <p>{t("known_catalog_scope_note")}</p>
        </details>
      )}

      {loading ? (
        <p className="known-primer-empty">{t("known_loading")}</p>
      ) : records.length === 0 ? (
        <p className="known-primer-empty">{t("known_empty")}</p>
      ) : (
        <div className="known-primer-list">
          {records.map((record) => {
            const check = checks[record.id];
            const isChecking = checking[record.id];
            const status = isChecking ? "checking" : check?.status ?? "unavailable";
            const evidenceLabel = t(`known_evidence_${record.evidence}`);
            const evidenceNote = t(`known_evidence_${record.evidence}_note`);
            const transcriptMatch = record.transcript_match ?? "not_assessed";
            const transcriptMatchLabel = t(`known_transcript_${transcriptMatch}`);
            const checkLabel = t(`known_check_${status}`);

            return (
              <article key={record.id} className="known-primer-record">
                <header>
                  <div>
                    <div className="known-primer-classification">
                      <span className={`known-primer-evidence is-${record.evidence}`}>
                        {record.evidence_code ? `${record.evidence_code} · ` : ""}{evidenceLabel}
                      </span>
                      <span className={`known-primer-transcript-match is-${transcriptMatch}`}>{transcriptMatchLabel}</span>
                    </div>
                    <h3>{record.source_name} · {record.source_record_id}</h3>
                    <p>{record.gene_symbol} · {record.target_accession}</p>
                  </div>
                  <div className="known-primer-links">
                    <a href={record.source_url} target="_blank" rel="noreferrer">{t("known_open_source")} ↗</a>
                    {record.evidence_url && (
                      <a href={record.evidence_url} target="_blank" rel="noreferrer">{t("known_open_evidence")} ↗</a>
                    )}
                    {record.source_reference && (
                      <a href={record.source_reference} target="_blank" rel="noreferrer">{t("known_open_reference")} ↗</a>
                    )}
                  </div>
                </header>

                <div className="known-primer-sequences">
                  <div>
                    <span>F <small>5′→3′</small></span>
                    <code>{record.forward_primer}</code>
                    <button type="button" onClick={() => copyPrimer(`${record.id}-f`, record.forward_primer)}>
                      {copiedPrimer === `${record.id}-f` ? t("amplicon_copied") : t("amplicon_copy")}
                    </button>
                  </div>
                  <div>
                    <span>R <small>5′→3′</small></span>
                    <code>{record.reverse_primer}</code>
                    <button type="button" onClick={() => copyPrimer(`${record.id}-r`, record.reverse_primer)}>
                      {copiedPrimer === `${record.id}-r` ? t("amplicon_copied") : t("amplicon_copy")}
                    </button>
                  </div>
                </div>

                <dl className="known-primer-metadata">
                  <div><dt>{t("known_source_target")}</dt><dd>{record.target_accession}</dd></div>
                  <div><dt>{t("known_source_transcript_match")}</dt><dd>{transcriptMatchLabel}</dd></div>
                  <div><dt>{t("known_source_amplicon")}</dt><dd>{record.source_amplicon_size_bp ? `${record.source_amplicon_size_bp} bp` : t("known_not_reported")}</dd></div>
                  <div><dt>{t("known_source_tm")}</dt><dd>{record.source_forward_tm_c && record.source_reverse_tm_c ? `${record.source_forward_tm_c} / ${record.source_reverse_tm_c} °C` : t("known_not_reported")}</dd></div>
                </dl>

                <p className="known-primer-source-note"><strong>{evidenceLabel}：</strong>{evidenceNote}</p>
                {transcriptMatch !== "exact_accession" && (
                  <p className={`known-primer-transcript-note is-${transcriptMatch}`}>
                    <strong>{t("known_source_transcript_match")}：</strong>
                    {t(`known_transcript_${transcriptMatch}_note`, {
                      source: record.target_accession,
                      target: catalog?.target_transcript ?? t("known_not_reported"),
                    })}
                  </p>
                )}
                <div className={`known-primer-check is-${status}`}>
                  <span aria-hidden="true">{status === "passed" ? "✓" : status === "checking" ? "…" : "!"}</span>
                  <div>
                    <strong>{t("known_check_title")} · {checkLabel}</strong>
                    <p>
                      {isChecking
                        ? t("known_check_checking_note")
                        : check
                          ? t(`known_check_${check.status}_note`, {
                              assembly: check.reference_assembly ?? t("basis_not_applicable"),
                              transcript: check.target_transcript,
                              product: check.observed_product_size ? `${check.observed_product_size} bp` : t("known_not_observed"),
                            })
                          : t("known_check_unavailable_note", {
                              assembly: t("basis_not_applicable"),
                              transcript: record.target_accession,
                              product: t("known_not_observed"),
                            })}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && searchGene && (
        <div className="known-primer-external-search">
          <div>
            <strong>{t("known_external_title")}</strong>
            <p>{t("known_external_intro", { gene: searchGene })}</p>
          </div>
          <div className="known-primer-external-links">
            <a href={origeneSearchUrl} target="_blank" rel="noreferrer">
              {t("known_search_origene")} ↗
            </a>
            <form action="https://pga.mgh.harvard.edu/cgi-bin/primerbank/new_search2.cgi" method="post" target="_blank">
              <input type="hidden" name="selectBox" value="NCBI Gene Symbol" />
              <input type="hidden" name="species" value={primerBankSpecies} />
              <input type="hidden" name="searchBox" value={searchGene} />
              <input type="hidden" name="Submit" value="Submit" />
              <button type="submit">{t("known_search_primerbank")} ↗</button>
            </form>
            <a href="https://qprimerdb.biodb.org/browse" target="_blank" rel="noreferrer">
              {t("known_search_qprimerdb")} ↗
            </a>
          </div>
          <small>{t("known_external_note")}</small>
        </div>
      )}

      <p className="known-primer-disclaimer">{t("known_disclaimer")}</p>
    </section>
  );
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [progress, setProgress] = useState<{ step: number; total: number; msg: string }[]>([]);
  const [result, setResult] = useState<GenePrimerResult | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"checklist" | "blast" | "props" | "amplicon">("checklist");
  const [copiedPrimer, setCopiedPrimer] = useState<string | null>(null);
  const [knownPrimerRecords, setKnownPrimerRecords] = useState<KnownQpcrPrimerRecord[]>([]);
  const [knownPrimerCatalog, setKnownPrimerCatalog] = useState<KnownPrimerCatalogResponse | null>(null);
  const [knownPrimerLoading, setKnownPrimerLoading] = useState(false);
  const [knownPrimerChecks, setKnownPrimerChecks] = useState<Record<string, KnownPrimerValidationResponse>>({});
  const [knownPrimerChecking, setKnownPrimerChecking] = useState<Record<string, boolean>>({});
  const [showHelp, setShowHelp] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function copyPrimer(key: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedPrimer(key);
    window.setTimeout(() => {
      setCopiedPrimer((current) => current === key ? null : current);
    }, 1600);
  }

  useEffect(() => {
    if (!showHelp) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowHelp(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showHelp]);

  useEffect(() => {
    if (!loading) return;

    const startedAt = Date.now();
    const updateElapsed = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    updateElapsed();
    const timerId = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timerId);
  }, [loading]);

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

  function getProgressMessage(entry: { step: number; msg: string }) {
    if (locale === "zh") {
      if (entry.step === 4) {
        return entry.msg.includes("返回")
          ? entry.msg.replace("本次特异性得分按 0 处理", "本次特异性证据标记为待复核")
          : t("progress_detail_rank");
      }
      return entry.msg;
    }

    if (entry.step === 1) {
      if (entry.msg.includes("转录本：")) return t("progress_detail_transcript");
      if (entry.msg.includes("自定义序列")) return t("progress_detail_custom_sequence");
      return t("progress_detail_fetch");
    }
    if (entry.step === 2) {
      return entry.msg.includes("设计出")
        ? t("progress_detail_candidates_ready")
        : t("progress_detail_design");
    }
    if (entry.step === 3) {
      return entry.msg.includes("超时")
        ? t("progress_detail_screening_timeout")
        : t("progress_detail_screening");
    }
    if (entry.step === 4) {
      return entry.msg.includes("返回")
        ? t("progress_detail_complete")
        : t("progress_detail_rank");
    }
    return t("progress_live");
  }

  function localizeResultMessage(data: GenePrimerResult) {
    if (locale === "zh") return data.message.replace("本次特异性得分按 0 处理", "本次特异性证据标记为待复核");

    const pairs = data.primer_pairs ?? [];
    const incomplete = pairs.some((pair) =>
      pair.transcriptome_pair_validation && (!pair.transcriptome_pair_validation.checked || ["error", "truncated"].includes(pair.transcriptome_pair_validation.status))
        ? true
        : pair.genome_pair_validation
        ? !pair.genome_pair_validation.checked || ["error", "truncated"].includes(pair.genome_pair_validation.status)
        : (pair.blast_left.status ?? "validated") !== "validated" ||
          (pair.blast_right.status ?? "validated") !== "validated"
    );
    const exonCount = pairs.filter((pair) => pair.exon_span.spans_junction).length;
    if (incomplete) {
      return t("result_summary_incomplete", { count: pairs.length, exon: exonCount });
    }
    const specificCount = pairs.filter((pair) => pair.is_specific).length;
    const assembly = data.design_basis?.reference_assembly ?? "versioned reference";
    const screening = data.design_basis?.paired_transcriptome_screen
      ? `${assembly} genome + matched RefSeq RNA paired screen`
      : data.design_basis?.paired_amplicon_screen ? `${assembly} / Bowtie2 pair screen` : "RefSeq RNA BLAST";
    return t("result_summary", {
      count: pairs.length,
      specific: specificCount,
      screening,
      exon: exonCount,
    });
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
    if (normalized === "not found" || normalized === "internal server error" || normalized.includes("http 404") || normalized.includes("http 500")) {
      return `${tCommon("service_unavailable")} ${tCommon("retry_later")}`;
    }
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

  async function runKnownPrimerChecks(data: GenePrimerResult) {
    if (!data.gene_name || !data.transcript_id || (data.species !== "human" && data.species !== "mouse")) return;
    setKnownPrimerLoading(true);
    let records: KnownQpcrPrimerRecord[] = [];
    try {
      const params = new URLSearchParams({
        gene: data.gene_name,
        species: data.species,
        target_transcript: data.transcript_id,
        limit: "5",
      });
      const response = await fetch(`${API}/gene-primer/known?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const catalog = await response.json() as KnownPrimerCatalogResponse;
      records = catalog.records;
      setKnownPrimerCatalog(catalog);
      setKnownPrimerRecords(records);
    } catch {
      setKnownPrimerCatalog(null);
      setKnownPrimerRecords([]);
    } finally {
      setKnownPrimerLoading(false);
    }
    if (!records.length) return;

    setKnownPrimerChecking(Object.fromEntries(records.map((record) => [record.id, true])));
    await Promise.all(records.map(async (record) => {
      try {
        const response = await fetch(`${API}/gene-primer/validate-known`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            forward_primer: record.forward_primer,
            reverse_primer: record.reverse_primer,
            species: record.species,
            target_transcript: data.transcript_id,
          }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const check = await response.json() as KnownPrimerValidationResponse;
        setKnownPrimerChecks((current) => ({ ...current, [record.id]: check }));
      } catch {
        setKnownPrimerChecks((current) => ({
          ...current,
          [record.id]: {
            status: "unavailable",
            scope: "none",
            target_transcript: data.transcript_id as string,
            message: "Reference re-screen unavailable.",
          },
        }));
      } finally {
        setKnownPrimerChecking((current) => ({ ...current, [record.id]: false }));
      }
    }));
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

    setLoading(true); setElapsedSeconds(0); setError(""); setNotice(""); setResult(null); setProgress([]); setExpandedRow(null); setKnownPrimerRecords([]); setKnownPrimerCatalog(null); setKnownPrimerLoading(false); setKnownPrimerChecks({}); setKnownPrimerChecking({});
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
            const localizedData = { ...data, message: localizeResultMessage(data) } as GenePrimerResult;
            setResult(localizedData);
            void runKnownPrimerChecks(localizedData);
            pushProgress({
              step: 4,
              total: 4,
              msg: locale === "zh" ? (data.message || t("progress_rank")) : t("progress_detail_complete"),
            });
            if (user && data.success) toast(t("saved_history"));
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
  const activeProgressStep = Math.min(Math.max(lastStep?.step ?? 1, 1), 4);
  const elapsedTime = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const progressSteps = [t("wait_step1"), t("wait_step2"), t("wait_step3"), t("wait_step4")];
  const blastWarningCount = result
    ? result.primer_pairs.filter((pair) => getSpecificityEvidenceState(pair) === "incomplete").length
    : 0;
  const validatedPrimerCount = result
    ? result.primer_pairs.filter((pair) => getSpecificityEvidenceState(pair) === "passed").length
    : 0;
  const specificityReviewCount = result
    ? result.primer_pairs.filter((pair) => getSpecificityEvidenceState(pair) === "review").length
    : 0;
  const specificityIncompleteCount = result
    ? result.primer_pairs.filter((pair) => getSpecificityEvidenceState(pair) === "incomplete").length
    : 0;
  const parameterQualifiedCount = result
    ? result.primer_pairs.filter((pair) => getSequenceParameterState(pair) !== "review").length
    : 0;
  const exonPreferredCount = result ? result.primer_pairs.filter((pair) => pair.exon_span.spans_junction).length : 0;
  const resultPairCount = result?.primer_pairs.length ?? 0;
  const specificityScopeLabel =
    result?.design_basis?.specificity_scope === "refseq_rna_transcripts"
      ? t("basis_scope_refseq_rna")
      : result?.design_basis?.paired_amplicon_screen && result?.design_basis?.paired_transcriptome_screen
        ? t("basis_scope_joint_pair")
      : result?.design_basis?.paired_amplicon_screen
        ? t("basis_scope_genome_pair")
      : result?.design_basis?.specificity_scope ?? t("basis_not_applicable");
  const resultHeadline = result?.gene_name ?? result?.transcript_id ?? t("result_title");
  const resultMeta = result
    ? result.transcript_id
      ? `${result.transcript_id} · ${result.sequence_length} bp · ${result.exons.length} ${t("viz_exon")} · ${result.message}`
      : `${result.sequence_length} bp · ${result.message}`
    : "";
  return (
    <div className="primer-designer-page design-workspace-v3">
      <section className="design-hero qpcr-design-hero">
        <div>
          <span className="design-kicker">PRIMERCAT · qPCR</span>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
        <aside className="design-hero-meta">
          <span>{locale === "zh" ? "设计引擎" : "DESIGN ENGINE"}</span>
          <strong>Primer3 + RefSeq / {species === "human" ? "GRCh38.p14" : "GRCm39"}</strong>
          <p>{locale === "zh" ? "候选序列、质量参数与筛查依据" : "Sequences, quality metrics, and screening evidence"}</p>
        </aside>
      </section>

    <div className="page-sidebar-layout primer-page-shell" style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
      <aside className="page-sidebar primer-control-panel">
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
            <div>
              <div className="primer-panel-kicker">INPUT · 01</div>
              <h2 className="primer-page-headline">{mode === "gene" ? (locale === "zh" ? "基因名" : "Gene") : (locale === "zh" ? "DNA 序列" : "DNA sequence")}</h2>
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
          <p className="primer-panel-subtitle">{locale === "zh" ? "设置目标与物种，候选结果在右侧生成。" : "Set a target and species. Candidates appear on the right."}</p>
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
                  <div className="primer-field-heading">
                    <label className="label-caps" htmlFor="primer-gene-name">{t("gene_label")}</label>
                    <button type="button" className="primer-example-button" onClick={() => { setGeneName("TP53"); setSpecies("human"); }}>
                      {locale === "zh" ? "载入示例 TP53" : "Load example TP53"}
                    </button>
                  </div>
                  <input id="primer-gene-name" className="input-field" style={{ width: "100%", padding: "10px 14px" }} placeholder={t("gene_placeholder")} value={geneName} onChange={e => setGeneName(e.target.value)} required />
                  <p className="primer-input-helper">{locale === "zh" ? "支持 HGNC / MGI 标准基因符号，例如 TP53、BRCA1。" : "Use an HGNC / MGI gene symbol, such as TP53 or BRCA1."}</p>
                </div>
                <div>
                  <label className="label-caps" style={{ display: "block", marginBottom: 8 }}>{t("species_label")}</label>
                  <div className="primer-species-grid">
                    {(["human", "mouse"] as const).map(s => <SpeciesChoice key={s} value={s} checked={species === s} label={s === "human" ? t("human_short") : t("mouse_short")} onChange={() => setSpecies(s)} />)}
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
                    {(["human", "mouse"] as const).map(s => <SpeciesChoice key={s} value={s} checked={species === s} label={s === "human" ? t("human_short") : t("mouse_short")} onChange={() => setSpecies(s)} />)}
                  </div>
                </div>
              </>
            )}
            <div className="primer-action-row">
              <button type="submit" disabled={loading} className="btn-primary primer-primary-btn" style={{ flex: 1, padding: "11px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? (<><span className="primer-button-progress" aria-hidden="true"><i /></span>{t("designing_btn")}</>) : t("submit_btn")}
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
                  <span>{getProgressMessage(p)}</span>
                </div>
              ))}
              {loading && <div style={{ color: "#d97706" }}>{t("progress_live")}</div>}
            </div>
          </div>
        )}
        {notice && <div className="workbench-alert is-notice" role="status"><span aria-hidden="true">i</span><div><p>{notice}</p></div></div>}
        {error && <div className="workbench-alert is-error" role="alert"><span aria-hidden="true">!</span><div><strong>{tCommon("request_failed")}</strong><p>{error}</p></div></div>}
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
                <Fragment key={step.n}>
                  <div className="primer-workflow-step">
                    <div className="primer-workflow-num">{step.n}</div>
                    <div>
                      <div className="primer-workflow-label">{step.label}</div>
                      <div className="primer-workflow-hint">{step.hint}</div>
                    </div>
                  </div>
                  {i < 2 && <div className="primer-workflow-sep">→</div>}
                </Fragment>
              ))}
            </div>
            <div className="primer-empty-body">
              <PrimerEmptyPreview locale={locale} />
              <div className="primer-feature-grid">
                {[{ marker: "TX", text: t("feat_transcript") },{ marker: "EX", text: t("feat_exon_design") },{ marker: "SP", text: t("feat_blast_verify") },{ marker: "RK", text: t("feat_score_range") }].map(f => (
                  <div key={f.text} className="primer-feature-pill"><span className="primer-feature-icon">{f.marker}</span><span className="primer-feature-text">{f.text}</span></div>
                ))}
              </div>
            </div>
          </div>
        )}
        {loading && (
          <div className="primer-main-loading workbench-loading-state" aria-live="polite" aria-busy="true">
            <div className="workbench-state-head">
              <span>PROCESS · qPCR PIPELINE</span>
              <small>{t("progress_elapsed", { time: elapsedTime })}</small>
            </div>
            <div className="workbench-loading-body">
              <div className="primer-live-progress">
                <span className="primer-live-progress-stage">{t("progress_stage_of", { current: activeProgressStep, total: 4 })}</span>
                <strong>{getProgressLabel(activeProgressStep)}</strong>
                <p>{lastStep ? getProgressMessage(lastStep) : t("progress_detail_fetch")}</p>
                <div
                  className="primer-live-progress-track"
                  role="progressbar"
                  aria-label={t("progress_aria_label")}
                  aria-valuemin={1}
                  aria-valuemax={4}
                  aria-valuenow={activeProgressStep}
                  aria-valuetext={`${getProgressLabel(activeProgressStep)} (${activeProgressStep}/4)`}
                >
                  {progressSteps.map((_, index) => {
                    const step = index + 1;
                    const state = step < activeProgressStep ? "complete" : step === activeProgressStep ? "current" : "pending";
                    return <i key={step} data-state={state}><span /></i>;
                  })}
                </div>
                <div className="primer-live-progress-labels" aria-hidden="true">
                  {progressSteps.map((label, index) => (
                    <span key={label} data-active={index + 1 === activeProgressStep ? "true" : "false"} data-complete={index + 1 < activeProgressStep ? "true" : "false"}>
                      <b>{String(index + 1).padStart(2, "0")}</b>{label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {result && (
          <div className="primer-results-stack">
            {/* ── Result Hero ── */}
            <div className="primer-result-hero">
              <div className="primer-result-hero-top">
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--primer-color)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{t("result_title")}</div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0, lineHeight: 1.2 }}>{resultHeadline}</h2>
                  {result.transcript_id && (
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>{result.transcript_id} · {result.sequence_length} bp · {result.exons.length} {t("viz_exon")}</div>
                  )}
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
              {/* Stat row */}
              <div className="primer-result-stats">
                {[
                  { label: t("result_primary_candidate"), value: resultPairCount > 0 ? "#1" : "—", sub: t("result_primary_candidate_sub") },
                  { label: t("result_parameter_qualified"), value: `${parameterQualifiedCount}/${resultPairCount}`, sub: t("result_parameter_qualified_sub") },
                  { label: t("result_specificity_evidence"), value: `${validatedPrimerCount}/${resultPairCount}`, sub: t("result_specificity_summary", { passed: validatedPrimerCount, review: specificityReviewCount, incomplete: specificityIncompleteCount }) },
                  { label: t("result_exon_spanning"), value: `${exonPreferredCount}/${resultPairCount}`, sub: t("result_exon_spanning_sub") },
                ].map((item) => (
                  <div key={item.label} className="primer-result-stat">
                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)", lineHeight: 1, marginBottom: 3 }}>{item.value}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.4 }}>{item.sub}</div>
                  </div>
                ))}
              </div>
              <div className="primer-result-scope">
                <span style={{ color: "var(--primer-color)", fontWeight: 600 }}>{t("basis_specificity_scope")}:</span>
                <span>{specificityScopeLabel}</span>
                <span style={{ color: "var(--border-mid)" }}>·</span>
                <span>{t(result.design_basis?.paired_transcriptome_screen ? "basis_joint_note_body" : result.design_basis?.paired_amplicon_screen ? "basis_genome_note_body" : "basis_scope_note_body")}</span>
              </div>
            </div>

            {blastWarningCount > 0 && (
              <div className="card primer-alert-card notice" style={{ marginBottom: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>{t("blast_warning_title")}</p>
                <p style={{ fontSize: 12, color: "#a16207", lineHeight: 1.6 }}>{t("blast_warning_body", { count: blastWarningCount })}</p>
              </div>
            )}

            <div className="primer-result-tier-head">
              <div>
                <span>{t("candidate_section_label")}</span>
                <h3>{t("candidate_section_title")}</h3>
                <p>{t("candidate_section_intro")}</p>
              </div>
              <strong>{t("candidate_count", { count: result.primer_pairs.length })}</strong>
            </div>
            <p className="primer-sequence-convention"><strong>{t("sequence_direction_title")}</strong>{t("sequence_direction_note")}</p>

            {/* ── Primer Pair Cards ── */}
            <div className="primer-pair-list">
              {result.primer_pairs.map((p, idx) => {
                const isExpanded = expandedRow === p.rank;
                const parameterState = getSequenceParameterState(p);
                const specificityState = getSpecificityEvidenceState(p);
                return (
                  <div key={p.rank} className={`primer-pair-result fade-in-up delay-${Math.min(idx + 1, 5)}`} data-expanded={isExpanded ? "true" : "false"} data-top={idx === 0 ? "true" : "false"} style={{ borderTop: idx > 0 ? "1px solid var(--border)" : undefined, background: isExpanded ? "var(--bg-card)" : "var(--bg-page)" }}>
                    {/* Summary row */}
                    <div className="primer-pair-summary" onClick={() => setExpandedRow(isExpanded ? null : p.rank)}>
                      {/* Candidate rank — the numerical ranking score stays in expanded details. */}
                      <div className="primer-pair-score" style={{ background: isExpanded ? "var(--bg-inset)" : "var(--bg-card)" }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)", lineHeight: 1 }}>#{p.rank}</div>
                        <div style={{ fontSize: 8, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{t("candidate_rank_short")}</div>
                      </div>
                      {/* Main content */}
                      <div className="primer-pair-main">
                        {/* badges row */}
                        <div className="primer-pair-badges">
                          {idx === 0 && <span className="result-best-label">{t("best_candidate")}</span>}
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", background: "var(--bg-inset)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 6px" }}>{p.product_size} bp</span>
                          <span style={{ fontSize: 11, color: "var(--text-3)" }}>Tm {p.left_tm}° / {p.right_tm}°</span>
                          <span style={{ fontSize: 11, color: "var(--text-3)" }}>GC {p.left_gc}% / {p.right_gc}%</span>
                          <span className={`primer-status-chip is-${parameterState}`}>{t("sequence_parameters")}: {t(`sequence_parameters_${parameterState}`)}</span>
                          <span className={`primer-status-chip is-${specificityState}`}>{t(`specificity_status_${specificityState}`)}</span>
                          <span className={`primer-status-chip ${p.exon_span.spans_junction ? "is-strong" : "is-neutral"}`}>{p.exon_span.spans_junction ? t("check_exon_spans", { n: p.exon_span.junction_count }) : t("check_exon_none")}</span>
                        </div>
                        {/* Sequences */}
                        <div className="primer-pair-sequences">
                          <div className="primer-sequence-row forward">
                            <span className="primer-sequence-label"><b>F</b><small>5′→3′</small></span>
                            <code className="primer-sequence-code">{p.left_primer}</code>
                            <button type="button" aria-label={`${t("amplicon_copy")} ${t("forward")}`} onClick={(e) => { e.stopPropagation(); copyPrimer(`${p.rank}-f`, p.left_primer); }} className="primer-sequence-copy">
                              {copiedPrimer === `${p.rank}-f` ? `✓ ${t("amplicon_copied")}` : t("amplicon_copy")}
                            </button>
                          </div>
                          <div className="primer-sequence-row reverse">
                            <span className="primer-sequence-label"><b>R</b><small>5′→3′</small></span>
                            <code className="primer-sequence-code">{p.right_primer}</code>
                            <button type="button" aria-label={`${t("amplicon_copy")} ${t("reverse")}`} onClick={(e) => { e.stopPropagation(); copyPrimer(`${p.rank}-r`, p.right_primer); }} className="primer-sequence-copy">
                              {copiedPrimer === `${p.rank}-r` ? `✓ ${t("amplicon_copied")}` : t("amplicon_copy")}
                            </button>
                          </div>
                        </div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); copyPrimer(`${p.rank}-both`, `F (5′→3′): ${p.left_primer}\nR (5′→3′): ${p.right_primer}`); }} className="primer-copy-pair">
                          {copiedPrimer === `${p.rank}-both` ? `✓ ${t("amplicon_copied")}` : t("copy_pair")}
                        </button>
                      </div>
                      <button
                        type="button"
                        className="primer-expand-button"
                        aria-label={locale === "zh" ? `${isExpanded ? "收起" : "展开"}第 ${p.rank} 对引物详情` : `${isExpanded ? "Collapse" : "Expand"} primer pair ${p.rank}`}
                        aria-expanded={isExpanded}
                        onClick={(e) => { e.stopPropagation(); setExpandedRow(isExpanded ? null : p.rank); }}
                      >
                        {isExpanded ? "▲" : "▼"}
                      </button>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="primer-pair-expanded">
                        <PrimerRecommendationCard p={p} />
                        {/* Tab strip */}
                        <div className="primer-tab-strip">
                          <div className="primer-tab-buttons">
                            {([{ id: "checklist", label: t("tab_checklist") },{ id: "blast", label: p.genome_pair_validation ? t("tab_genome") : t("tab_blast") },{ id: "props", label: t("tab_props") },{ id: "amplicon", label: t("tab_amplicon") }] as const).map(tab => (
                              <button key={tab.id} type="button" onClick={e => { e.stopPropagation(); setActiveTab(tab.id); }} className={`primer-tab-button${activeTab === tab.id ? " active" : ""}`}>
                                {tab.label}
                              </button>
                            ))}
                          </div>
                          <div className="primer-tab-scores">
                            {[{ label: "Tm", v: p.score.tm_score },{ label: "GC", v: p.score.gc_score },{ label: t("score_specificity"), v: p.score.specificity_score },{ label: t("score_exon"), v: p.score.exon_score },{ label: t("score_dimer"), v: p.score.dimer_score }].map(s => (
                              <div key={s.label} className="primer-tab-score">
                                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)", lineHeight: 1 }}>{s.v}</div>
                                <div style={{ fontSize: 9, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="primer-tab-content">
                          {activeTab === "checklist" && <ValidationChecklist p={p} />}
                          {activeTab === "blast" && <BlastHitsTable left={p.blast_left} right={p.blast_right} genomePair={p.genome_pair_validation} transcriptPair={p.transcriptome_pair_validation} />}
                          {activeTab === "props" && <PrimerPropsTable p={p} />}
                          {activeTab === "amplicon" && <AmpliconViewer pair={p} />}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <KnownPrimerSection
              gene={result.gene_name ?? ""}
              species={result.species === "mouse" ? "mouse" : "human"}
              records={knownPrimerRecords}
              catalog={knownPrimerCatalog}
              loading={knownPrimerLoading}
              checks={knownPrimerChecks}
              checking={knownPrimerChecking}
              copiedPrimer={copiedPrimer}
              copyPrimer={copyPrimer}
            />

            <details className="primer-evidence-disclosure">
              <summary>
                <span className="primer-evidence-index">03</span>
                <span className="primer-evidence-summary-copy">
                  <small>{t("evidence_section_label")}</small>
                  <strong>{t("evidence_section_title")}</strong>
                  <span>{t("evidence_section_intro")}</span>
                </span>
                <span className="primer-evidence-toggle" aria-hidden="true" />
              </summary>
              <div className="primer-evidence-content">
                {result.gene_info && <GeneInfoCard info={result.gene_info} />}
                <DesignBasisCard result={result} />
                {result.exons.length > 0 && (
                  <div className="primer-evidence-transcript">
                    <p className="label-caps" style={{ marginBottom: 12 }}>{t("transcript_structure")}</p>
                    <TranscriptViz seqLen={result.sequence_length} cdsStart={result.cds_start} cdsEnd={result.cds_end} exons={result.exons} pairs={result.primer_pairs} />
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
      </main>

      {showHelp && <PrimerWorkflowModal onClose={() => setShowHelp(false)} />}
    </div>

    <section className="tool-seo-notes" aria-labelledby="qpcr-design-notes-title">
      <div className="tool-seo-notes-heading">
        <span>{locale === "zh" ? "qPCR PRIMER DESIGN" : "qPCR PRIMER DESIGN"}</span>
        <h2 id="qpcr-design-notes-title">
          {locale === "zh" ? "qPCR 引物在线设计：输入、输出与证据边界" : "Online qPCR primer design: inputs, outputs, and evidence boundaries"}
        </h2>
        <p>
          {locale === "zh"
            ? "PrimerCat 接收人或小鼠标准基因名，也接受自定义 DNA 序列。所有正向与反向引物均按可直接订购的 5′→3′ 方向展示。"
            : "PrimerCat accepts standard human or mouse gene symbols as well as custom DNA sequences. Forward and reverse primers are always reported 5′→3′, ready for ordering as shown."}
        </p>
      </div>
      <div className="tool-seo-notes-grid">
        <article>
          <h3>{locale === "zh" ? "参考序列" : "Reference sequence"}</h3>
          <p>{locale === "zh" ? "基因模式按公开规则选择 NCBI RefSeq 转录本，并在结果中保留 accession、物种和选择依据。" : "Gene mode selects an NCBI RefSeq transcript using stated rules and retains its accession, species, and selection basis in the result."}</p>
        </article>
        <article>
          <h3>{locale === "zh" ? "候选生成与筛查" : "Generation and screening"}</h3>
          <p>{locale === "zh" ? "Primer3 根据长度、Tm、GC%、扩增子和热力学约束生成候选；可用时，再对固定参考基因组和转录组执行成对扩增筛查。" : "Primer3 generates candidates under length, Tm, GC%, amplicon, and thermodynamic constraints, followed where available by paired screening against fixed genome and transcriptome references."}</p>
        </article>
        <article>
          <h3>{locale === "zh" ? "如何解释结果" : "How to interpret results"}</h3>
          <p>{locale === "zh" ? "候选排序分只用于比较本次返回的引物对，不是实验成功率。正式实验仍应验证扩增效率、熔解曲线、单一产物与阴性对照。" : "The candidate rank score compares pairs returned in the same run; it is not an experimental success probability. Validate efficiency, melt curves, product identity, and negative controls before use."}</p>
        </article>
      </div>
      <div className="tool-seo-notes-links">
        <Link href="/methods">{locale === "zh" ? "完整计算方法" : "Complete computational methods"}</Link>
        <Link href="/validation">{locale === "zh" ? "可信度与实验验证" : "Confidence and experimental validation"}</Link>
      </div>
    </section>
    </div>
  );
}
