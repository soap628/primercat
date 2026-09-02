"""Build the frozen PrimerBank qPCR reference benchmark v0.2.

The script deliberately separates data-frame construction, deterministic
sampling, and PrimerCat's design-only evaluation. It does not run BLAST and it
does not interpret a PrimerBank validation record as validation of PrimerCat.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import html
import json
import re
import statistics
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import primer3


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPOSITORY_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.gene_primer_service import PRIMER3_SETTINGS, _design_primers  # noqa: E402


SEARCH_URL = "https://pga.mgh.harvard.edu/cgi-bin/primerbank/new_search2.cgi"
DETAIL_URL = "https://pga.mgh.harvard.edu/cgi-bin/primerbank/new_displayDetail2.cgi?primerID={primerbank_id}"
SEARCH_TERMS = ("protein", "factor", "receptor", "enzyme", "kinase", "transporter")
SAMPLE_SEED = "primercat-qpcr-primerbank-v0.2"
SAMPLE_SIZE = 100
USER_AGENT = "PrimerCat benchmark snapshot/0.2 (support@primercat.com)"
PAIR_TABLE_RE = re.compile(
    r'<table border="0" cellpadding="2" cellspacing="10">(.*?)</table>',
    re.IGNORECASE | re.DOTALL,
)


def _plain(fragment: str) -> str:
    without_tags = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(without_tags)).strip()


def _capture(pattern: str, value: str, label: str) -> str:
    match = re.search(pattern, value, re.IGNORECASE | re.DOTALL)
    if not match:
        raise ValueError(f"Could not parse {label}")
    return _plain(match.group(1))


def _request(url: str, data: bytes | None = None) -> bytes:
    last_error: Exception | None = None
    for attempt in range(4):
        request = Request(url, data=data, headers={"User-Agent": USER_AGENT})
        try:
            with urlopen(request, timeout=45) as response:
                return response.read()
        except (HTTPError, URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < 3:
                time.sleep(0.75 * (2 ** attempt))
    if last_error:
        raise last_error
    raise RuntimeError("request failed without an exception")


def _cached_request(cache_path: Path, url: str, data: bytes | None = None) -> bytes:
    if cache_path.exists():
        return cache_path.read_bytes()
    body = _request(url, data=data)
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_bytes(body)
    time.sleep(0.15)
    return body


def _parse_primer_row(table: str, label: str) -> tuple[str, int, float, tuple[int, int]]:
    pattern = (
        rf"{label} Primer</td>\s*"
        r'<td[^>]*><font[^>]*>([ACGT]+)</font></td>\s*'
        r"<td[^>]*>(\d+)</td>\s*"
        r"<td[^>]*>([0-9.]+)</td>\s*"
        r"<td[^>]*>(\d+)\s*-\s*(\d+)</td>"
    )
    match = re.search(pattern, table, re.IGNORECASE | re.DOTALL)
    if not match:
        raise ValueError(f"Could not parse {label.lower()} primer row")
    return (
        match.group(1).upper(),
        int(match.group(2)),
        float(match.group(3)),
        (int(match.group(4)), int(match.group(5))),
    )


def parse_search_page(raw_html: bytes, term: str) -> list[dict]:
    page = raw_html.decode("utf-8", errors="replace")
    records: list[dict] = []
    for gene_block in re.split(r"<hr\s*/?>", page, flags=re.IGNORECASE):
        if "Gene Descriptions" not in gene_block:
            continue
        try:
            gene_id = _capture(r"NCBI GeneID</b></td>\s*<td[^>]*>.*?>(\d+)</a>", gene_block, "gene id")
            accession = _capture(r"GenBank Accession</b></td>\s*<td[^>]*>.*?>([^<]+)</a>", gene_block, "accession")
            coding_length = int(_capture(r"Coding DNA Length</b></td>\s*<td[^>]*>(\d+)</td>", gene_block, "coding length"))
            description = _capture(r"Gene Description</b></td>\s*<td[^>]*>(.*?)</td>", gene_block, "description")
        except ValueError:
            continue

        symbol_candidates = [
            item for item in re.findall(r"\(([^()]*)\)", description)
            if re.fullmatch(r"[A-Za-z][A-Za-z0-9-]*", item)
        ]
        symbol = symbol_candidates[-1] if symbol_candidates else gene_id

        for table in PAIR_TABLE_RE.findall(gene_block):
            validation_match = re.search(
                r'href="(https://pga\.mgh\.harvard\.edu/rtpcr/displayResult\.do\?[^"<>]*primerPairId=([A-Za-z0-9]+)[^"<>]*)"',
                table,
                re.IGNORECASE,
            )
            if not validation_match:
                continue
            primerbank_id = validation_match.group(2)
            try:
                table_id = _capture(r"PrimerBank ID</b></td>\s*<td[^>]*>([A-Za-z0-9]+)</td>", table, "PrimerBank id")
                amplicon_size = int(_capture(r"Amplicon Size</b></td>\s*<td[^>]*>(\d+)</td>", table, "amplicon size"))
                forward, forward_length, forward_tm, forward_location = _parse_primer_row(table, "Forward")
                reverse, reverse_length, reverse_tm, reverse_location = _parse_primer_row(table, "Reverse")
            except ValueError:
                continue
            if table_id != primerbank_id:
                continue
            records.append({
                "gene": symbol,
                "gene_id": gene_id,
                "gene_description": description,
                "species": "Mus musculus",
                "accession": accession,
                "coding_dna_length": coding_length,
                "primerbank_id": primerbank_id,
                "forward": forward,
                "reverse": reverse,
                "reported_forward_length_nt": forward_length,
                "reported_reverse_length_nt": reverse_length,
                "reported_forward_tm_c": forward_tm,
                "reported_reverse_tm_c": reverse_tm,
                "forward_location_1_based": list(forward_location),
                "reverse_location_1_based": list(reverse_location),
                "amplicon_size_bp": amplicon_size,
                "validation_url": html.unescape(validation_match.group(1)),
                "source_url": DETAIL_URL.format(primerbank_id=primerbank_id),
                "source_terms": [term],
            })
    return records


def parse_coding_sequence(raw_html: bytes) -> str:
    page = raw_html.decode("utf-8", errors="replace")
    match = re.search(r"<pre>(.*?)</pre>", page, re.IGNORECASE | re.DOTALL)
    if not match:
        raise ValueError("Detail page has no coding-sequence block")
    plain = html.unescape(re.sub(r"<[^>]+>", "", match.group(1)))
    return re.sub(r"[^ACGT]", "", plain.upper())


def sample_key(primerbank_id: str) -> str:
    return hashlib.sha256(f"{SAMPLE_SEED}:{primerbank_id}".encode()).hexdigest()


def _gc_percent(sequence: str) -> float:
    return round(100 * sum(base in "GC" for base in sequence) / len(sequence), 2)


def evaluate_case(case: dict) -> dict:
    candidates = _design_primers(case["template_sequence"], 30)
    reference_start = case["forward_location_1_based"][0] - 1
    reference_end = case["reverse_location_1_based"][0]
    reference_length = reference_end - reference_start
    best_reference_overlap = 0.0
    exact_pair_present = False

    for candidate in candidates:
        candidate_start = candidate["left_props"].pos
        candidate_end = candidate["right_props"].pos + 1
        overlap = max(0, min(reference_end, candidate_end) - max(reference_start, candidate_start))
        best_reference_overlap = max(best_reference_overlap, overlap / reference_length)
        if candidate["left"] == case["forward"] and candidate["right"] == case["reverse"]:
            exact_pair_present = True

    return {
        "design_success": bool(candidates),
        "candidate_pairs_returned": len(candidates),
        "reference_amplicon_80pct_covered": best_reference_overlap >= 0.8,
        "best_reference_amplicon_overlap_fraction": round(best_reference_overlap, 4),
        "exact_reference_pair_returned": exact_pair_present,
    }


def build_snapshot(cache_dir: Path) -> dict:
    query_hashes: dict[str, str] = {}
    records_by_id: dict[str, dict] = {}
    for term in SEARCH_TERMS:
        payload = urlencode({
            "selectBox": "Keyword",
            "species": "Mouse",
            "searchBox": term,
            "Submit": "Submit",
        }).encode()
        raw_page = _cached_request(cache_dir / f"search-{term}.html", SEARCH_URL, payload)
        query_hashes[term] = hashlib.sha256(raw_page).hexdigest()
        for record in parse_search_page(raw_page, term):
            existing = records_by_id.get(record["primerbank_id"])
            if existing:
                existing["source_terms"] = sorted(set(existing["source_terms"] + record["source_terms"]))
            else:
                records_by_id[record["primerbank_id"]] = record

    ranked = sorted(records_by_id.values(), key=lambda record: sample_key(record["primerbank_id"]))
    selected: list[dict] = []
    excluded: dict[str, int] = {}

    def load_detail(record: dict) -> tuple[dict, bytes | None, str | None]:
        try:
            raw_detail = _cached_request(
                cache_dir / f"detail-{record['primerbank_id']}.html",
                record["source_url"],
            )
            sequence = parse_coding_sequence(raw_detail)
            if len(sequence) != record["coding_dna_length"]:
                raise ValueError("coding length mismatch")
            if set(sequence) - set("ACGT"):
                raise ValueError("ambiguous coding sequence")
            record["template_sequence"] = sequence
            return record, raw_detail, None
        except Exception as exc:  # snapshot builder records source failures by class
            return record, None, type(exc).__name__

    with ThreadPoolExecutor(max_workers=3) as executor:
        for batch_start in range(0, len(ranked), 30):
            if len(selected) == SAMPLE_SIZE:
                break
            batch = ranked[batch_start:batch_start + 30]
            for record, raw_detail, error_class in executor.map(load_detail, batch):
                if len(selected) == SAMPLE_SIZE:
                    break
                if error_class or raw_detail is None:
                    key = error_class or "UnknownError"
                    excluded[key] = excluded.get(key, 0) + 1
                    continue
                record["sample_hash"] = sample_key(record["primerbank_id"])
                record["computed_forward_gc_percent"] = _gc_percent(record["forward"])
                record["computed_reverse_gc_percent"] = _gc_percent(record["reverse"])
                record["detail_page_sha256"] = hashlib.sha256(raw_detail).hexdigest()
                record["design_evaluation"] = evaluate_case(record)
                selected.append(record)

    if len(selected) != SAMPLE_SIZE:
        raise RuntimeError(f"Only {len(selected)} eligible records were available")

    candidate_counts = [case["design_evaluation"]["candidate_pairs_returned"] for case in selected]
    design_successes = sum(case["design_evaluation"]["design_success"] for case in selected)
    coverage_successes = sum(case["design_evaluation"]["reference_amplicon_80pct_covered"] for case in selected)
    exact_matches = sum(case["design_evaluation"]["exact_reference_pair_returned"] for case in selected)
    case_sha256 = hashlib.sha256(
        json.dumps(selected, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()

    return {
        "schema_version": "2.0",
        "benchmark_id": "qpcr-primerbank-mouse-v0.2",
        "snapshot_date": "2026-09-02",
        "scope": "deterministic public-reference sample and Primer3 design-only coverage audit",
        "source_frame": {
            "database": "PrimerBank",
            "species": "Mus musculus",
            "required_evidence": "public experimental-validation link",
            "fixed_keyword_queries": list(SEARCH_TERMS),
            "unique_validated_records_in_frame": len(records_by_id),
            "query_response_sha256": query_hashes,
        },
        "sampling": {
            "method": "Sort eligible PrimerBank IDs by SHA-256(seed:id), then take the first 100 records with a complete unambiguous coding sequence.",
            "seed": SAMPLE_SEED,
            "requested_records": SAMPLE_SIZE,
            "selected_records": len(selected),
            "source_failures_before_sample_complete": excluded,
            "case_payload_sha256": case_sha256,
        },
        "design_engine": {
            "engine": "primer3-py",
            "engine_version": primer3.__version__,
            "mode": "PrimerCat qPCR design-only; no BLAST, exon model, ranking score, or wet-lab step",
            "settings": PRIMER3_SETTINGS,
            "settings_sha256": hashlib.sha256(
                json.dumps(PRIMER3_SETTINGS, sort_keys=True, separators=(",", ":")).encode()
            ).hexdigest(),
            "candidate_limit_per_template": 30,
            "reference_region_coverage_threshold": 0.8,
        },
        "results": {
            "records": len(selected),
            "design_successes": design_successes,
            "design_failures": len(selected) - design_successes,
            "design_success_fraction": round(design_successes / len(selected), 4),
            "median_candidate_pairs": statistics.median(candidate_counts),
            "reference_amplicon_80pct_covered": coverage_successes,
            "reference_amplicon_80pct_coverage_fraction": round(coverage_successes / len(selected), 4),
            "exact_reference_pairs_returned": exact_matches,
        },
        "interpretation_limitations": [
            "The query-defined sampling frame is deterministic but is not a uniform sample of all PrimerBank records.",
            "PrimerBank coding sequences and identifiers can be older than current RefSeq versions.",
            "Design success means Primer3 returned at least one candidate under PrimerCat settings; it is not wet-lab success.",
            "Reference-region coverage and exact-pair recovery compare software outputs only and do not measure biological specificity.",
            "BLAST, genomic off-target screening, transcript selection, exon spanning, and PrimerCat composite ranking are outside this run.",
        ],
        "cases": selected,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=Path("/tmp/primercat-primerbank-v0.2-cache"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=REPOSITORY_ROOT / "frontend" / "src" / "data" / "qpcr-primerbank-benchmark-v0.2.json",
    )
    args = parser.parse_args()

    snapshot = build_snapshot(args.cache_dir)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(args.output),
        "frame": snapshot["source_frame"]["unique_validated_records_in_frame"],
        "sample": snapshot["sampling"]["selected_records"],
        "results": snapshot["results"],
    }, indent=2))


if __name__ == "__main__":
    main()
