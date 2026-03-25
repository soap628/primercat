from pathlib import Path

from app.schemas.grna import CasType, GrnaResult, GrnaRiskLevel, TargetLocus
from app.services import grna_genome_offtarget
from app.services import grna_hit_annotation


def test_screen_grna_off_targets_falls_back_when_backend_is_unavailable(monkeypatch):
    guide = GrnaResult(
        rank=1,
        grna_sequence="G" * 20,
        pam="AGG",
        position=10,
        strand="+",
        gc_content=100.0,
        on_target_score=80.0,
        heuristic_risk=GrnaRiskLevel.low,
        guide_with_pam="G" * 20 + "AGG",
    )

    monkeypatch.setattr(grna_genome_offtarget.settings, "GRNA_OFFTARGET_BACKEND", "auto")
    monkeypatch.setattr(grna_genome_offtarget.settings, "GRNA_ENABLE_NT_BLAST_FALLBACK", True)
    monkeypatch.setattr(grna_genome_offtarget.settings, "GRNA_BOWTIE2_INDEX_HUMAN", "")
    monkeypatch.setattr(grna_genome_offtarget.settings, "GRNA_GENOME_FASTA_HUMAN", "")

    result = grna_genome_offtarget.screen_grna_off_targets(
        [guide],
        CasType.cas9,
        "human",
        target_locus=TargetLocus(accession="chr1", start=1, end=20),
        fallback_loader=lambda: [
            {
                "off_target_risk": None,
                "off_target_status": "error",
                "potential_off_target_hits": 0,
                "best_non_target_identity": 0.0,
                "top_off_target_hits": [],
                "off_target_message": "fallback",
            }
        ],
    )

    assert result.genome_wide_offtarget_checked is False
    assert result.off_target_engine == "ncbi_nt_blast"
    assert "No local genome index" in result.off_target_fallback_reason
    assert result.target_locus_anchor_status == "unavailable"


def test_parse_bowtie2_hits_extracts_position_strand_and_pam():
    fasta_path = Path(__file__).with_name("_mini_grna_genome.fa")
    guide = "ACGTACGTACGTACGTACGT"

    try:
        fasta_path.write_text(">chr1\nAAAAA" + guide + "AGGTTTT\n", encoding="utf-8")

        guide_result = GrnaResult(
            rank=1,
            grna_sequence=guide,
            pam="AGG",
            position=5,
            strand="+",
            gc_content=50.0,
            on_target_score=78.0,
            heuristic_risk=GrnaRiskLevel.low,
            guide_with_pam=guide + "AGG",
        )

        stdout = f"grna_1\t0\tchr1\t6\t42\t20M\t*\t0\t0\t{guide}\t*\tNM:i:0\n"
        payloads = grna_genome_offtarget._parse_bowtie2_hits(
            stdout=stdout,
            guides=[guide_result],
            cas_type=CasType.cas9,
            species="human",
            fasta_path=str(fasta_path),
        )
    finally:
        cached_index = grna_genome_offtarget._load_genome_index(str(fasta_path))
        close = getattr(cached_index, "close", None)
        if callable(close):
            close()
        grna_genome_offtarget._load_genome_index.cache_clear()
        fasta_path.unlink(missing_ok=True)

    assert payloads[0]["off_target_status"] == "validated"
    assert payloads[0]["top_off_target_hits"][0]["accession"] == "chr1"
    assert payloads[0]["top_off_target_hits"][0]["position"] == 6
    assert payloads[0]["top_off_target_hits"][0]["strand"] == "+"
    assert payloads[0]["top_off_target_hits"][0]["pam"] == "AGG"


def test_parse_bowtie2_hits_anchors_to_provided_locus():
    fasta_path = Path(__file__).with_name("_mini_grna_anchor.fa")
    guide = "ACGTACGTACGTACGTACGT"

    try:
        fasta_path.write_text(
            ">chr1\nAAAAA" + guide + "AGGTTTTAAAAAA" + guide + "AGGTTTT\n",
            encoding="utf-8",
        )

        guide_result = GrnaResult(
            rank=1,
            grna_sequence=guide,
            pam="AGG",
            position=5,
            strand="+",
            gc_content=50.0,
            on_target_score=78.0,
            heuristic_risk=GrnaRiskLevel.low,
            guide_with_pam=guide + "AGG",
        )

        stdout = "\n".join(
            [
                f"grna_1\t0\tchr1\t6\t42\t20M\t*\t0\t0\t{guide}\t*\tNM:i:0",
                f"grna_1\t0\tchr1\t39\t42\t20M\t*\t0\t0\t{guide}\t*\tNM:i:0",
            ]
        )
        payloads = grna_genome_offtarget._parse_bowtie2_hits(
            stdout=stdout,
            guides=[guide_result],
            cas_type=CasType.cas9,
            species="human",
            fasta_path=str(fasta_path),
            target_locus=TargetLocus(accession="chr1", start=1, end=25),
        )
    finally:
        cached_index = grna_genome_offtarget._load_genome_index(str(fasta_path))
        close = getattr(cached_index, "close", None)
        if callable(close):
            close()
        grna_genome_offtarget._load_genome_index.cache_clear()
        fasta_path.unlink(missing_ok=True)

    assert payloads[0]["off_target_status"] == "validated"
    assert payloads[0]["potential_off_target_hits"] == 1
    assert payloads[0]["target_locus_status"] == "matched"
    assert payloads[0]["top_off_target_hits"][0]["is_target_locus"] is True
    assert payloads[0]["top_off_target_hits"][1]["is_target_locus"] is False


def test_parse_bowtie2_hits_reports_missing_anchor_match():
    fasta_path = Path(__file__).with_name("_mini_grna_anchor_missing.fa")
    guide = "ACGTACGTACGTACGTACGT"

    try:
        fasta_path.write_text(">chr1\nAAAAA" + guide + "AGGTTTT\n", encoding="utf-8")

        guide_result = GrnaResult(
            rank=1,
            grna_sequence=guide,
            pam="AGG",
            position=5,
            strand="+",
            gc_content=50.0,
            on_target_score=78.0,
            heuristic_risk=GrnaRiskLevel.low,
            guide_with_pam=guide + "AGG",
        )

        stdout = f"grna_1\t0\tchr1\t6\t42\t20M\t*\t0\t0\t{guide}\t*\tNM:i:0\n"
        payloads = grna_genome_offtarget._parse_bowtie2_hits(
            stdout=stdout,
            guides=[guide_result],
            cas_type=CasType.cas9,
            species="human",
            fasta_path=str(fasta_path),
            target_locus=TargetLocus(accession="chr2", start=1, end=25),
        )
    finally:
        cached_index = grna_genome_offtarget._load_genome_index(str(fasta_path))
        close = getattr(cached_index, "close", None)
        if callable(close):
            close()
        grna_genome_offtarget._load_genome_index.cache_clear()
        fasta_path.unlink(missing_ok=True)

    assert payloads[0]["off_target_status"] == "anchor_missing"
    assert payloads[0]["target_locus_status"] == "no_match"
    assert payloads[0]["potential_off_target_hits"] == 1


def test_parse_bowtie2_hits_attaches_gene_context_annotations(monkeypatch):
    fasta_path = Path(__file__).with_name("_mini_grna_annotation.fa")
    gtf_path = Path(__file__).with_name("_mini_grna_annotation.gtf")
    guide = "ACGTACGTACGTACGTACGT"

    try:
        fasta_path.write_text(">chr1\nAAAAA" + guide + "AGGTTTT\n", encoding="utf-8")
        gtf_path.write_text(
            "\n".join(
                [
                    'chr1\tTest\tgene\t1\t60\t.\t+\t.\tgene_id "GENE1"; gene_name "TP53"; gene_biotype "protein_coding";',
                    'chr1\tTest\ttranscript\t1\t60\t.\t+\t.\tgene_id "GENE1"; transcript_id "NM_000546"; gene_name "TP53"; gene_biotype "protein_coding";',
                    'chr1\tTest\texon\t1\t60\t.\t+\t.\tgene_id "GENE1"; transcript_id "NM_000546"; gene_name "TP53"; gene_biotype "protein_coding";',
                    'chr1\tTest\tCDS\t5\t32\t.\t+\t0\tgene_id "GENE1"; transcript_id "NM_000546"; gene_name "TP53"; gene_biotype "protein_coding";',
                ]
            ),
            encoding="utf-8",
        )

        monkeypatch.setattr(grna_hit_annotation.settings, "GRNA_ANNOTATION_GTF_HUMAN", str(gtf_path))

        guide_result = GrnaResult(
            rank=1,
            grna_sequence=guide,
            pam="AGG",
            position=5,
            strand="+",
            gc_content=50.0,
            on_target_score=78.0,
            heuristic_risk=GrnaRiskLevel.low,
            guide_with_pam=guide + "AGG",
        )

        stdout = f"grna_1\t0\tchr1\t6\t42\t20M\t*\t0\t0\t{guide}\t*\tNM:i:0\n"
        payloads = grna_genome_offtarget._parse_bowtie2_hits(
            stdout=stdout,
            guides=[guide_result],
            cas_type=CasType.cas9,
            species="human",
            fasta_path=str(fasta_path),
        )
    finally:
        cached_index = grna_genome_offtarget._load_genome_index(str(fasta_path))
        close = getattr(cached_index, "close", None)
        if callable(close):
            close()
        grna_genome_offtarget._load_genome_index.cache_clear()
        grna_hit_annotation._load_annotation_index.cache_clear()
        fasta_path.unlink(missing_ok=True)
        gtf_path.unlink(missing_ok=True)

    annotation = payloads[0]["top_off_target_hits"][0]["annotation"]
    assert annotation is not None
    assert annotation["region"] == "cds"
    assert annotation["gene_symbol"] == "TP53"
    assert annotation["transcript_id"] == "NM_000546"


def test_annotate_genome_hit_marks_promoter_context(monkeypatch):
    gtf_path = Path(__file__).with_name("_mini_grna_promoter.gtf")

    try:
        gtf_path.write_text(
            "\n".join(
                [
                    'chr1\tTest\tgene\t2000\t2600\t.\t+\t.\tgene_id "GENE2"; gene_name "MYC"; gene_biotype "protein_coding";',
                    'chr1\tTest\ttranscript\t2000\t2600\t.\t+\t.\tgene_id "GENE2"; transcript_id "NM_002467"; gene_name "MYC"; gene_biotype "protein_coding";',
                    'chr1\tTest\texon\t2000\t2600\t.\t+\t.\tgene_id "GENE2"; transcript_id "NM_002467"; gene_name "MYC"; gene_biotype "protein_coding";',
                ]
            ),
            encoding="utf-8",
        )

        monkeypatch.setattr(grna_hit_annotation.settings, "GRNA_ANNOTATION_GTF_HUMAN", str(gtf_path))
        monkeypatch.setattr(grna_hit_annotation.settings, "GRNA_PROMOTER_WINDOW_BP", 500)

        annotation = grna_hit_annotation.annotate_genome_hit("human", "chr1", 1700, 1719)
    finally:
        grna_hit_annotation._load_annotation_index.cache_clear()
        gtf_path.unlink(missing_ok=True)

    assert annotation is not None
    assert annotation.region == "promoter"
    assert annotation.gene_symbol == "MYC"
    assert annotation.distance_to_tss == 281
