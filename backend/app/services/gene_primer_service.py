import json
from typing import AsyncGenerator
from concurrent.futures import ThreadPoolExecutor
import asyncio

import primer3
from app.schemas.gene_primer import (
    GenePrimerRequest, GenePrimerResponse, ValidatedPrimerPair,
    PrimerMode, ExonViz, PrimerProperties, GeneInfo, PrimerDesignBasis,
)
from app.services.ncbi_fetch import fetch_transcript, fetch_gene_info, TranscriptInfo, ExonInfo, GeneInfoData
from app.services.primer_blast import blast_primer
from app.services.primer_bowtie2 import validate_primers_batch, primer_bowtie2_available
from app.services.primer_scoring import score_primer_pair, detect_exon_span

_executor = ThreadPoolExecutor(max_workers=4)
# BLAST 线程池：限制 6 并发，避免触发 NCBI 限速
_blast_executor = ThreadPoolExecutor(max_workers=6)

DEFAULT_NUM_CANDIDATES = 30
PRIMER3_SETTINGS = {
    "PRIMER_TASK": "generic",
    "PRIMER_PICK_LEFT_PRIMER": 1,
    "PRIMER_PICK_RIGHT_PRIMER": 1,
    "PRIMER_PICK_INTERNAL_OLIGO": 0,
    "PRIMER_MIN_SIZE": 18,
    "PRIMER_OPT_SIZE": 20,
    "PRIMER_MAX_SIZE": 25,
    "PRIMER_MIN_TM": 58.0,
    "PRIMER_OPT_TM": 60.0,
    "PRIMER_MAX_TM": 62.0,
    "PRIMER_MIN_GC": 40.0,
    "PRIMER_MAX_GC": 60.0,
    "PRIMER_PRODUCT_SIZE_RANGE": [[80, 200]],
    "PRIMER_MAX_POLY_X": 4,
    "PRIMER_MAX_SELF_ANY_TH": 45.0,
    "PRIMER_MAX_SELF_END_TH": 35.0,
    "PRIMER_MAX_HAIRPIN_TH": 24.0,
    "PRIMER_PAIR_MAX_COMPL_ANY_TH": 45.0,
    "PRIMER_PAIR_MAX_COMPL_END_TH": 35.0,
}


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _gc_clamp(seq: str) -> int:
    """计算引物 3' 端最后 5 bp 中 G/C 的数量。"""
    return sum(1 for b in seq[-5:].upper() if b in "GC")


def build_design_basis(
    transcript: TranscriptInfo | None,
    sequence_length: int,
    exon_count: int,
    candidate_pairs_designed: int,
    candidate_pairs_blasted: int,
    returned_pairs: int,
    species: str = "human",
) -> PrimerDesignBasis:
    product_min, product_max = PRIMER3_SETTINGS["PRIMER_PRODUCT_SIZE_RANGE"][0]
    use_bowtie2 = primer_bowtie2_available(species)
    return PrimerDesignBasis(
        template_source="ncbi_refseq_transcript" if transcript else "custom_sequence",
        design_region_start=1,
        design_region_end=sequence_length,
        cds_region_start=(transcript.cds_start + 1) if transcript else None,
        cds_region_end=transcript.cds_end if transcript else None,
        exon_count=exon_count,
        exon_spanning_preferred=exon_count > 1,
        primer_size_min=PRIMER3_SETTINGS["PRIMER_MIN_SIZE"],
        primer_size_opt=PRIMER3_SETTINGS["PRIMER_OPT_SIZE"],
        primer_size_max=PRIMER3_SETTINGS["PRIMER_MAX_SIZE"],
        tm_min=PRIMER3_SETTINGS["PRIMER_MIN_TM"],
        tm_opt=PRIMER3_SETTINGS["PRIMER_OPT_TM"],
        tm_max=PRIMER3_SETTINGS["PRIMER_MAX_TM"],
        gc_min=PRIMER3_SETTINGS["PRIMER_MIN_GC"],
        gc_max=PRIMER3_SETTINGS["PRIMER_MAX_GC"],
        product_min=product_min,
        product_max=product_max,
        max_poly_x=PRIMER3_SETTINGS["PRIMER_MAX_POLY_X"],
        max_self_any_th=PRIMER3_SETTINGS["PRIMER_MAX_SELF_ANY_TH"],
        max_self_end_th=PRIMER3_SETTINGS["PRIMER_MAX_SELF_END_TH"],
        max_hairpin_th=PRIMER3_SETTINGS["PRIMER_MAX_HAIRPIN_TH"],
        candidate_pairs_designed=candidate_pairs_designed,
        candidate_pairs_blasted=candidate_pairs_blasted,
        returned_pairs=returned_pairs,
        blast_database="genome_bowtie2" if use_bowtie2 else "refseq_rna",
        specificity_scope="reference_genome_bowtie2" if use_bowtie2 else "refseq_rna_transcripts",
        genome_wide_specificity_checked=use_bowtie2,
        off_target_identity_threshold=80.0,
    )


def _design_primers(sequence: str, num_candidates: int = DEFAULT_NUM_CANDIDATES) -> list[dict]:
    result = primer3.design_primers(
        {"SEQUENCE_ID": "target", "SEQUENCE_TEMPLATE": sequence},
        {**PRIMER3_SETTINGS, "PRIMER_NUM_RETURN": num_candidates},
    )
    pairs = []
    num = result.get("PRIMER_PAIR_NUM_RETURNED", 0)
    for i in range(num):
        left_pos = result[f"PRIMER_LEFT_{i}"]    # (start, length)
        right_pos = result[f"PRIMER_RIGHT_{i}"]  # (3'端位置, length)
        left_start = left_pos[0]
        left_len = left_pos[1]
        right_end = right_pos[0] + 1             # 3'端 +1 = 扩增子末尾
        amplicon = sequence[left_start:right_end]

        left_seq = result[f"PRIMER_LEFT_{i}_SEQUENCE"]
        right_seq = result[f"PRIMER_RIGHT_{i}_SEQUENCE"]

        pairs.append({
            "left": left_seq,
            "right": right_seq,
            "left_tm": round(result[f"PRIMER_LEFT_{i}_TM"], 2),
            "right_tm": round(result[f"PRIMER_RIGHT_{i}_TM"], 2),
            "left_gc": round(result[f"PRIMER_LEFT_{i}_GC_PERCENT"], 2),
            "right_gc": round(result[f"PRIMER_RIGHT_{i}_GC_PERCENT"], 2),
            "product_size": result[f"PRIMER_PAIR_{i}_PRODUCT_SIZE"],
            "penalty": round(result[f"PRIMER_PAIR_{i}_PENALTY"], 4),
            "amplicon_sequence": amplicon,
            "left_props": PrimerProperties(
                self_any_th=round(result.get(f"PRIMER_LEFT_{i}_SELF_ANY_TH", 0.0), 1),
                self_end_th=round(result.get(f"PRIMER_LEFT_{i}_SELF_END_TH", 0.0), 1),
                hairpin_th=round(result.get(f"PRIMER_LEFT_{i}_HAIRPIN_TH", 0.0), 1),
                gc_clamp=_gc_clamp(left_seq),
                pos=left_start,
                length=left_len,
            ),
            "right_props": PrimerProperties(
                self_any_th=round(result.get(f"PRIMER_RIGHT_{i}_SELF_ANY_TH", 0.0), 1),
                self_end_th=round(result.get(f"PRIMER_RIGHT_{i}_SELF_END_TH", 0.0), 1),
                hairpin_th=round(result.get(f"PRIMER_RIGHT_{i}_HAIRPIN_TH", 0.0), 1),
                gc_clamp=_gc_clamp(right_seq),
                pos=right_pos[0],
                length=right_pos[1],
            ),
        })
    return pairs


async def gene_primer_stream(req: GenePrimerRequest) -> AsyncGenerator[str, None]:
    loop = asyncio.get_running_loop()
    transcript: TranscriptInfo | None = None

    try:
        # ── 步骤 1：获取序列 + 基因信息 ──────────────────────────
        gene_info_data: GeneInfoData | None = None

        if req.mode == PrimerMode.gene:
            yield _sse("progress", {"step": 1, "total": 4, "msg": f"正在从 NCBI 获取 {req.gene_name} 转录本及基因信息..."})
            transcript, gene_info_data = await asyncio.gather(
                loop.run_in_executor(_executor, fetch_transcript, req.gene_name, req.species.value),
                loop.run_in_executor(_executor, fetch_gene_info, req.gene_name, req.species.value),
            )
            sequence = transcript.sequence
            exons = transcript.exons
            yield _sse("progress", {
                "step": 1, "total": 4,
                "msg": f"转录本：{transcript.transcript_id}（{len(sequence)} bp，{len(exons)} 个外显子，蛋白 {transcript.protein_length} aa）"
            })
        else:
            sequence = req.sequence.upper().strip()
            exons = [ExonInfo(index=0, start=0, end=len(sequence))]
            transcript = None
            yield _sse("progress", {"step": 1, "total": 4, "msg": f"使用自定义序列（{len(sequence)} bp）"})

        # ── 步骤 2：Primer3 设计候选引物，按 penalty 预排序，只取前 N 对 ──
        yield _sse("progress", {"step": 2, "total": 4, "msg": "Primer3 设计候选引物..."})
        candidates = await loop.run_in_executor(_executor, _design_primers, sequence, DEFAULT_NUM_CANDIDATES)
        if not candidates:
            yield _sse("error", {"msg": "Primer3 未能设计出引物，请检查序列长度（建议 > 200 bp）"})
            return
        candidate_pairs_designed = len(candidates)

        # 预筛：按 penalty 排序，只 BLAST 最优的 max_blast 对
        candidates.sort(key=lambda p: p["penalty"])
        max_blast = min(len(candidates), max(req.num_return * 2, 10))
        candidates = candidates[:max_blast]
        candidate_pairs_blasted = len(candidates)

        n_primers = len(candidates) * 2
        use_bowtie2 = primer_bowtie2_available(req.species.value)
        validation_engine = "Bowtie2 基因组比对" if use_bowtie2 else "NCBI BLAST"
        yield _sse("progress", {
            "step": 2, "total": 4,
            "msg": f"设计出 {len(candidates)} 对候选引物，提交 {n_primers} 条引物验证（{validation_engine}）..."
        })

        # ── 步骤 3：特异性验证 ────────────────────────────────────────
        yield _sse("progress", {
            "step": 3, "total": 4,
            "msg": f"特异性验证中（{validation_engine}，{n_primers} 条引物，请稍候）..."
        })

        if use_bowtie2:
            # 所有引物一次性送入 Bowtie2（单进程，~3s 完成全部）
            all_seqs = []
            for pair in candidates:
                all_seqs.append(pair["left"])
                all_seqs.append(pair["right"])
            try:
                blast_results = await asyncio.wait_for(
                    loop.run_in_executor(_blast_executor, validate_primers_batch, all_seqs, req.species.value),
                    timeout=60,
                )
            except asyncio.TimeoutError:
                yield _sse("error", {"msg": "Bowtie2 验证超时（>60s），请稍后重试"})
                return
        else:
            # 回退：并发 NCBI BLAST
            blast_tasks = []
            for pair in candidates:
                blast_tasks.append(loop.run_in_executor(_blast_executor, blast_primer, pair["left"], req.species.value))
                blast_tasks.append(loop.run_in_executor(_blast_executor, blast_primer, pair["right"], req.species.value))
            try:
                blast_results = await asyncio.wait_for(asyncio.gather(*blast_tasks), timeout=120)
            except asyncio.TimeoutError:
                yield _sse("error", {"msg": "BLAST 验证超时（>120s），NCBI 服务器响应缓慢，请稍后重试"})
                return

        # 评分
        validated = []
        for i, pair in enumerate(candidates):
            bl = blast_results[i * 2]
            br = blast_results[i * 2 + 1]

            exon_span = detect_exon_span(
                pair["left_props"].pos,
                pair["left_props"].length,
                pair["right_props"].pos,  # primer3 PRIMER_RIGHT_{i}[0] = 3'-end pos
                pair["right_props"].length,
                exons,
            )
            score = score_primer_pair(
                pair["left"], pair["right"],
                pair["left_tm"], pair["right_tm"],
                pair["left_gc"], pair["right_gc"],
                pair["product_size"], bl, br, exon_span,
            )

            validated.append(ValidatedPrimerPair(
                rank=0,
                left_primer=pair["left"],
                right_primer=pair["right"],
                left_tm=pair["left_tm"],
                right_tm=pair["right_tm"],
                left_gc=pair["left_gc"],
                right_gc=pair["right_gc"],
                product_size=pair["product_size"],
                penalty=pair["penalty"],
                blast_left=bl,
                blast_right=br,
                is_specific=bl.specific and br.specific,
                exon_span=exon_span,
                score=score,
                left_props=pair["left_props"],
                right_props=pair["right_props"],
                amplicon_sequence=pair["amplicon_sequence"],
            ))

        # ── 步骤 4：排序返回 ──────────────────────────────────────
        yield _sse("progress", {"step": 4, "total": 4, "msg": "按综合评分排序..."})

        validated.sort(key=lambda x: -x.score.total)
        top = validated[: req.num_return]
        for i, v in enumerate(top):
            v.rank = i + 1

        specific_n = sum(1 for v in top if v.is_specific)
        exon_n = sum(1 for v in top if v.exon_span.spans_junction)

        response = GenePrimerResponse(
            success=True,
            gene_name=req.gene_name,
            species=req.species.value,
            transcript_id=transcript.transcript_id if transcript else None,
            sequence_length=len(sequence),
            cds_start=transcript.cds_start if transcript else 0,
            cds_end=transcript.cds_end if transcript else len(sequence),
            exons=[ExonViz(index=e.index, start=e.start, end=e.end) for e in exons],
            design_basis=build_design_basis(
                transcript=transcript,
                sequence_length=len(sequence),
                exon_count=len(exons),
                candidate_pairs_designed=candidate_pairs_designed,
                candidate_pairs_blasted=candidate_pairs_blasted,
                returned_pairs=len(top),
                species=req.species.value,
            ),
            primer_pairs=top,
            gene_info=GeneInfo(
                gene_symbol=gene_info_data.gene_symbol,
                full_name=gene_info_data.full_name,
                summary=gene_info_data.summary,
                chromosome=gene_info_data.chromosome,
                map_location=gene_info_data.map_location,
                aliases=gene_info_data.aliases,
                organism=gene_info_data.organism,
                transcript_id=transcript.transcript_id,
                transcript_description=transcript.transcript_description,
                total_nm_found=transcript.total_nm_found,
                selection_reason=transcript.selection_reason,
                cds_length=transcript.cds_length,
                protein_length=transcript.protein_length,
                exon_count=len(transcript.exons),
            ) if gene_info_data and transcript else None,
            message=f"返回 {len(top)} 对引物（{specific_n} 对通过{'基因组 Bowtie2' if use_bowtie2 else 'RefSeq RNA BLAST'}特异性校验，{exon_n} 对跨外显子）",
        )
        yield _sse("result", response.model_dump())

    except ValueError as e:
        yield _sse("error", {"msg": str(e)})
    except asyncio.TimeoutError:
        yield _sse("error", {"msg": "请求超时，服务器响应缓慢，请稍后重试"})
    except Exception as e:
        yield _sse("error", {"msg": f"内部错误：{e}"})
