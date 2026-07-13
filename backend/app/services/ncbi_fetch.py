from Bio.SeqRecord import SeqRecord
from dataclasses import dataclass

from app.services.ncbi_client import cached_call, entrez_esearch, entrez_esummary, entrez_fetch_genbank_records

SPECIES_ORGANISM = {
    "human": "Homo sapiens",
    "mouse": "Mus musculus",
}


@dataclass
class ExonInfo:
    index: int
    start: int
    end: int


@dataclass
class TranscriptInfo:
    transcript_id: str
    transcript_description: str   # GenBank 记录标题
    gene_name: str
    species: str
    sequence: str
    cds_start: int
    cds_end: int
    exons: list[ExonInfo]
    cds_length: int = 0           # CDS 长度（bp）
    protein_length: int = 0       # 蛋白质长度（aa）
    total_nm_found: int = 0       # 搜索到的 NM_ 数量
    selection_reason: str = ""    # 转录本选择依据


@dataclass
class GeneInfoData:
    gene_symbol: str
    full_name: str
    summary: str
    chromosome: str
    map_location: str
    aliases: str
    organism: str


def _is_mane_select(record: SeqRecord) -> bool:
    """Return True if any CDS feature on this record carries a MANE Select tag."""
    for feat in record.features:
        if feat.type != "CDS":
            continue
        note = " ".join(feat.qualifiers.get("note", []))
        tag = " ".join(feat.qualifiers.get("tag", []))
        if "MANE Select" in note or "MANE Select" in tag:
            return True
    return False


def _pick_best_transcript(records: list[SeqRecord]) -> tuple[SeqRecord, str]:
    """
    选取最佳转录本，优先级：
    1. MANE Select（人类基因组官方标准转录本，NCBI/Ensembl 联合认定）
    2. NM_ RefSeq 编码转录本中 CDS 最长的
    3. 所有记录中 CDS 最长的（兜底）
    返回 (record, selection_reason)
    """
    def cds_length(r: SeqRecord) -> int:
        for feat in r.features:
            if feat.type == "CDS":
                return len(feat.location)
        return 0

    mane_records = [r for r in records if _is_mane_select(r)]
    if mane_records:
        best = max(mane_records, key=cds_length)
        reason = f"选取 MANE Select 转录本（NCBI/Ensembl 联合认定，CDS {cds_length(best)} bp）"
        return best, reason

    nm_records = [r for r in records if r.id.startswith("NM_")]
    if nm_records:
        best = max(nm_records, key=cds_length)
        reason = f"从 {len(nm_records)} 条 NM_ RefSeq 编码转录本中选取 CDS 最长的（{cds_length(best)} bp）"
    else:
        best = max(records, key=cds_length)
        reason = f"未找到 NM_ 转录本，从 {len(records)} 条记录中选取 CDS 最长的"

    return best, reason


def _extract_exons(record: SeqRecord, seq_offset: int = 0) -> list[ExonInfo]:
    exons = []
    for feat in record.features:
        if feat.type == "exon":
            start = int(feat.location.start) - seq_offset
            end = int(feat.location.end) - seq_offset
            if start >= 0:
                exons.append(ExonInfo(index=len(exons), start=start, end=end))
    return exons


def _extract_cds(record: SeqRecord, seq_offset: int = 0) -> tuple[int, int]:
    for feat in record.features:
        if feat.type == "CDS":
            s = int(feat.location.start) - seq_offset
            e = int(feat.location.end) - seq_offset
            return max(0, s), e
    return 0, len(str(record.seq))


def fetch_gene_info(gene_name: str, species: str) -> GeneInfoData:
    """
    从 NCBI Gene 数据库获取基因官方信息。
    数据来源：NCBI Gene (https://www.ncbi.nlm.nih.gov/gene)
    """
    normalized_gene = gene_name.strip()
    organism = SPECIES_ORGANISM.get(species, "Homo sapiens")

    def _load() -> GeneInfoData:
        query = f"{normalized_gene}[Gene Name] AND {organism}[Organism] AND alive[prop]"
        search_result = entrez_esearch(db="gene", term=query, retmax=5)

        ids = search_result.get("IdList", [])
        if not ids:
            return GeneInfoData(
                gene_symbol=normalized_gene,
                full_name="",
                summary="暂无摘要",
                chromosome="",
                map_location="",
                aliases="",
                organism=organism,
            )

        summary_result = entrez_esummary(db="gene", id=ids[0])
        doc = summary_result.get("DocumentSummarySet", {}).get("DocumentSummary", [{}])[0]

        full_name = str(doc.get("Description", "")) or str(doc.get("NomenclatureName", ""))
        summary = str(doc.get("Summary", "")) or "暂无功能摘要"
        chromosome = str(doc.get("Chromosome", ""))
        map_location = str(doc.get("MapLocation", ""))
        aliases = str(doc.get("OtherAliases", ""))

        return GeneInfoData(
            gene_symbol=normalized_gene,
            full_name=full_name,
            summary=summary,
            chromosome=chromosome,
            map_location=map_location,
            aliases=aliases,
            organism=organism,
        )

    return cached_call("gene_info", normalized_gene.upper(), species, loader=_load)


def fetch_transcript(gene_name: str, species: str) -> TranscriptInfo:
    """
    根据基因名和物种获取最佳转录本（含外显子坐标）。
    数据来源：NCBI RefSeq (https://www.ncbi.nlm.nih.gov/refseq)
    """
    normalized_gene = gene_name.strip()
    organism = SPECIES_ORGANISM.get(species, "Homo sapiens")

    def _load() -> TranscriptInfo:
        query = f"{normalized_gene}[Gene Name] AND {organism}[Organism] AND mRNA[Filter] AND RefSeq[Filter]"
        record = entrez_esearch(db="nucleotide", term=query, retmax=10, sort="relevance")

        ids = record.get("IdList", [])
        if not ids:
            fallback_query = f"{normalized_gene}[Title] AND {organism}[Organism] AND mRNA[Filter]"
            record = entrez_esearch(db="nucleotide", term=fallback_query, retmax=10)
            ids = record.get("IdList", [])

        if not ids:
            raise ValueError(f"未找到 {organism} 的基因 {normalized_gene}，请检查基因名称")

        gb_records = entrez_fetch_genbank_records(
            db="nucleotide",
            id=",".join(ids[:5]),
            rettype="gb",
            retmode="text",
        )
        if not gb_records:
            raise ValueError(f"无法获取 {normalized_gene} 的序列数据")

        nm_count = sum(1 for r in gb_records if r.id.startswith("NM_"))
        best, selection_reason = _pick_best_transcript(gb_records)
        full_seq = str(best.seq).upper()

        # 提取 CDS 信息
        cds_s, cds_e = _extract_cds(best, 0)
        cds_bp = cds_e - cds_s
        protein_aa = max(0, (cds_bp - 3) // 3)  # 减去终止密码子

        # 截取 CDS ±200bp（最多 3000bp）
        region_start = max(0, cds_s - 200)
        region_end = min(len(full_seq), cds_e + 200, region_start + 3000)
        sequence = full_seq[region_start:region_end]

        exons = _extract_exons(best, seq_offset=region_start)
        exons = [e for e in exons if e.start >= 0 and e.end <= len(sequence)]
        if not exons:
            exons = [ExonInfo(index=0, start=0, end=len(sequence))]

        # 转录本描述（取 GenBank description 的第一句）
        description = best.description or ""
        if "," in description:
            description = description.split(",")[0].strip()
        if len(description) > 100:
            description = description[:97] + "..."

        return TranscriptInfo(
            transcript_id=best.id,
            transcript_description=description,
            gene_name=normalized_gene,
            species=species,
            sequence=sequence,
            cds_start=max(0, cds_s - region_start),
            cds_end=min(len(sequence), cds_e - region_start),
            exons=exons,
            cds_length=cds_bp,
            protein_length=protein_aa,
            total_nm_found=nm_count,
            selection_reason=selection_reason,
        )

    return cached_call("transcript", normalized_gene.upper(), species, loader=_load)
