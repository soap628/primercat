import json
from pathlib import Path

import primer3
import pytest


DATASET_PATH = (
    Path(__file__).resolve().parents[2]
    / "frontend"
    / "src"
    / "data"
    / "qpcr-reference-benchmark-v0.1.json"
)


@pytest.fixture(scope="module")
def benchmark() -> dict:
    return json.loads(DATASET_PATH.read_text(encoding="utf-8"))


def _gc_percent(sequence: str) -> float:
    return 100.0 * sum(base in "GC" for base in sequence) / len(sequence)


def test_reference_dataset_has_traceable_unique_records(benchmark):
    cases = benchmark["cases"]

    assert benchmark["benchmark_id"] == "qpcr-primerbank-mouse-pilot-v0.1"
    assert benchmark["results"]["records"] == len(cases) == 5
    assert benchmark["results"]["oligos"] == len(cases) * 2 == 10
    assert len({case["primerbank_id"] for case in cases}) == len(cases)
    assert len({case["accession"] for case in cases}) == len(cases)
    assert all(case["source_url"].startswith("https://pga.mgh.harvard.edu/") for case in cases)


@pytest.mark.parametrize("case_index", range(5))
def test_reference_pairs_match_the_declared_primer_cat_envelope(benchmark, case_index):
    case = benchmark["cases"][case_index]
    envelope = benchmark["primer_cat_reference_envelope"]
    length_min, length_max = envelope["primer_length_nt"]
    gc_min, gc_max = envelope["gc_percent"]
    product_min, product_max = envelope["amplicon_size_bp"]

    for sequence in (case["forward"], case["reverse"]):
        assert set(sequence) <= set("ACGT")
        assert length_min <= len(sequence) <= length_max
        assert gc_min <= _gc_percent(sequence) <= gc_max

    assert (
        abs(case["reported_forward_tm_c"] - case["reported_reverse_tm_c"])
        <= envelope["maximum_pair_tm_difference_c"]
    )
    assert product_min <= case["amplicon_size_bp"] <= product_max


@pytest.mark.parametrize("case_index", range(5))
def test_primer3_reproduces_primerbank_reported_tm(benchmark, case_index):
    case = benchmark["cases"][case_index]
    settings = benchmark["thermodynamic_recalculation"]
    tolerance = settings["absolute_tm_tolerance_c"]

    for direction in ("forward", "reverse"):
        observed = primer3.calc_tm(
            case[direction],
            mv_conc=settings["monovalent_mM"],
            dv_conc=settings["divalent_mM"],
            dntp_conc=settings["dntp_mM"],
            dna_conc=settings["primer_nM"],
        )
        expected = case[f"reported_{direction}_tm_c"]
        stored = case[f"recalculated_{direction}_tm_c"]

        assert observed == pytest.approx(stored, abs=0.01)
        assert abs(observed - expected) <= tolerance


def test_published_summary_matches_recalculated_results(benchmark):
    results = benchmark["results"]
    settings = benchmark["thermodynamic_recalculation"]
    deltas = []
    envelope_assertions = 0

    for case in benchmark["cases"]:
        for direction in ("forward", "reverse"):
            sequence = case[direction]
            observed = primer3.calc_tm(
                sequence,
                mv_conc=settings["monovalent_mM"],
                dv_conc=settings["divalent_mM"],
                dntp_conc=settings["dntp_mM"],
                dna_conc=settings["primer_nM"],
            )
            deltas.append(abs(observed - case[f"reported_{direction}_tm_c"]))
            envelope_assertions += 3  # alphabet, length, GC

        envelope_assertions += 2  # pair delta-Tm and amplicon size

    assert sum(delta <= settings["absolute_tm_tolerance_c"] for delta in deltas) == results[
        "tm_recalculations_within_tolerance"
    ]
    assert round(max(deltas), 2) == results["maximum_absolute_tm_delta_c"]
    assert envelope_assertions == results["reference_envelope_assertions_passed"]
    assert envelope_assertions == results["reference_envelope_assertions_total"]
