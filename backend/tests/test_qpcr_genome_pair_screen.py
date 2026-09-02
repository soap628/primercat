from app.services import qpcr_target_locus
from app.services.primer_bowtie2 import _build_pair_validation, _pair_primer_hits
from app.services.qpcr_target_locus import TranscriptGenomeLocus


def _hit(
    accession: str,
    position: int,
    strand: str,
    *,
    length: int = 20,
    mismatches: int = 0,
) -> dict:
    return {
        "accession": accession,
        "position": position,
        "end": position + length - 1,
        "strand": strand,
        "mismatches": mismatches,
        "identity": round((length - mismatches) / length * 100, 1),
        "title": accession,
    }


def test_transcript_locus_is_resolved_from_versioned_gtf(tmp_path, monkeypatch):
    gtf = tmp_path / "mouse.gtf"
    gtf.write_text(
        "\n".join([
            'NC_000067.7\tRefSeq\ttranscript\t100\t300\t.\t+\t.\tgene_id "G1"; transcript_id "NM_001001.2"; gene_name "Gene1";',
            'NC_000067.7\tRefSeq\texon\t100\t150\t.\t+\t.\tgene_id "G1"; transcript_id "NM_001001.2"; gene_name "Gene1";',
            'NC_000067.7\tRefSeq\texon\t250\t300\t.\t+\t.\tgene_id "G1"; transcript_id "NM_001001.2"; gene_name "Gene1";',
        ]) + "\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(qpcr_target_locus.settings, "GRNA_ANNOTATION_GTF_MOUSE", str(gtf))
    qpcr_target_locus._load_transcript_loci.cache_clear()

    exact, exact_error = qpcr_target_locus.resolve_qpcr_target_locus("mouse", "NM_001001.2")
    versionless, versionless_error = qpcr_target_locus.resolve_qpcr_target_locus("mouse", "NM_001001")

    assert exact_error == ""
    assert versionless_error == ""
    assert exact == versionless
    assert exact == TranscriptGenomeLocus(
        transcript_id="NM_001001.2",
        accession="NC_000067.7",
        start=100,
        end=300,
        strand="+",
        gene_id="G1",
        gene_name="Gene1",
    )


def test_primer_hits_are_paired_by_accession_orientation_and_product_range():
    locus = TranscriptGenomeLocus("NM_1.1", "NC_1.1", 90, 220, "+")
    left_hits = [
        _hit("NC_1.1", 100, "+"),
        _hit("NC_2.1", 500, "+", mismatches=1),
    ]
    right_hits = [
        _hit("NC_1.1", 180, "-"),
        _hit("NC_2.1", 560, "-"),
        _hit("NC_1.1", 400, "+"),
    ]

    products = _pair_primer_hits(left_hits, right_hits, locus, 50, 5000)

    assert [(product.accession, product.product_size) for product in products] == [
        ("NC_1.1", 100),
        ("NC_2.1", 80),
    ]
    assert products[0].is_target is True
    assert products[1].is_target is False


def test_pair_screen_pass_requires_one_target_product_and_no_off_target_product():
    locus = TranscriptGenomeLocus("NM_1.1", "NC_1.1", 90, 220, "+")
    result = _build_pair_validation(
        [_hit("NC_1.1", 100, "+")],
        [_hit("NC_1.1", 180, "-")],
        locus=locus,
        target_transcript="NM_1.1",
        locus_error="",
        left_raw_count=1,
        right_raw_count=1,
        hit_limit=64,
        min_amplicon_size=50,
        max_amplicon_size=5000,
        species="mouse",
    )

    assert result.checked is True
    assert result.specific is True
    assert result.target_amplicon_count == 1
    assert result.off_target_amplicon_count == 0
    assert result.top_amplicons[0].is_target is True


def test_pair_screen_is_conservative_when_alignment_results_are_truncated():
    locus = TranscriptGenomeLocus("NM_1.1", "NC_1.1", 90, 220, "+")
    result = _build_pair_validation(
        [_hit("NC_1.1", 100, "+")],
        [_hit("NC_1.1", 180, "-")],
        locus=locus,
        target_transcript="NM_1.1",
        locus_error="",
        left_raw_count=65,
        right_raw_count=1,
        hit_limit=64,
        min_amplicon_size=50,
        max_amplicon_size=5000,
        species="mouse",
    )

    assert result.specific is False
    assert result.status.value == "truncated"
    assert result.hit_limit_reached is True


def test_pair_screen_cannot_pass_without_a_target_locus():
    result = _build_pair_validation(
        [_hit("NC_1.1", 100, "+")],
        [_hit("NC_1.1", 180, "-")],
        locus=None,
        target_transcript=None,
        locus_error="No target transcript accession was provided.",
        left_raw_count=1,
        right_raw_count=1,
        hit_limit=64,
        min_amplicon_size=50,
        max_amplicon_size=5000,
        species="mouse",
    )

    assert result.specific is False
    assert result.status.value == "target_not_anchored"
