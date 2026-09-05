from app.services import gene_primer_service
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


def test_build_design_basis_reports_joint_genome_transcriptome_scope(monkeypatch):
    transcript = TranscriptInfo(
        transcript_id="NM_007393.5",
        transcript_description="actin beta",
        gene_name="Actb",
        species="mouse",
        sequence="A" * 640,
        cds_start=100,
        cds_end=500,
        exons=[ExonInfo(index=0, start=0, end=300), ExonInfo(index=1, start=300, end=640)],
        cds_length=400,
        protein_length=133,
        total_nm_found=1,
        selection_reason="selected RefSeq transcript",
    )
    monkeypatch.setattr(gene_primer_service, "primer_bowtie2_available", lambda species: species == "mouse")
    monkeypatch.setattr(gene_primer_service, "transcriptome_bowtie2_available", lambda species: species == "mouse")

    basis = build_design_basis(transcript, 640, 2, 30, 10, 5, species="mouse")

    assert basis.blast_database == "genome_bowtie2+refseq_rna_bowtie2"
    assert basis.specificity_scope == "reference_genome_and_refseq_transcriptome_bowtie2"
    assert basis.paired_amplicon_screen is True
    assert basis.paired_transcriptome_screen is True
    assert basis.reference_assembly == "GCF_000001635.27"
    assert basis.transcriptome_reference == "GCF_000001635.27"


def test_build_design_basis_reports_remote_paired_transcript_scope(monkeypatch):
    transcript = TranscriptInfo(
        transcript_id="NM_000546.6",
        transcript_description="tumor protein p53",
        gene_name="TP53",
        species="human",
        sequence="A" * 640,
        cds_start=100,
        cds_end=500,
        exons=[ExonInfo(index=0, start=0, end=300), ExonInfo(index=1, start=300, end=640)],
        cds_length=400,
        protein_length=133,
        total_nm_found=1,
        selection_reason="selected RefSeq transcript",
    )
    monkeypatch.setattr(gene_primer_service, "primer_bowtie2_available", lambda species: False)
    monkeypatch.setattr(gene_primer_service, "transcriptome_bowtie2_available", lambda species: False)

    basis = build_design_basis(
        transcript, 640, 2, 30, 10, 5,
        species="human",
        remote_transcriptome_pair_screen=True,
    )

    assert basis.blast_database == "ncbi_refseq_rna_paired_blast"
    assert basis.specificity_scope == "refseq_rna_paired_amplicons"
    assert basis.paired_amplicon_screen is False
    assert basis.paired_transcriptome_screen is True
    assert basis.genome_wide_specificity_checked is False
    assert basis.transcriptome_reference == "NCBI RefSeq RNA live query"
