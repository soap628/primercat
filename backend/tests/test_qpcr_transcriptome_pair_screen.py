from app.schemas.gene_primer import (
    GenomePairScreenStatus,
    GenomePairValidation,
    TranscriptAmpliconClass,
)
from app.services import primer_transcriptome
from app.services.primer_transcriptome import (
    _build_validation,
    _pair_transcript_hits,
    combined_computational_specificity_pass,
)
from app.services.qpcr_target_locus import TranscriptGenomeLocus


def _hit(accession: str, position: int, strand: str, *, length: int = 20, mismatches: int = 0) -> dict:
    return {
        "accession": accession,
        "position": position,
        "end": position + length - 1,
        "strand": strand,
        "mismatches": mismatches,
        "identity": round((length - mismatches) / length * 100, 1),
        "title": accession,
    }


def _locus(transcript: str, gene_id: str, gene_name: str) -> TranscriptGenomeLocus:
    return TranscriptGenomeLocus(transcript, "NC_1.1", 100, 500, "+", gene_id, gene_name)


def test_transcript_products_are_classified_by_target_and_gene(monkeypatch):
    loci = {
        "NM_TARGET.2": _locus("NM_TARGET.2", "G1", "Gene1"),
        "NM_ISOFORM.1": _locus("NM_ISOFORM.1", "G1", "Gene1"),
        "NM_OTHER.1": _locus("NM_OTHER.1", "G2", "Gene2"),
    }
    monkeypatch.setattr(
        primer_transcriptome,
        "resolve_qpcr_target_locus",
        lambda _species, accession: (loci.get(accession), "missing" if accession not in loci else ""),
    )
    left = [_hit(accession, 10, "+") for accession in ["NM_TARGET.2", "NM_ISOFORM.1", "NM_OTHER.1", "XR_UNKNOWN.1"]]
    right = [_hit(accession, 80, "-") for accession in ["NM_TARGET.2", "NM_ISOFORM.1", "NM_OTHER.1", "XR_UNKNOWN.1"]]

    products = _pair_transcript_hits(
        left,
        right,
        target_transcript="NM_TARGET.2",
        target_locus=loci["NM_TARGET.2"],
        species="mouse",
        min_amplicon_size=50,
        max_amplicon_size=5000,
    )

    assert [product.classification for product in products] == [
        TranscriptAmpliconClass.target_transcript,
        TranscriptAmpliconClass.same_gene_isoform,
        TranscriptAmpliconClass.other_gene,
        TranscriptAmpliconClass.unclassified,
    ]


def test_gene_specific_and_isoform_specific_are_reported_separately(monkeypatch):
    target = _locus("NM_TARGET.2", "G1", "Gene1")
    isoform = _locus("NM_ISOFORM.1", "G1", "Gene1")
    monkeypatch.setattr(
        primer_transcriptome,
        "resolve_qpcr_target_locus",
        lambda _species, accession: ({"NM_TARGET.2": target, "NM_ISOFORM.1": isoform}.get(accession), ""),
    )
    left = [_hit("NM_TARGET.2", 10, "+"), _hit("NM_ISOFORM.1", 15, "+")]
    right = [_hit("NM_TARGET.2", 80, "-"), _hit("NM_ISOFORM.1", 85, "-")]

    result = _build_validation(
        left,
        right,
        target_transcript="NM_TARGET.2",
        species="mouse",
        left_raw_count=2,
        right_raw_count=2,
        hit_limit=128,
        min_amplicon_size=50,
        max_amplicon_size=5000,
    )

    assert result.status.value == "validated"
    assert result.gene_specific is True
    assert result.isoform_specific is False
    assert result.target_transcript_amplicon_count == 1
    assert result.same_gene_isoform_amplicon_count == 1


def test_cross_gene_product_prevents_gene_specific_pass(monkeypatch):
    target = _locus("NM_TARGET.2", "G1", "Gene1")
    other = _locus("NM_OTHER.1", "G2", "Gene2")
    monkeypatch.setattr(
        primer_transcriptome,
        "resolve_qpcr_target_locus",
        lambda _species, accession: ({"NM_TARGET.2": target, "NM_OTHER.1": other}.get(accession), ""),
    )
    result = _build_validation(
        [_hit("NM_TARGET.2", 10, "+"), _hit("NM_OTHER.1", 10, "+")],
        [_hit("NM_TARGET.2", 80, "-"), _hit("NM_OTHER.1", 80, "-")],
        target_transcript="NM_TARGET.2",
        species="mouse",
        left_raw_count=2,
        right_raw_count=2,
        hit_limit=128,
        min_amplicon_size=50,
        max_amplicon_size=5000,
    )

    assert result.gene_specific is False
    assert result.other_gene_amplicon_count == 1


def test_joint_pass_accepts_transcript_confirmed_pair_without_contiguous_genomic_product(monkeypatch):
    target = _locus("NM_TARGET.2", "G1", "Gene1")
    monkeypatch.setattr(
        primer_transcriptome,
        "resolve_qpcr_target_locus",
        lambda _species, _accession: (target, ""),
    )
    transcriptome = _build_validation(
        [_hit("NM_TARGET.2", 10, "+")],
        [_hit("NM_TARGET.2", 80, "-")],
        target_transcript="NM_TARGET.2",
        species="mouse",
        left_raw_count=1,
        right_raw_count=1,
        hit_limit=128,
        min_amplicon_size=50,
        max_amplicon_size=5000,
    )
    genome = GenomePairValidation(
        checked=True,
        specific=False,
        status=GenomePairScreenStatus.no_paired_amplicons,
        target_locus_accession="NC_1.1",
        paired_amplicon_count=0,
        target_amplicon_count=0,
        off_target_amplicon_count=0,
        unclassified_amplicon_count=0,
    )

    assert combined_computational_specificity_pass(genome, transcriptome) is True


def test_joint_pass_rejects_additional_genomic_product(monkeypatch):
    target = _locus("NM_TARGET.2", "G1", "Gene1")
    monkeypatch.setattr(primer_transcriptome, "resolve_qpcr_target_locus", lambda *_args: (target, ""))
    transcriptome = _build_validation(
        [_hit("NM_TARGET.2", 10, "+")],
        [_hit("NM_TARGET.2", 80, "-")],
        target_transcript="NM_TARGET.2",
        species="mouse",
        left_raw_count=1,
        right_raw_count=1,
        hit_limit=128,
        min_amplicon_size=50,
        max_amplicon_size=5000,
    )
    genome = GenomePairValidation(
        checked=True,
        specific=False,
        status=GenomePairScreenStatus.validated,
        target_locus_accession="NC_1.1",
        paired_amplicon_count=2,
        target_amplicon_count=1,
        off_target_amplicon_count=1,
        unclassified_amplicon_count=0,
    )

    assert combined_computational_specificity_pass(genome, transcriptome) is False
