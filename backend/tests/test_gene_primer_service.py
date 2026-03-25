from app.services.gene_primer_service import build_design_basis
from app.services.ncbi_fetch import ExonInfo, TranscriptInfo


def test_build_design_basis_uses_1_based_display_coordinates_and_screening_counts():
    transcript = TranscriptInfo(
        transcript_id="NM_000546.6",
        transcript_description="tumor protein p53 transcript variant 1",
        gene_name="TP53",
        species="human",
        sequence="A" * 640,
        cds_start=120,
        cds_end=510,
        exons=[ExonInfo(index=0, start=0, end=180), ExonInfo(index=1, start=240, end=640)],
        cds_length=390,
        protein_length=129,
        total_nm_found=4,
        selection_reason="picked the longest CDS",
    )

    basis = build_design_basis(
        transcript=transcript,
        sequence_length=640,
        exon_count=2,
        candidate_pairs_designed=30,
        candidate_pairs_blasted=10,
        returned_pairs=5,
    )

    assert basis.template_source == "ncbi_refseq_transcript"
    assert basis.design_region_start == 1
    assert basis.design_region_end == 640
    assert basis.cds_region_start == 121
    assert basis.cds_region_end == 510
    assert basis.exon_spanning_preferred is True
    assert basis.candidate_pairs_designed == 30
    assert basis.candidate_pairs_blasted == 10
    assert basis.returned_pairs == 5
    assert basis.blast_database == "refseq_rna"
    assert basis.specificity_scope == "refseq_rna_transcripts"
    assert basis.genome_wide_specificity_checked is False
    assert basis.off_target_identity_threshold == 80.0
