from app.schemas.pcr import PCRDesignRequest, PCRPreset
from app.services import pcr_design


def _fake_primer3_result() -> dict:
    return {
        "PRIMER_PAIR_NUM_RETURNED": 1,
        "PRIMER_PAIR_EXPLAIN": "considered 12, ok 1",
        "PRIMER_LEFT_0_SEQUENCE": "ACGTCGATCGATCGTACGTA",
        "PRIMER_RIGHT_0_SEQUENCE": "TCGATCGTACGTAGCTAGCA",
        "PRIMER_LEFT_0": [20, 20],
        "PRIMER_RIGHT_0": [219, 20],
        "PRIMER_LEFT_0_TM": 60.2,
        "PRIMER_RIGHT_0_TM": 60.8,
        "PRIMER_LEFT_0_GC_PERCENT": 50.0,
        "PRIMER_RIGHT_0_GC_PERCENT": 52.0,
        "PRIMER_PAIR_0_PRODUCT_SIZE": 200,
        "PRIMER_PAIR_0_PENALTY": 0.42,
        "PRIMER_LEFT_0_SELF_ANY_TH": 8.5,
        "PRIMER_LEFT_0_SELF_END_TH": 3.1,
        "PRIMER_LEFT_0_HAIRPIN_TH": 1.2,
        "PRIMER_RIGHT_0_SELF_ANY_TH": 7.4,
        "PRIMER_RIGHT_0_SELF_END_TH": 2.2,
        "PRIMER_RIGHT_0_HAIRPIN_TH": 0.0,
        "PRIMER_PAIR_0_COMPL_ANY_TH": 9.1,
        "PRIMER_PAIR_0_COMPL_END_TH": 4.3,
    }


def test_normalize_single_fasta_record():
    sequence, error = pcr_design.normalize_dna_sequence(">target\nacgt acgt\nNNnn")

    assert error is None
    assert sequence == "ACGTACGTNNNN"


def test_rejects_multiple_fasta_records():
    sequence, error = pcr_design.normalize_dna_sequence(">one\nACGT\n>two\nTGCA")

    assert sequence == ""
    assert error == "multiple_fasta_records"


def test_design_returns_coordinates_amplicon_and_structure_metrics(monkeypatch):
    captured: dict = {}

    def fake_design(sequence_args, global_args):
        captured["sequence_args"] = sequence_args
        captured["global_args"] = global_args
        return _fake_primer3_result()

    monkeypatch.setattr(pcr_design.primer3, "design_primers", fake_design)
    template = "ACGT" * 150
    request = PCRDesignRequest(
        sequence=f">demo\n{template}",
        label="demo amplicon",
        preset=PCRPreset.standard,
        product_size_min=150,
        product_size_max=800,
        target_start=100,
        target_end=120,
    )

    response = pcr_design.design_pcr_primers(request)

    assert response.success is True
    assert response.sequence_length == 600
    assert response.product_size_max == 600
    assert response.specificity_checked is False
    assert captured["sequence_args"]["SEQUENCE_TARGET"] == [99, 21]
    assert captured["global_args"]["PRIMER_PRODUCT_SIZE_RANGE"] == [[150, 600]]

    pair = response.primer_pairs[0]
    assert pair.left_start == 21
    assert pair.left_end == 40
    assert pair.right_start == 201
    assert pair.right_end == 220
    assert pair.amplicon_start == 21
    assert pair.amplicon_end == 220
    assert len(pair.amplicon_sequence) == 200
    assert pair.tm_difference == 0.6
    assert pair.pair_compl_end_th == 4.3
    assert pair.annealing_temp_estimate == 57.2
    assert pair.annealing_gradient_low == 55.2
    assert pair.annealing_gradient_high == 59.2
    assert pair.target_included is True


def test_rejects_target_outside_template(monkeypatch):
    monkeypatch.setattr(
        pcr_design.primer3,
        "design_primers",
        lambda *_args, **_kwargs: _fake_primer3_result(),
    )
    request = PCRDesignRequest(
        sequence="ACGT" * 100,
        target_start=350,
        target_end=450,
    )

    response = pcr_design.design_pcr_primers(request)

    assert response.success is False
    assert response.message == "invalid_target_range"
    assert response.primer_pairs == []


def test_reports_no_primers_with_primer3_explanation(monkeypatch):
    monkeypatch.setattr(
        pcr_design.primer3,
        "design_primers",
        lambda *_args, **_kwargs: {
            "PRIMER_PAIR_NUM_RETURNED": 0,
            "PRIMER_PAIR_EXPLAIN": "considered 10, low tm 10, ok 0",
        },
    )
    request = PCRDesignRequest(sequence="ACGT" * 100)

    response = pcr_design.design_pcr_primers(request)

    assert response.success is False
    assert response.message == "no_primers_found"
    assert response.primer3_pair_explain == "considered 10, low tm 10, ok 0"
