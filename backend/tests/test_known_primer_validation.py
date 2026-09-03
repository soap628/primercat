import asyncio
from types import SimpleNamespace

from app.schemas.gene_primer import (
    GenomeAmpliconHit,
    GenomePairScreenStatus,
    GenomePairValidation,
    KnownPrimerValidationRequest,
    Species,
    TranscriptAmpliconClass,
    TranscriptAmpliconHit,
    TranscriptomePairScreenStatus,
    TranscriptomePairValidation,
)
from app.services import known_primer_validation


def _request():
    return KnownPrimerValidationRequest(
        forward_primer="CCTCAGCATCTTATCCGAGTGG",
        reverse_primer="TGGATGGTGGTACAGTCAGAGC",
        species=Species.human,
        target_transcript="NM_000546.6",
    )


def test_known_pair_reports_unavailable_without_local_references(monkeypatch):
    monkeypatch.setattr(known_primer_validation, "primer_bowtie2_available", lambda species: False)
    monkeypatch.setattr(known_primer_validation, "transcriptome_bowtie2_available", lambda species: False)

    result = asyncio.run(known_primer_validation.validate_known_primer_pair(_request()))

    assert result.status == "unavailable"
    assert result.scope == "none"
    assert result.target_transcript == "NM_000546.6"


def test_known_pair_reports_joint_pass_and_product_size(monkeypatch):
    genome = GenomePairValidation(
        checked=True,
        specific=True,
        status=GenomePairScreenStatus.validated,
        reference_assembly="GCF_000001405.40",
        target_transcript="NM_000546.6",
        target_locus_accession="NC_000017.11",
        target_locus_start=7668402,
        target_locus_end=7687550,
        target_locus_strand="-",
        paired_amplicon_count=1,
        target_amplicon_count=1,
        top_amplicons=[
            GenomeAmpliconHit(
                accession="NC_000017.11",
                start=7675000,
                end=7675120,
                product_size=121,
                orientation="left_plus_right_minus",
                left_mismatches=0,
                right_mismatches=0,
                is_target=True,
            )
        ],
    )
    transcriptome = TranscriptomePairValidation(
        checked=True,
        gene_specific=True,
        isoform_specific=True,
        status=TranscriptomePairScreenStatus.validated,
        reference_assembly="GCF_000001405.40",
        target_transcript="NM_000546.6",
        target_gene_id="7157",
        target_gene_name="TP53",
        paired_amplicon_count=1,
        target_transcript_amplicon_count=1,
        top_amplicons=[
            TranscriptAmpliconHit(
                transcript_accession="NM_000546.6",
                start=100,
                end=220,
                product_size=121,
                orientation="left_plus_right_minus",
                left_mismatches=0,
                right_mismatches=0,
                classification=TranscriptAmpliconClass.target_transcript,
                gene_id="7157",
                gene_name="TP53",
            )
        ],
    )

    monkeypatch.setattr(known_primer_validation, "primer_bowtie2_available", lambda species: True)
    monkeypatch.setattr(known_primer_validation, "transcriptome_bowtie2_available", lambda species: True)
    monkeypatch.setattr(
        known_primer_validation,
        "validate_primer_pairs_batch",
        lambda pairs, species, target: [SimpleNamespace(pair=genome)],
    )
    monkeypatch.setattr(
        known_primer_validation,
        "validate_transcriptome_primer_pairs_batch",
        lambda pairs, species, target: [transcriptome],
    )

    result = asyncio.run(known_primer_validation.validate_known_primer_pair(_request()))

    assert result.status == "passed"
    assert result.scope == "reference_genome_and_refseq_transcriptome_bowtie2"
    assert result.observed_product_size == 121
    assert result.reference_assembly == "GCF_000001405.40"
