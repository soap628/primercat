from app.schemas.gene_primer import BlastValidationStatus
from app.services.primer_bowtie2 import _hits_to_blast_validation
from app.services.qpcr_target_locus import TranscriptGenomeLocus


def _hit(accession: str, position: int, identity: float = 100.0) -> dict:
    return {
        "accession": accession,
        "position": position,
        "end": position + 19,
        "strand": "+",
        "mismatches": 0,
        "identity": identity,
        "title": f"{accession}:{position} (+) id={identity:.1f}%",
    }


def test_one_genomic_alignment_can_pass_the_bounded_primer_screen():
    result = _hits_to_blast_validation([_hit("chr1", 100)])

    assert result.status == BlastValidationStatus.validated
    assert result.specific is True
    assert result.qualified_hit_count == 1
    assert result.off_target_count == 0
    assert result.hit_limit_reached is False


def test_another_exact_genomic_alignment_is_counted_as_a_non_target():
    result = _hits_to_blast_validation([
        _hit("chr1", 100),
        _hit("chr2", 200),
    ])

    assert result.status == BlastValidationStatus.validated
    assert result.specific is False
    assert result.qualified_hit_count == 2
    assert result.off_target_count == 1
    assert result.top_hits[1].is_off_target is True


def test_reaching_the_bowtie_return_limit_cannot_pass():
    result = _hits_to_blast_validation([
        _hit(f"chr{index}", index * 100) for index in range(10)
    ])

    assert result.specific is False
    assert result.hit_limit_reached is True
    assert result.off_target_count == 9


def test_target_locus_not_first_hit_is_still_identified_as_target():
    locus = TranscriptGenomeLocus("NM_1.1", "chr2", 180, 260, "+")
    result = _hits_to_blast_validation(
        [_hit("chr1", 100), _hit("chr2", 200)],
        target_locus=locus,
    )

    assert result.target_found is True
    assert result.top_hits[0].is_target is True
    assert result.top_hits[0].title.startswith("chr2:200")
    assert result.off_target_count == 1
    assert result.specific is False
