"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  designPcr,
  screenPcrSpecificity,
  PCRDesignResponse,
  PCRPairSpecificityResponse,
  PCRPreset,
  PCRPrimerPair,
  PCRSpecificitySpecies,
} from "@/lib/api";


const PRESETS: Record<PCRPreset, {
  productMin: number;
  productMax: number;
  tmMin: number;
  tmOpt: number;
  tmMax: number;
}> = {
  standard: { productMin: 150, productMax: 800, tmMin: 57, tmOpt: 60, tmMax: 63 },
  colony: { productMin: 200, productMax: 1500, tmMin: 57, tmOpt: 60, tmMax: 63 },
  high_fidelity: { productMin: 500, productMax: 3000, tmMin: 60, tmOpt: 62.5, tmMax: 65 },
};

function normalizedSequenceLength(raw: string) {
  return raw
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith(">"))
    .join("")
    .replace(/\s+/g, "")
    .length;
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\ufeff", text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function QualityChip({ pass, children }: { pass: boolean; children: React.ReactNode }) {
  return (
    <span className={`pcr-quality-chip ${pass ? "is-pass" : "is-watch"}`}>
      <span aria-hidden="true">{pass ? "✓" : "!"}</span>
      {children}
    </span>
  );
}

function SequenceRow({
  direction,
  sequence,
  start,
  end,
  tm,
  gc,
  copied,
  onCopy,
}: {
  direction: "F" | "R";
  sequence: string;
  start: number;
  end: number;
  tm: number;
  gc: number;
  copied: boolean;
  onCopy: () => void;
}) {
  const t = useTranslations("pcr");
  return (
    <div className="pcr-sequence-row">
      <div className={`pcr-direction pcr-direction-${direction.toLowerCase()}`}><strong>{direction}</strong><small>5′→3′</small></div>
      <div className="pcr-sequence-main">
        <code>{sequence}</code>
        <div className="pcr-sequence-meta">
          {start}–{end} bp · Tm {tm.toFixed(2)}°C · GC {gc.toFixed(1)}%
        </div>
      </div>
      <button type="button" className="pcr-copy-button" onClick={onCopy} aria-label={`${t("copy")} ${direction}`}>
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}

function PrimerPairCard({
  pair,
  templateLength,
  recommended,
  specificityResult,
  specificityLoading,
  specificityBusy,
  specificityError,
  onScreenSpecificity,
}: {
  pair: PCRPrimerPair;
  templateLength: number;
  recommended: boolean;
  specificityResult?: PCRPairSpecificityResponse;
  specificityLoading: boolean;
  specificityBusy: boolean;
  specificityError?: string;
  onScreenSpecificity: () => void;
}) {
  const t = useTranslations("pcr");
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied((current) => current === key ? null : current), 1600);
  }

  const maxHairpin = Math.max(pair.left_hairpin_th, pair.right_hairpin_th);
  const maxSelfEnd = Math.max(pair.left_self_end_th, pair.right_self_end_th);
  const clampOk = [pair.left_gc_clamp, pair.right_gc_clamp].every((value) => value >= 1 && value <= 3);
  const qualityPassCount = [
    pair.tm_difference <= 2,
    maxHairpin < 24,
    maxSelfEnd < 35,
    pair.pair_compl_end_th < 35,
    clampOk,
  ].filter(Boolean).length;
  const safeTemplateLength = Math.max(templateLength, 1);
  const ampliconLeft = Math.max(0, Math.min(100, ((pair.amplicon_start - 1) / safeTemplateLength) * 100));
  const ampliconWidth = Math.max(2, Math.min(100 - ampliconLeft, (pair.product_size / safeTemplateLength) * 100));
  const forwardPosition = Math.max(0, Math.min(100, (pair.left_start / safeTemplateLength) * 100));
  const reversePosition = Math.max(0, Math.min(100, (pair.right_end / safeTemplateLength) * 100));
  const specificityTitle = specificityResult?.verdict === "one_paired_record"
    ? t("specificity_result_single")
    : specificityResult?.verdict === "multiple_paired_records"
      ? t("specificity_result_multiple", { count: specificityResult.paired_record_count })
      : specificityResult?.verdict === "no_paired_records"
        ? t("specificity_result_none")
        : t("specificity_result_unavailable");

  return (
    <article className={`pcr-pair-card${recommended ? " is-recommended" : ""}`}>
      <div className="pcr-pair-header">
        <div className="pcr-pair-rank">#{pair.pair_index}</div>
        <div className="pcr-pair-headline">
          <div className="pcr-pair-titleline">
            <strong>{pair.product_size} bp</strong>
            {recommended && <span className="result-best-label">{t("best_candidate")}</span>}
          </div>
          <span>{t("primer3_penalty")} {pair.penalty.toFixed(2)}</span>
        </div>
        <div className="pcr-annealing-badge">
          <span>{t("annealing_estimate")}</span>
          <strong>{pair.annealing_temp_estimate.toFixed(1)}°C</strong>
        </div>
      </div>

      <div className="pcr-amplicon-map" aria-label={`${t("amplicon_range")} ${pair.amplicon_start}–${pair.amplicon_end} bp`}>
        <div className="pcr-amplicon-map-meta">
          <span>5′</span>
          <strong>{pair.amplicon_start}–{pair.amplicon_end} / {templateLength} bp</strong>
          <span>3′</span>
        </div>
        <div className="pcr-amplicon-track" aria-hidden="true">
          <i style={{ left: `${ampliconLeft}%`, width: `${ampliconWidth}%` }} />
          <b className="is-forward" style={{ left: `${forwardPosition}%` }}>F</b>
          <b className="is-reverse" style={{ left: `${reversePosition}%` }}>R</b>
        </div>
      </div>

      <div className="pcr-sequence-list">
        <SequenceRow
          direction="F"
          sequence={pair.left_primer}
          start={pair.left_start}
          end={pair.left_end}
          tm={pair.left_tm}
          gc={pair.left_gc}
          copied={copied === "left"}
          onCopy={() => copy(pair.left_primer, "left")}
        />
        <SequenceRow
          direction="R"
          sequence={pair.right_primer}
          start={pair.right_start}
          end={pair.right_end}
          tm={pair.right_tm}
          gc={pair.right_gc}
          copied={copied === "right"}
          onCopy={() => copy(pair.right_primer, "right")}
        />
      </div>

      <div className="pcr-quality-row">
        <div className="pcr-quality-summary"><strong>{qualityPassCount}/5</strong><span>{t("quality_checks")}</span></div>
        <QualityChip pass={pair.tm_difference <= 2}>{t("tm_diff")} {pair.tm_difference.toFixed(2)}°C</QualityChip>
        <QualityChip pass={maxHairpin < 24}>{t("hairpin")} {maxHairpin.toFixed(1)}°C</QualityChip>
        <QualityChip pass={maxSelfEnd < 35}>{t("self_end")} {maxSelfEnd.toFixed(1)}°C</QualityChip>
        <QualityChip pass={pair.pair_compl_end_th < 35}>{t("heterodimer")} {pair.pair_compl_end_th.toFixed(1)}°C</QualityChip>
        <QualityChip pass={clampOk}>{t("gc_clamp")} {pair.left_gc_clamp}/{pair.right_gc_clamp}</QualityChip>
      </div>

      <div className="pcr-pair-actions">
        <button
          type="button"
          className="pcr-specificity-button"
          onClick={onScreenSpecificity}
          disabled={specificityBusy}
        >
          {specificityLoading ? <><span className="pcr-spinner" />{t("specificity_screening")}</> : t("specificity_screen_button")}
        </button>
        <button
          type="button"
          className="pcr-secondary-button"
          onClick={() => copy(`F (5′→3′): ${pair.left_primer}\nR (5′→3′): ${pair.right_primer}`, "pair")}
        >
          {copied === "pair" ? t("copied_pair") : t("copy_pair")}
        </button>
        <button
          type="button"
          className="pcr-expand-button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-label={expanded ? t("collapse_pair", { n: pair.pair_index }) : t("expand_pair", { n: pair.pair_index })}
        >
          {expanded ? t("collapse_details") : t("view_details")}
          <span aria-hidden="true">{expanded ? "▲" : "▼"}</span>
        </button>
      </div>

      {specificityError && (
        <div className="pcr-specificity-error" role="alert">
          <strong>{t("specificity_result_unavailable")}</strong>
          <span>{specificityError}</span>
        </div>
      )}

      {specificityResult && (
        <section className={`pcr-specificity-result is-${specificityResult.verdict}`}>
          <div className="pcr-specificity-result-heading">
            <div aria-hidden="true">
              {specificityResult.verdict === "multiple_paired_records" ? "!" : specificityResult.verdict === "one_paired_record" ? "1" : "0"}
            </div>
            <p>
              <strong>{specificityTitle}</strong>
              <span>
                {specificityResult.verdict === "one_paired_record"
                  ? t("specificity_result_single_body")
                  : specificityResult.verdict === "multiple_paired_records"
                    ? t("specificity_result_multiple_body")
                    : specificityResult.verdict === "no_paired_records"
                      ? t("specificity_result_none_body")
                      : t("specificity_result_unavailable_body")}
              </span>
            </p>
          </div>

          {specificityResult.specificity_checked && (
            <>
              <div className="pcr-specificity-metrics">
                <div><span>{t("specificity_left_hits")}</span><strong>{specificityResult.left_hit_count}</strong></div>
                <div><span>{t("specificity_right_hits")}</span><strong>{specificityResult.right_hit_count}</strong></div>
                <div><span>{t("specificity_paired_products")}</span><strong>{specificityResult.paired_record_count}</strong></div>
                <div><span>{t("specificity_database")}</span><strong>{t("specificity_database_value")}</strong></div>
              </div>

              {specificityResult.paired_records.length > 0 && (
                <div className="pcr-specificity-amplicons">
                  <strong>{t("specificity_candidate_products")}</strong>
                  <div>
                    {specificityResult.paired_records.map((record, index) => (
                      <article key={`${record.accession}-${record.start}-${record.end}-${index}`}>
                        <header>
                          <a
                            href={`https://www.ncbi.nlm.nih.gov/nuccore/${encodeURIComponent(record.accession)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {record.accession}
                          </a>
                          <span>{record.product_size} bp</span>
                          {record.matches_expected_size && <b>{t("specificity_expected_match")}</b>}
                        </header>
                        <p>{record.title}</p>
                        <small>
                          {record.start}–{record.end} · F {record.left_identity.toFixed(1)}% / R {record.right_identity.toFixed(1)}% · {t("specificity_mismatches")} {record.left_mismatches}/{record.right_mismatches}
                        </small>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              <p className="pcr-specificity-boundary">
                {t("specificity_scope_note", { limit: specificityResult.search_hit_limit })}
                {specificityResult.results_may_be_truncated && <> {t("specificity_truncated_note")}</>}
              </p>
            </>
          )}
        </section>
      )}

      {expanded && (
        <div className="pcr-pair-details">
          <div className="pcr-detail-grid">
            <div><span>{t("amplicon_range")}</span><strong>{pair.amplicon_start}–{pair.amplicon_end}</strong></div>
            <div><span>{t("gradient_start")}</span><strong>{pair.annealing_gradient_low.toFixed(1)}–{pair.annealing_gradient_high.toFixed(1)}°C</strong></div>
            <div><span>{t("self_any")}</span><strong>{pair.left_self_any_th.toFixed(1)} / {pair.right_self_any_th.toFixed(1)}°C</strong></div>
            <div><span>{t("heterodimer_any")}</span><strong>{pair.pair_compl_any_th.toFixed(1)}°C</strong></div>
          </div>
          <div className="pcr-gradient-note">{t("gradient_note")}</div>
          <div className="pcr-amplicon-block">
            <div className="pcr-amplicon-heading">
              <span>{t("amplicon_sequence")}</span>
              <button type="button" onClick={() => copy(pair.amplicon_sequence, "amplicon")}>
                {copied === "amplicon" ? t("copied") : t("copy")}
              </button>
            </div>
            <code>{pair.amplicon_sequence}</code>
          </div>
        </div>
      )}
    </article>
  );
}

export default function PCRPage() {
  const t = useTranslations("pcr");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const resultRef = useRef<HTMLDivElement>(null);
  const [preset, setPreset] = useState<PCRPreset>("standard");
  const [label, setLabel] = useState("");
  const [sequence, setSequence] = useState("");
  const [productMin, setProductMin] = useState(PRESETS.standard.productMin);
  const [productMax, setProductMax] = useState(PRESETS.standard.productMax);
  const [tmMin, setTmMin] = useState(PRESETS.standard.tmMin);
  const [tmOpt, setTmOpt] = useState(PRESETS.standard.tmOpt);
  const [tmMax, setTmMax] = useState(PRESETS.standard.tmMax);
  const [gcMin, setGcMin] = useState(40);
  const [gcMax, setGcMax] = useState(60);
  const [numReturn, setNumReturn] = useState(5);
  const [targetEnabled, setTargetEnabled] = useState(false);
  const [targetStart, setTargetStart] = useState("");
  const [targetEnd, setTargetEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PCRDesignResponse | null>(null);
  const [specificitySpecies, setSpecificitySpecies] = useState<PCRSpecificitySpecies>("human");
  const [specificityResults, setSpecificityResults] = useState<Record<number, PCRPairSpecificityResponse>>({});
  const [specificityErrors, setSpecificityErrors] = useState<Record<number, string>>({});
  const [specificityLoadingPair, setSpecificityLoadingPair] = useState<number | null>(null);

  const sequenceLength = useMemo(() => normalizedSequenceLength(sequence), [sequence]);

  function applyPreset(next: PCRPreset) {
    const values = PRESETS[next];
    setPreset(next);
    setProductMin(values.productMin);
    setProductMax(values.productMax);
    setTmMin(values.tmMin);
    setTmOpt(values.tmOpt);
    setTmMax(values.tmMax);
  }

  function messageFor(code: string) {
    const known: Record<string, string> = {
      multiple_fasta_records: t("error_multiple_fasta"),
      empty_sequence: t("error_empty"),
      invalid_characters: t("error_invalid_chars"),
      sequence_too_short: t("error_short"),
      too_many_ambiguous_bases: t("error_many_n"),
      invalid_product_range: t("error_product_range"),
      invalid_tm_range: t("error_tm_range"),
      invalid_gc_range: t("error_gc_range"),
      incomplete_target_range: t("error_target_incomplete"),
      invalid_target_range: t("error_target_range"),
      template_shorter_than_product_range: t("error_template_range"),
      primer3_error: t("error_primer3"),
      no_primers_found: t("error_no_primers"),
    };
    return known[code] || t("error_generic");
  }

  function messageForRequestError(requestError: unknown) {
    const message = requestError instanceof Error ? requestError.message.trim() : "";
    const normalized = message.toLowerCase();
    if (
      !message ||
      normalized === "not found" ||
      normalized === "internal server error" ||
      normalized.includes("http 404") ||
      normalized.includes("http 500") ||
      normalized.includes("failed to fetch") ||
      normalized.includes("networkerror") ||
      normalized.includes("timeout") ||
      normalized.includes("gateway") ||
      normalized.includes("upstream service")
    ) {
      return `${tCommon("service_unavailable")} ${tCommon("retry_later")}`;
    }
    return message;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    setSpecificityResults({});
    setSpecificityErrors({});
    setSpecificityLoadingPair(null);

    if (!sequence.trim()) {
      setError(t("error_empty"));
      return;
    }
    if (sequenceLength < 50) {
      setError(t("error_short"));
      return;
    }
    if (productMin >= productMax) {
      setError(t("error_product_range"));
      return;
    }
    if (targetEnabled && (!targetStart || !targetEnd)) {
      setError(t("error_target_incomplete"));
      return;
    }

    setLoading(true);
    try {
      const response = await designPcr({
        sequence,
        label: label.trim() || undefined,
        preset,
        product_size_min: productMin,
        product_size_max: productMax,
        primer_tm_min: tmMin,
        primer_tm_opt: tmOpt,
        primer_tm_max: tmMax,
        primer_gc_min: gcMin,
        primer_gc_max: gcMax,
        num_return: numReturn,
        target_start: targetEnabled ? Number(targetStart) : undefined,
        target_end: targetEnabled ? Number(targetEnd) : undefined,
      });
      if (!response.success) {
        setError(messageFor(response.message));
        return;
      }
      setResult(response);
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (requestError) {
      setError(messageForRequestError(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function handleSpecificity(pair: PCRPrimerPair) {
    setSpecificityLoadingPair(pair.pair_index);
    setSpecificityResults((current) => {
      const next = { ...current };
      delete next[pair.pair_index];
      return next;
    });
    setSpecificityErrors((current) => {
      const next = { ...current };
      delete next[pair.pair_index];
      return next;
    });

    try {
      const response = await screenPcrSpecificity({
        pair_index: pair.pair_index,
        left_primer: pair.left_primer,
        right_primer: pair.right_primer,
        species: specificitySpecies,
        min_amplicon_size: 50,
        max_amplicon_size: 5000,
        expected_product_size: pair.product_size,
      });
      setSpecificityResults((current) => ({ ...current, [pair.pair_index]: response }));
    } catch (requestError) {
      setSpecificityErrors((current) => ({
        ...current,
        [pair.pair_index]: requestError instanceof Error ? requestError.message : t("specificity_error_ncbi"),
      }));
    } finally {
      setSpecificityLoadingPair(null);
    }
  }

  function changeSpecificitySpecies(nextSpecies: PCRSpecificitySpecies) {
    setSpecificitySpecies(nextSpecies);
    setSpecificityResults({});
    setSpecificityErrors({});
  }

  function exportSummary() {
    if (!result) return;
    const header = [
      "Pair", "Forward primer (5'-3')", "Reverse primer (5'-3')", "Forward Tm", "Reverse Tm",
      "Forward GC%", "Reverse GC%", "Product size", "Amplicon start", "Amplicon end",
      "Annealing estimate", "Primer3 penalty", "NCBI RefSeq genomic pair screen",
      "NCBI species", "Paired candidates", "Genome-wide specificity checked",
    ];
    const rows = result.primer_pairs.map((pair) => {
      const specificity = specificityResults[pair.pair_index];
      return [
        pair.pair_index, pair.left_primer, pair.right_primer, pair.left_tm, pair.right_tm,
        pair.left_gc, pair.right_gc, pair.product_size, pair.amplicon_start, pair.amplicon_end,
        pair.annealing_temp_estimate, pair.penalty,
        specificity?.specificity_checked ? specificity.verdict : "Not run",
        specificity?.specificity_checked ? specificity.species : "",
        specificity?.specificity_checked ? specificity.paired_record_count : "",
        "No",
      ];
    });
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    downloadText(`${result.label || "pcr"}-primer-summary.csv`, csv);
  }

  function exportOrderSheet() {
    if (!result) return;
    const safeLabel = (result.label || "PCR").replace(/[^a-zA-Z0-9_-]+/g, "_");
    const rows: Array<Array<string | number>> = [["Oligo name", "Sequence (5'-3')", "Pair", "Direction", "Purification"]];
    result.primer_pairs.forEach((pair) => {
      rows.push([`${safeLabel}_P${pair.pair_index}_F`, pair.left_primer, pair.pair_index, "Forward", "Standard desalting"]);
      rows.push([`${safeLabel}_P${pair.pair_index}_R`, pair.right_primer, pair.pair_index, "Reverse", "Standard desalting"]);
    });
    downloadText(`${safeLabel}-oligo-order.csv`, rows.map((row) => row.map(csvCell).join(",")).join("\n"));
  }

  return (
    <div className="pcr-page design-workspace-v3 pcr-visual-v3">
      <section className="pcr-hero design-hero">
        <div>
          <div className="pcr-kicker">PRIMERCAT · ENDPOINT PCR</div>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
        <div className="pcr-hero-flow" aria-label={t("workflow_label")}>
          <span>{t("hero_meta_label")}</span>
          <strong>{t("hero_meta_method")}</strong>
          <small>{t("hero_meta_body")}</small>
        </div>
      </section>

      <div className="pcr-workspace">
        <form className="pcr-form-card" onSubmit={handleSubmit}>
          <div className="pcr-section-heading">
            <span>01</span>
            <div><strong>{t("preset_title")}</strong><small>{t("preset_hint")}</small></div>
          </div>
          <div className="pcr-preset-grid">
            {(["standard", "colony", "high_fidelity"] as PCRPreset[]).map((item) => (
              <button
                key={item}
                type="button"
                className={preset === item ? "is-active" : ""}
                onClick={() => applyPreset(item)}
              >
                <strong>{t(`preset_${item}`)}</strong>
                <span>{t(`preset_${item}_hint`)}</span>
              </button>
            ))}
          </div>

          <div className="pcr-section-heading">
            <span>02</span>
            <div><strong>{t("template_title")}</strong><small>{t("template_hint")}</small></div>
          </div>
          <label className="pcr-field">
            <span>{t("label_field")}</span>
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder={t("label_placeholder")} />
          </label>
          <label className="pcr-field">
            <span className="pcr-field-label-row"><span>{t("sequence_field")}</span><small>{sequenceLength.toLocaleString(locale)} bp</small></span>
            <textarea
              value={sequence}
              onChange={(event) => setSequence(event.target.value)}
              placeholder={t("sequence_placeholder")}
              spellCheck={false}
            />
          </label>

          <label className="pcr-target-toggle">
            <input type="checkbox" checked={targetEnabled} onChange={(event) => setTargetEnabled(event.target.checked)} />
            <span><strong>{t("target_toggle")}</strong><small>{t("target_toggle_hint")}</small></span>
          </label>
          {targetEnabled && (
            <div className="pcr-two-columns">
              <label className="pcr-field"><span>{t("target_start")}</span><input type="number" min={1} value={targetStart} onChange={(event) => setTargetStart(event.target.value)} /></label>
              <label className="pcr-field"><span>{t("target_end")}</span><input type="number" min={1} value={targetEnd} onChange={(event) => setTargetEnd(event.target.value)} /></label>
            </div>
          )}

          <details className="pcr-advanced">
            <summary>{t("advanced_title")}</summary>
            <div className="pcr-advanced-grid">
              <label className="pcr-field"><span>{t("product_min")}</span><input type="number" min={50} max={10000} value={productMin} onChange={(event) => setProductMin(Number(event.target.value))} /></label>
              <label className="pcr-field"><span>{t("product_max")}</span><input type="number" min={60} max={10000} value={productMax} onChange={(event) => setProductMax(Number(event.target.value))} /></label>
              <label className="pcr-field"><span>{t("tm_min")}</span><input type="number" step="0.5" value={tmMin} onChange={(event) => setTmMin(Number(event.target.value))} /></label>
              <label className="pcr-field"><span>{t("tm_opt")}</span><input type="number" step="0.5" value={tmOpt} onChange={(event) => setTmOpt(Number(event.target.value))} /></label>
              <label className="pcr-field"><span>{t("tm_max")}</span><input type="number" step="0.5" value={tmMax} onChange={(event) => setTmMax(Number(event.target.value))} /></label>
              <label className="pcr-field"><span>{t("gc_min")}</span><input type="number" value={gcMin} onChange={(event) => setGcMin(Number(event.target.value))} /></label>
              <label className="pcr-field"><span>{t("gc_max")}</span><input type="number" value={gcMax} onChange={(event) => setGcMax(Number(event.target.value))} /></label>
              <label className="pcr-field"><span>{t("return_count")}</span><input type="number" min={1} max={20} value={numReturn} onChange={(event) => setNumReturn(Number(event.target.value))} /></label>
            </div>
          </details>

          {error && (
            <div className="workbench-alert is-error" role="alert">
              <span aria-hidden="true">!</span>
              <div><strong>{tCommon("request_failed")}</strong><p>{error}</p></div>
            </div>
          )}
          <button className="pcr-submit" type="submit" disabled={loading}>
            {loading ? <><span className="pcr-spinner" />{t("designing")}</> : t("design_button")}
          </button>
          <p className="pcr-form-boundary">{t("design_boundary")}</p>
        </form>

        <main className="pcr-results" ref={resultRef}>
          {!result && !loading && (
            <section className="pcr-empty-card">
              <div className="pcr-empty-head">
                <div>
                  <span>{t("output_kicker")}</span>
                  <strong>{t("empty_title")}</strong>
                </div>
                <small>{t("output_state")}</small>
              </div>
              <div className="pcr-empty-preview" aria-hidden="true">
                <span className="pcr-empty-primer is-forward">F&nbsp;&nbsp;5′→3′</span>
                <div className="pcr-empty-track"><i /><b /><i /></div>
                <span className="pcr-empty-primer is-reverse">R&nbsp;&nbsp;5′→3′</span>
              </div>
              <p>{t("empty_body")}</p>
              <div className="pcr-empty-features">
                <span>{t("empty_feature_amplicon")}</span>
                <span>{t("empty_feature_structure")}</span>
                <span>{t("empty_feature_export")}</span>
              </div>
            </section>
          )}

          {loading && (
            <section className="pcr-loading-card workbench-loading-state">
              <div className="workbench-state-head"><span>PROCESS · PRIMER3</span><small>01 / 01</small></div>
              <div className="workbench-loading-body">
                <span className="pcr-spinner is-large" />
                <div><strong>{t("designing")}</strong><p>{t("loading_body")}</p></div>
              </div>
              <div className="workbench-progress-line"><i /></div>
            </section>
          )}

          {result && (
            <div className="pcr-result-stack">
              <section className="pcr-result-summary">
                <div>
                  <div className="pcr-kicker">{t("results_kicker")}</div>
                  <h2>{result.label || t("unnamed_target")}</h2>
                  <p>{result.sequence_length.toLocaleString(locale)} bp · {t(`preset_${result.preset}`)} · {result.product_size_min}–{result.product_size_max} bp</p>
                </div>
                <div className="pcr-summary-count"><strong>{result.primer_pairs.length}</strong><span>{t("pairs_returned")}</span></div>
                <div className="pcr-export-actions">
                  <button type="button" onClick={exportSummary}>{t("export_summary")}</button>
                  <button type="button" onClick={exportOrderSheet}>{t("export_order")}</button>
                </div>
              </section>

              <p className="primer-sequence-convention pcr-sequence-convention"><strong>{t("sequence_direction_title")}</strong>{t("sequence_direction_note")}</p>

              <section className="pcr-specificity-warning">
                <div aria-hidden="true">!</div>
                <p><strong>{t("specificity_title")}</strong><span>{t("specificity_body")}</span></p>
                <label className="pcr-specificity-species">
                  <span>{t("specificity_species")}</span>
                  <select
                    value={specificitySpecies}
                    onChange={(event) => changeSpecificitySpecies(event.target.value as PCRSpecificitySpecies)}
                    disabled={specificityLoadingPair !== null}
                  >
                    <option value="human">{t("specificity_species_human")}</option>
                    <option value="mouse">{t("specificity_species_mouse")}</option>
                  </select>
                </label>
              </section>

              <div className="pcr-result-list">
                {result.primer_pairs.map((pair) => (
                  <PrimerPairCard
                    key={pair.pair_index}
                    pair={pair}
                    templateLength={result.sequence_length}
                    recommended={pair.pair_index === result.primer_pairs[0]?.pair_index}
                    specificityResult={specificityResults[pair.pair_index]}
                    specificityLoading={specificityLoadingPair === pair.pair_index}
                    specificityBusy={specificityLoadingPair !== null}
                    specificityError={specificityErrors[pair.pair_index]}
                    onScreenSpecificity={() => handleSpecificity(pair)}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
