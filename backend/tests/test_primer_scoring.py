from app.schemas.gene_primer import (
    BlastTopHit,
    BlastValidation,
    BlastValidationStatus,
    ExonSpan,
    TranscriptomePairScreenStatus,
    TranscriptomePairValidation,
)
from app.services.primer_scoring import score_primer_pair


def _blast_validation(status: BlastValidationStatus, specific: bool, off_target_count: int = 0) -> BlastValidation:
    return BlastValidation(
        specific=specific,
        top_hit_identity=100.0 if specific else 82.0,
        off_target_count=off_target_count,
        top_hits=[BlastTopHit(rank=1, title="test hit", identity=100.0 if specific else 82.0, is_off_target=not specific)],
        status=status,
        message="",
    )


def test_specificity_score_drops_to_zero_when_blast_is_not_validated():
    score = score_primer_pair(
        left="ATGCGTACGTACGTACGTAA",
        right="CGTACGTACGTACGTACGTA",
        left_tm=60.0,
        right_tm=60.5,
        left_gc=50.0,
        right_gc=50.0,
        product_size=120,
        blast_left=_blast_validation(BlastValidationStatus.error, specific=False),
        blast_right=_blast_validation(BlastValidationStatus.validated, specific=True),
        exon_span=ExonSpan(spans_junction=True, left_exon=0, right_exon=1, junction_count=1),
    )

    assert score.specificity_score == 0.0
    assert score.total < 100.0


def test_remote_paired_transcript_pass_earns_specificity_score():
    transcript_screen = TranscriptomePairValidation(
        checked=True,
        gene_specific=True,
        isoform_specific=False,
        status=TranscriptomePairScreenStatus.validated,
        target_transcript_amplicon_count=1,
        same_gene_isoform_amplicon_count=2,
    )
    score = score_primer_pair(
        left="ATGCGTACGTACGTACGTAA",
        right="CGTACGTACGTACGTACGTA",
        left_tm=60.0,
        right_tm=60.5,
        left_gc=50.0,
        right_gc=50.0,
        product_size=120,
        blast_left=_blast_validation(BlastValidationStatus.validated, specific=False, off_target_count=3),
        blast_right=_blast_validation(BlastValidationStatus.validated, specific=False, off_target_count=2),
        exon_span=ExonSpan(spans_junction=True, left_exon=0, right_exon=1, junction_count=1),
        transcriptome_pair_validation=transcript_screen,
    )

    assert score.specificity_score == 20.0
