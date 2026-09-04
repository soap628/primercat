"use client";

import { useState } from "react";

export type ToolInfoContent = {
  methodTitle: string;
  methodSteps: { title: string; body: string }[];
  boundaryTitle: string;
  boundaryBody: string;
  trustTitle: string;
  trustGoodTitle: string;
  trustGood: string[];
  trustCareTitle: string;
  trustCare: string[];
  sources: string[];
};

const CONTENT: Record<"qpcr" | "crispr" | "blast", Record<"zh" | "en", ToolInfoContent>> = {
  qpcr: {
    zh: {
      methodTitle: "四步工作流",
      methodSteps: [
        {
          title: "1. 按规则选择参考转录本",
          body: "实时查询 NCBI RefSeq，筛选 NM_ 编码转录本，并按 CDS 完整性和外显子数等规则选择设计模板。",
        },
        {
          title: "2. Primer3 生成候选引物",
          body: "基于转录本序列，在 Tm、GC%、产物长度、发卡和自互补约束下生成候选引物，按 penalty 预筛选。",
        },
        {
          title: "3. RefSeq RNA BLAST 筛查",
          body: "候选引物并发提交至 NCBI BLAST refseq_rna 数据库，检查转录本层面非目标命中，过滤不理想候选。",
        },
        {
          title: "4. 分项状态与候选排序",
          body: "分别展示序列参数、特异性证据和跨外显子状态，再按五项透明规则排列候选；排序数字不代表实验成功率。",
        },
      ],
      boundaryTitle: "范围边界",
      boundaryBody:
        "RefSeq RNA BLAST 提升的是转录本层面的可信度，不等同于全基因组 PCR 特异性验证。正式实验前建议结合更高层级的 in-silico 分析或湿实验确认。",
      trustTitle: "可信度说明",
      trustGoodTitle: "当前结果已提供",
      trustGood: [
        "按公开规则选择物种对应的 RefSeq 参考转录本",
        "结果页展示设计依据、筛查状态、扩增子和推荐理由",
        "BLAST 失败不会被误报为通过特异性验证",
        "转录本层面证据与全基因组结论明确区分",
      ],
      trustCareTitle: "仍需用户确认",
      trustCare: [
        "RefSeq RNA BLAST 不等同于全基因组 PCR 特异性验证",
        "正式实验前建议结合湿实验或更严格的 in-silico 分析",
      ],
      sources: [
        "NCBI RefSeq — 转录本和模板序列",
        "Primer3 — 引物设计算法",
        "NCBI BLAST refseq_rna — 转录本层面筛查",
      ],
    },
    en: {
      methodTitle: "Four-step workflow",
      methodSteps: [
        {
          title: "1. Select a reference transcript by rule",
          body: "Queries NCBI RefSeq in real time, filters NM_ protein-coding transcripts, and selects a design template using CDS completeness, exon count, and related rules.",
        },
        {
          title: "2. Generate candidates with Primer3",
          body: "Runs Primer3 on the transcript sequence under Tm, GC%, product size, hairpin, and self-complementarity constraints, pre-filtering by penalty score.",
        },
        {
          title: "3. RefSeq RNA BLAST screening",
          body: "Submits all candidates concurrently to NCBI BLAST refseq_rna, screening for transcript-level off-target hits before final ranking.",
        },
        {
          title: "4. Separate status, rank, and explain",
          body: "Shows sequence parameters, specificity evidence, and exon-spanning status separately, then orders candidates with five transparent rules. The rank value is not an experimental success probability.",
        },
      ],
      boundaryTitle: "Scope boundary",
      boundaryBody:
        "RefSeq RNA BLAST improves transcript-level confidence. It is not genome-wide PCR specificity validation. Formal experimental use should include stronger in-silico checks or wet-lab validation.",
      trustTitle: "Trust statement",
      trustGoodTitle: "What the result provides",
      trustGood: [
        "Selects a species-specific RefSeq reference transcript using stated rules",
        "Result page shows design basis, BLAST status, amplicon, and ranking rationale",
        "BLAST failures are never reported as specificity passes",
        "Transcript-level evidence and genome-wide claims are explicitly separated",
      ],
      trustCareTitle: "What still needs user verification",
      trustCare: [
        "RefSeq RNA BLAST is not genome-wide PCR specificity validation",
        "Formal use should include wet-lab or stronger in-silico validation",
      ],
      sources: [
        "NCBI RefSeq — transcript and template sequences",
        "Primer3 — primer design algorithm",
        "NCBI BLAST refseq_rna — transcript-level screening",
      ],
    },
  },
  crispr: {
    zh: {
      methodTitle: "CRISPR gRNA 设计流程",
      methodSteps: [
        {
          title: "1. PAM 位点扫描",
          body: "在目标序列上扫描所选 Cas 蛋白对应的 PAM 位点（SpCas9: NGG；Cas12a: TTTV；SpCas9-NG: NG），提取所有候选 spacer 序列。",
        },
        {
          title: "2. 活性评分",
          body: "使用简化的序列特征模型估算每条 gRNA 的相对活性，综合位置碱基权重、GC 含量、seed 区特征和多聚碱基风险。",
        },
        {
          title: "3. 脱靶风险分层",
          body: "配置本地索引时使用 Bowtie2 进行参考基因组筛查；否则回退至物种限定的 NCBI nt BLAST。结果按命中数和相似度分层，并标注实际使用的后端。",
        },
        {
          title: "4. 排序与展示",
          body: "综合活性分和脱靶风险给出最终排序，结果附带 PAM 上下文、Cas 类型和风险等级标注。",
        },
      ],
      boundaryTitle: "范围边界",
      boundaryBody:
        "脱靶评估基于计算预测，不等同于实验验证的脱靶图谱（如 GUIDE-seq、CIRCLE-seq）。高风险等级的 gRNA 应在实验前进行更严格的验证，建议结合细胞系功能实验确认切割效率。",
      trustTitle: "可信度说明",
      trustGoodTitle: "当前结果已提供",
      trustGood: [
        "支持 SpCas9、Cas12a、SpCas9-NG 三种 Cas 蛋白",
        "活性评分使用明确的序列特征规则，而非随机排序",
        "脱靶风险分三档标注，不会模糊化为单一分数",
        "PAM 上下文和 spacer 序列完整展示，可供用户自行核查",
      ],
      trustCareTitle: "仍需用户确认",
      trustCare: [
        "活性评分为计算预测，实际切割效率受细胞类型和染色质状态影响",
        "脱靶风险为统计估计，不能替代 GUIDE-seq 等实验验证手段",
        "目前仅支持人类和小鼠基因组参考序列",
      ],
      sources: [
        "NCBI RefSeq — 目标序列与转录本信息",
        "简化位置权重与序列特征规则 — 活性排序",
        "Bowtie2 本地索引或 NCBI nt BLAST — 脱靶初筛",
      ],
    },
    en: {
      methodTitle: "CRISPR gRNA design workflow",
      methodSteps: [
        {
          title: "1. PAM site scanning",
          body: "Scans the target sequence for PAM sites matching the selected Cas protein (SpCas9: NGG; Cas12a: TTTV; SpCas9-NG: NG) and extracts all candidate spacer sequences.",
        },
        {
          title: "2. Activity scoring",
          body: "Estimates relative guide activity with a simplified sequence-feature model using position-specific nucleotide weights, GC content, seed-region features, and homopolymer risk.",
        },
        {
          title: "3. Off-target risk stratification",
          body: "Uses Bowtie2 against a local reference-genome index when configured; otherwise it falls back to species-filtered NCBI nt BLAST. Risk tiers use returned hit counts and identity, and the active backend is labeled.",
        },
        {
          title: "4. Ranking and display",
          body: "Produces a final ranking combining activity score and off-target risk, displayed with PAM context, Cas type, and risk tier annotations.",
        },
      ],
      boundaryTitle: "Scope boundary",
      boundaryBody:
        "Off-target assessment is computational and not equivalent to experimental off-target profiling methods (e.g., GUIDE-seq, CIRCLE-seq). High-risk gRNAs should undergo more rigorous validation before use. Functional cell-line experiments are recommended to confirm cleavage efficiency.",
      trustTitle: "Trust statement",
      trustGoodTitle: "What the result provides",
      trustGood: [
        "Supports SpCas9, Cas12a, and SpCas9-NG",
        "Activity scoring uses explicit sequence-feature rules rather than arbitrary ranking",
        "Off-target risk is presented in three labeled tiers, not collapsed into a single score",
        "Full PAM context and spacer sequences are shown for manual review",
      ],
      trustCareTitle: "What still needs user verification",
      trustCare: [
        "Activity scores are computational; actual cleavage efficiency depends on cell type and chromatin state",
        "Off-target risk is a statistical estimate — not a substitute for GUIDE-seq or similar assays",
        "Currently supports human and mouse reference genomes only",
      ],
      sources: [
        "NCBI RefSeq — target sequences and transcript information",
        "Simplified position-weight and sequence-feature rules — activity ranking",
        "Local Bowtie2 index or NCBI nt BLAST — off-target screening",
      ],
    },
  },
  blast: {
    zh: {
      methodTitle: "BLAST 比对流程",
      methodSteps: [
        {
          title: "1. 序列预处理",
          body: "去除 FASTA 头行和空白字符，提取纯序列后根据所选程序类型（核酸/蛋白）做基本格式校验。",
        },
        {
          title: "2. 提交至 NCBI BLAST",
          body: "通过 NCBI QBlast API 提交比对任务，支持 blastn、blastp、blastx、tblastn 四种程序和多个数据库（nt、nr、refseq_rna、swissprot 等）。",
        },
        {
          title: "3. 轮询与结果解析",
          body: "等待 NCBI 返回结果后解析 XML 输出，提取每个 hit 的 accession、标题、比分、E-value、一致性百分比和比对区域。",
        },
        {
          title: "4. 结果展示",
          body: "按 bit score 降序列出所有命中，展示最佳 HSP 的对齐序列、得分和 E-value，点击可展开查看完整比对块。",
        },
      ],
      boundaryTitle: "范围边界",
      boundaryBody:
        "比对结果受所选数据库版本和 E-value 阈值影响。较大的 E-value 会引入更多低可信度命中。结果仅反映与已知数据库序列的相似性，不代表功能或进化关系的最终结论。",
      trustTitle: "可信度说明",
      trustGoodTitle: "当前结果已提供",
      trustGood: [
        "通过 NCBI QBlast API 提交查询",
        "展示原始比对块（query/midline/subject），可供用户自行核查",
        "E-value 和 bit score 均为标准统计量，含义明确",
        "支持多程序和多数据库组合，适合不同序列类型",
      ],
      trustCareTitle: "仍需用户确认",
      trustCare: [
        "结果受数据库版本和更新时间影响，近期新增序列可能未被收录",
        "高 E-value 命中（> 0.01）通常可信度低，需谨慎解读",
        "序列相似性不等于功能同源性，需结合文献和实验确认",
      ],
      sources: [
        "NCBI QBlast API — 远程 BLAST 服务",
        "NCBI nt / nr / refseq_rna / swissprot — 比对数据库",
      ],
    },
    en: {
      methodTitle: "BLAST alignment workflow",
      methodSteps: [
        {
          title: "1. Sequence preprocessing",
          body: "Strips FASTA header lines and whitespace, extracts the raw sequence, and performs basic format validation based on the selected program type (nucleotide or protein).",
        },
        {
          title: "2. Submit to NCBI BLAST",
          body: "Submits the alignment job via the NCBI QBlast API, supporting blastn, blastp, blastx, and tblastn against multiple databases (nt, nr, refseq_rna, swissprot, etc.).",
        },
        {
          title: "3. Poll and parse results",
          body: "Polls for completion and parses the XML output, extracting accession, title, bit score, E-value, identity percentage, and alignment region for each hit.",
        },
        {
          title: "4. Display results",
          body: "Lists all hits sorted by bit score, showing the best HSP alignment, score, and E-value. Click any hit to expand the full alignment block.",
        },
      ],
      boundaryTitle: "Scope boundary",
      boundaryBody:
        "Results depend on the selected database version and E-value threshold. Higher E-values introduce more low-confidence hits. Results reflect similarity to known database sequences only and do not represent final conclusions about function or evolutionary relationships.",
      trustTitle: "Trust statement",
      trustGoodTitle: "What the result provides",
      trustGood: [
        "Submits queries through the NCBI QBlast API",
        "Shows raw alignment blocks (query / midline / subject) for manual inspection",
        "E-value and bit score are standard statistical measures with clear interpretations",
        "Supports multiple program and database combinations for different sequence types",
      ],
      trustCareTitle: "What still needs user judgment",
      trustCare: [
        "Results depend on database version — recently deposited sequences may be missing",
        "High E-value hits (> 0.01) are generally low-confidence and should be interpreted carefully",
        "Sequence similarity does not imply functional homology — literature and experiments are needed",
      ],
      sources: [
        "NCBI QBlast API — remote BLAST service",
        "NCBI nt / nr / refseq_rna / swissprot — alignment databases",
      ],
    },
  },
};

export default function ToolInfoPanel({
  tool,
  locale,
}: {
  tool: "qpcr" | "crispr" | "blast";
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"method" | "trust">("method");
  const lang = locale === "zh" ? "zh" : "en";
  const c = CONTENT[tool][lang];

  const accentColor =
    tool === "qpcr" ? "#A31F34" : tool === "crispr" ? "#16a34a" : "#6d28d9";
  const accentSoft =
    tool === "qpcr"
      ? "rgba(163,31,52,0.07)"
      : tool === "crispr"
      ? "rgba(22,163,74,0.07)"
      : "rgba(109,40,217,0.07)";

  const toggleLabel =
    lang === "zh"
      ? open
        ? "收起方法与可信度"
        : "方法与可信度说明"
      : open
      ? "Hide methods & trust"
      : "Methods & trust";

  return (
    <div style={{ marginTop: 32 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: `1px solid ${open ? accentColor : "var(--border-mid)"}`,
          borderRadius: 10,
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 600,
          color: open ? accentColor : "var(--text-2)",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "none" }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {toggleLabel}
      </button>

      {open && (
        <div
          style={{
            marginTop: 12,
            borderRadius: 18,
            border: "1px solid var(--border)",
            overflow: "hidden",
            background: "var(--bg-card, #fff)",
            boxShadow: "0 4px 16px rgba(15,23,42,0.06)",
          }}
        >
          {/* Tab strip */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg-inset, #f8fafc)",
            }}
          >
            {(["method", "trust"] as const).map((t) => {
              const label =
                t === "method"
                  ? lang === "zh"
                    ? "工作原理"
                    : "How It Works"
                  : lang === "zh"
                  ? "可信度"
                  : "Trust";
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "12px 20px",
                    fontSize: 13,
                    fontWeight: 600,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: tab === t ? accentColor : "var(--text-3)",
                    borderBottom: tab === t ? `2px solid ${accentColor}` : "2px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div style={{ padding: "20px 24px" }}>
            {tab === "method" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>
                  {c.methodTitle}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  {c.methodSteps.map((step) => (
                    <div
                      key={step.title}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 12,
                        background: accentSoft,
                        border: `1px solid ${accentColor}22`,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>
                        {step.title}
                      </div>
                      <p style={{ fontSize: 12, lineHeight: 1.75, color: "var(--text-2)", margin: 0 }}>
                        {step.body}
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "rgba(245,158,11,0.07)",
                    border: "1px solid rgba(245,158,11,0.2)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#b45309", marginBottom: 6 }}>
                    {c.boundaryTitle}
                  </div>
                  <p style={{ fontSize: 12, lineHeight: 1.75, color: "var(--text-2)", margin: 0 }}>
                    {c.boundaryBody}
                  </p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {c.sources.map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 20,
                        background: "var(--bg-inset, #f1f5f9)",
                        color: "var(--text-3)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {tab === "trust" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>
                  {c.trustTitle}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "rgba(22,163,74,0.06)",
                      border: "1px solid rgba(22,163,74,0.18)",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#15803d", marginBottom: 10 }}>
                      {c.trustGoodTitle}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {c.trustGood.map((item) => (
                        <div
                          key={item}
                          style={{
                            fontSize: 12,
                            lineHeight: 1.7,
                            color: "var(--text-2)",
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: "rgba(255,255,255,0.7)",
                            border: "1px solid rgba(22,163,74,0.1)",
                          }}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "rgba(245,158,11,0.06)",
                      border: "1px solid rgba(245,158,11,0.18)",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#b45309", marginBottom: 10 }}>
                      {c.trustCareTitle}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {c.trustCare.map((item) => (
                        <div
                          key={item}
                          style={{
                            fontSize: 12,
                            lineHeight: 1.7,
                            color: "var(--text-2)",
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: "rgba(255,255,255,0.7)",
                            border: "1px solid rgba(245,158,11,0.1)",
                          }}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
