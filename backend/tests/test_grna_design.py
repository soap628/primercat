from types import SimpleNamespace

from app.schemas.grna import (
    CasType,
    GrnaDesignRequest,
    GrnaRiskLevel,
    OffTargetStatus,
    Species,
    TargetLocus,
    TargetLocusAnchorStatus,
)
from app.services import grna_design
from app.services.grna_genome_offtarget import OffTargetScreenResult


def _construct_short_request() -> GrnaDesignRequest:
    if hasattr(GrnaDesignRequest, "model_construct"):
        return GrnaDesignRequest.model_construct(
            sequence="A" * 22,
            cas_type=CasType.cas9,
            species=Species.human,
            num_return=5,
            gene_name="TP53",
        )
    return GrnaDesignRequest.construct(
        sequence="A" * 22,
        cas_type=CasType.cas9,
        species=Species.human,
        num_return=5,
        gene_name="TP53",
    )


def test_design_grna_returns_species_and_screening_fields(monkeypatch):
    monkeypatch.setattr(
        grna_design,
        "screen_grna_off_targets",
        lambda grna_list, cas_type, species, target_locus=None, fallback_loader=None: OffTargetScreenResult(
            payloads=[
                {
                    "off_target_risk": "Low",
                    "off_target_status": "validated",
                    "potential_off_target_hits": 0,
                    "best_non_target_identity": 0.0,
                    "top_off_target_hits": [
                        {
                            "rank": 1,
                            "accession": "chr17",
                            "title": "chr17:7668402 (+) PAM=AGG",
                            "identity": 100.0,
                            "align_length": 20,
                            "mismatches": 0,
                            "position": 7668402,
                            "strand": "+",
                            "pam": "AGG",
                            "is_target_locus": True,
                            "annotation": {
                                "status": "annotated",
                                "region": "cds",
                                "gene_symbol": "TP53",
                                "gene_id": "GENE1",
                                "transcript_id": "NM_000546",
                                "gene_biotype": "protein_coding",
                                "distance_to_tss": 0,
                            },
                        }
                    ],
                    "off_target_message": "Only one canonical-PAM genome hit passed the mismatch filter.",
                    "target_locus_status": "matched",
                    "target_locus_message": "Matched.",
                }
                for _ in grna_list
            ],
            off_target_model="bowtie2_reference_genome_shortread",
            off_target_scope="species_reference_genome",
            off_target_engine="bowtie2_local_index",
            genome_wide_offtarget_checked=True,
            target_locus_anchor_used=target_locus is not None,
            target_locus_anchor_status="matched" if target_locus is not None else "not_provided",
            target_locus_matched_guides=len(grna_list) if target_locus is not None else 0,
            target_locus_unmatched_guides=0,
            target_locus_summary="Matched all guides." if target_locus is not None else "No target locus.",
            hit_annotation_ready=True,
            hit_annotation_source="gtf_gene_model",
            hit_annotation_summary="Top genome hits are annotated against the configured human gene model.",
        ),
    )

    req = GrnaDesignRequest(
        sequence="G" * 20 + "AGG" + "A" * 8 + "C" * 20 + "TGG",
        cas_type=CasType.cas9,
        species=Species.human,
        num_return=5,
        gene_name="TP53",
    )

    response = grna_design.design_grna(req)

    assert response.success is True
    assert response.species == "human"
    assert response.risk_model == "heuristic_sequence_features"
    assert response.off_target_model == "bowtie2_reference_genome_shortread"
    assert response.off_target_scope == "species_reference_genome"
    assert response.off_target_engine == "bowtie2_local_index"
    assert response.genome_wide_offtarget_checked is True
    assert response.grna_list
    first = response.grna_list[0]
    assert first.heuristic_risk in {GrnaRiskLevel.low, GrnaRiskLevel.medium, GrnaRiskLevel.high}
    assert first.off_target_risk == GrnaRiskLevel.low
    assert first.off_target_status == OffTargetStatus.validated
    assert first.top_off_target_hits[0].accession == "chr17"
    assert first.top_off_target_hits[0].pam == "AGG"
    assert first.top_off_target_hits[0].annotation is not None
    assert first.top_off_target_hits[0].annotation.region == "cds"
    assert first.on_target_score <= 100
    assert response.hit_annotation_ready is True
    assert response.hit_annotation_source == "gtf_gene_model"


def test_design_grna_surfaces_fallback_reason(monkeypatch):
    monkeypatch.setattr(
        grna_design,
        "screen_grna_off_targets",
        lambda grna_list, cas_type, species, target_locus=None, fallback_loader=None: OffTargetScreenResult(
            payloads=[
                {
                    "off_target_risk": None,
                    "off_target_status": "error",
                    "potential_off_target_hits": 0,
                    "best_non_target_identity": 0.0,
                    "top_off_target_hits": [],
                    "off_target_message": "Genome-level search is unavailable.",
                    "target_locus_status": "unavailable",
                    "target_locus_message": "Unavailable.",
                }
                for _ in grna_list
            ],
            off_target_model="species_filtered_nt_blast_short",
            off_target_scope="species_filtered_nt",
            off_target_engine="ncbi_nt_blast",
            genome_wide_offtarget_checked=False,
            off_target_fallback_reason="Bowtie2 executable 'bowtie2' was not found.",
            target_locus_anchor_status="unavailable" if target_locus is not None else "not_provided",
            target_locus_summary="Unavailable." if target_locus is not None else "No target locus.",
        ),
    )

    response = grna_design.design_grna(
        GrnaDesignRequest(
            sequence="G" * 20 + "AGG" + "A" * 8 + "C" * 20 + "TGG",
            cas_type=CasType.cas9,
            species=Species.human,
            num_return=5,
        )
    )

    assert response.genome_wide_offtarget_checked is False
    assert response.off_target_engine == "ncbi_nt_blast"
    assert "Bowtie2 executable" in response.off_target_fallback_reason


def test_design_grna_surfaces_target_locus_anchor_metadata(monkeypatch):
    monkeypatch.setattr(
        grna_design,
        "screen_grna_off_targets",
        lambda grna_list, cas_type, species, target_locus=None, fallback_loader=None: OffTargetScreenResult(
            payloads=[
                {
                    "off_target_risk": "Low",
                    "off_target_status": "validated",
                    "potential_off_target_hits": 0,
                    "best_non_target_identity": 0.0,
                    "top_off_target_hits": [],
                    "off_target_message": "Matched target locus.",
                    "target_locus_status": "matched",
                    "target_locus_message": "The intended locus was matched.",
                },
                {
                    "off_target_risk": "High",
                    "off_target_status": "anchor_missing",
                    "potential_off_target_hits": 1,
                    "best_non_target_identity": 100.0,
                    "top_off_target_hits": [],
                    "off_target_message": "No hit overlapped the provided locus.",
                    "target_locus_status": "no_match",
                    "target_locus_message": "No overlap.",
                },
            ],
            off_target_model="bowtie2_reference_genome_shortread",
            off_target_scope="species_reference_genome",
            off_target_engine="bowtie2_local_index",
            genome_wide_offtarget_checked=True,
            target_locus_anchor_used=True,
            target_locus_anchor_status="partial",
            target_locus_matched_guides=1,
            target_locus_unmatched_guides=1,
            target_locus_summary="Only one guide matched the provided locus.",
        ),
    )

    response = grna_design.design_grna(
        GrnaDesignRequest(
            sequence="G" * 20 + "AGG" + "A" * 8 + "C" * 20 + "TGG",
            cas_type=CasType.cas9,
            species=Species.human,
            num_return=2,
            target_locus=TargetLocus(accession="chr17", start=7668402, end=7668424, strand="+"),
        )
    )

    assert response.target_locus is not None
    assert response.target_locus_anchor_used is True
    assert response.target_locus_anchor_status == TargetLocusAnchorStatus.partial
    assert response.target_locus_matched_guides == 1
    assert response.target_locus_unmatched_guides == 1
    assert response.target_locus_summary == "Only one guide matched the provided locus."
    assert response.grna_list[0].target_locus_status in {
        TargetLocusAnchorStatus.matched,
        TargetLocusAnchorStatus.no_match,
    }
    assert "provided target locus" in response.message


def test_design_grna_rejects_short_sequence_gracefully():
    response = grna_design.design_grna(_construct_short_request())

    assert response.success is False
    assert response.grna_list == []
    assert response.sequence_length == 22
    assert "23 bp" in response.message


def test_summarize_off_target_record_uses_query_letters_for_identity():
    record = SimpleNamespace(
        query="grna_1",
        query_letters=23,
        alignments=[
            SimpleNamespace(
                accession="NC_000001.11",
                title="Homo sapiens chromosome 1",
                hsps=[
                    SimpleNamespace(
                        gaps=0,
                        align_length=23,
                        identities=23,
                    )
                ],
            ),
            SimpleNamespace(
                accession="NC_000012.12",
                title="Homo sapiens chromosome 12",
                hsps=[
                    SimpleNamespace(
                        gaps=0,
                        align_length=23,
                        identities=22,
                    )
                ],
            ),
        ],
    )

    payload = grna_design._summarize_off_target_record(record)

    assert payload["off_target_status"] == "validated"
    assert payload["potential_off_target_hits"] == 1
    assert payload["best_non_target_identity"] == round(22 / 23 * 100, 1)
    assert payload["off_target_risk"] == "High"
