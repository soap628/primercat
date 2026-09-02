import { AcademicHeader, AcademicSection, Cite, ReferenceList, type AcademicReference } from "@/components/AcademicDocument";
import { Link } from "@/navigation";

const REFERENCES: AcademicReference[] = [
  { id: 1, authors: "Morales J, et al.", year: "2022", title: "A joint NCBI and EMBL-EBI transcript set for clinical genomics and research", journal: "Nature", detail: "604:310–315.", doi: "10.1038/s41586-022-04558-8", href: "https://pubmed.ncbi.nlm.nih.gov/35388217/" },
  { id: 2, authors: "O’Leary NA, et al.", year: "2016", title: "Reference sequence (RefSeq) database at NCBI: current status, taxonomic expansion, and functional annotation", journal: "Nucleic Acids Research", detail: "44:D733–D745.", doi: "10.1093/nar/gkv1189", href: "https://pubmed.ncbi.nlm.nih.gov/26553804/" },
  { id: 3, authors: "Untergasser A, et al.", year: "2012", title: "Primer3—new capabilities and interfaces", journal: "Nucleic Acids Research", detail: "40:e115.", doi: "10.1093/nar/gks596", href: "https://pubmed.ncbi.nlm.nih.gov/22730293/" },
  { id: 4, authors: "Ye J, et al.", year: "2012", title: "Primer-BLAST: a tool to design target-specific primers for polymerase chain reaction", journal: "BMC Bioinformatics", detail: "13:134.", doi: "10.1186/1471-2105-13-134", href: "https://pubmed.ncbi.nlm.nih.gov/22708584/" },
  { id: 5, authors: "Langmead B, Salzberg SL.", year: "2012", title: "Fast gapped-read alignment with Bowtie 2", journal: "Nature Methods", detail: "9:357–359.", doi: "10.1038/nmeth.1923", href: "https://pubmed.ncbi.nlm.nih.gov/22388286/" },
  { id: 6, authors: "Camacho C, et al.", year: "2009", title: "BLAST+: architecture and applications", journal: "BMC Bioinformatics", detail: "10:421.", doi: "10.1186/1471-2105-10-421", href: "https://pubmed.ncbi.nlm.nih.gov/20003500/" },
  { id: 7, authors: "Doench JG, et al.", year: "2016", title: "Optimized sgRNA design to maximize activity and minimize off-target effects of CRISPR-Cas9", journal: "Nature Biotechnology", detail: "34:184–191.", doi: "10.1038/nbt.3437", href: "https://pubmed.ncbi.nlm.nih.gov/26780180/" },
  { id: 8, authors: "Hsu PD, et al.", year: "2013", title: "DNA targeting specificity of RNA-guided Cas9 nucleases", journal: "Nature Biotechnology", detail: "31:827–832.", doi: "10.1038/nbt.2647", href: "https://pubmed.ncbi.nlm.nih.gov/23873081/" },
  { id: 9, authors: "Nishimasu H, et al.", year: "2018", title: "Engineered CRISPR-Cas9 nuclease with expanded targeting space", journal: "Science", detail: "361:1259–1262.", doi: "10.1126/science.aas9129", href: "https://pubmed.ncbi.nlm.nih.gov/30166441/" },
  { id: 10, authors: "Zetsche B, et al.", year: "2015", title: "Cpf1 is a single RNA-guided endonuclease of a class 2 CRISPR-Cas system", journal: "Cell", detail: "163:759–771.", doi: "10.1016/j.cell.2015.09.038", href: "https://pubmed.ncbi.nlm.nih.gov/26422227/" },
  { id: 11, authors: "Bustin SA, et al.", year: "2025", title: "MIQE 2.0: Revision of the Minimum Information for Publication of Quantitative Real-Time PCR Experiments Guidelines", journal: "Clinical Chemistry", detail: "71:634–651.", doi: "10.1093/clinchem/hvaf043", href: "https://pubmed.ncbi.nlm.nih.gov/40272429/" },
  { id: 12, authors: "Kim S, et al.", year: "2025", title: "PubChem 2025 update", journal: "Nucleic Acids Research", detail: "53:D1516–D1525.", doi: "10.1093/nar/gkae1059", href: "https://pubmed.ncbi.nlm.nih.gov/39558165/" },
  { id: 13, authors: "NCBI RefSeq", year: "2025", title: "Homo sapiens genome assembly GRCh38.p14", journal: "NCBI Datasets", detail: "RefSeq assembly GCF_000001405.40.", href: "https://www.ncbi.nlm.nih.gov/datasets/genome/GCF_000001405.40/" },
  { id: 14, authors: "NCBI RefSeq", year: "2025", title: "Homo sapiens Annotation Release GCF_000001405.40-RS_2025_08", journal: "NCBI Eukaryotic Genome Annotation", detail: "GRCh38.p14 RefSeq annotation report.", href: "https://www.ncbi.nlm.nih.gov/refseq/annotation_euk/Homo_sapiens/GCF_000001405.40-RS_2025_08/" },
  { id: 15, authors: "NCBI RefSeq", year: "2024", title: "Mus musculus genome assembly GRCm39", journal: "NCBI Datasets", detail: "RefSeq assembly GCF_000001635.27.", href: "https://www.ncbi.nlm.nih.gov/datasets/genome/GCF_000001635.27/" },
  { id: 16, authors: "NCBI RefSeq", year: "2024", title: "Mus musculus Annotation Release GCF_000001635.27-RS_2024_02", journal: "NCBI Eukaryotic Genome Annotation", detail: "GRCm39 RefSeq annotation report.", href: "https://www.ncbi.nlm.nih.gov/refseq/annotation_euk/Mus_musculus/GCF_000001635.27-RS_2024_02/" },
];

const COPY = {
  zh: {
    eyebrow: "PRIMERCAT · 方法学说明", title: "计算方法、参数与适用范围", abstractLabel: "摘要",
    abstract: "本文档说明 PrimerCat 如何选择参考序列、生成候选、执行数据库筛查并形成排序。所有阈值均对应当前实现；计算评分只用于候选间比较，不表示实验成功概率。",
    meta: ["文档版本 1.2", "更新：2026-09-03", "适用：PrimerCat Web"], asideTitle: "阅读约定",
    aside: "“设计”指按约束生成候选；“筛查”指在明确数据库与阈值下寻找相似命中；二者均不等于实验验证。",
    tocTitle: "本文目录",
    toc: [["01", "输入与参考序列", "inputs"], ["02", "qPCR 引物", "qpcr"], ["03", "常规 PCR 引物", "pcr"], ["04", "CRISPR gRNA", "crispr"], ["05", "BLAST 比对", "blast"], ["06", "实验室参考资料", "reference-data"], ["REF", "参考文献", "references"]],
    scopeTitle: "输入与参考序列", scopeLead: "模板选择决定后续所有坐标、候选和筛查结论，因此 PrimerCat 把所用 accession 与选择理由作为结果的一部分。",
    templateTitle: "基因名称模式", templateBody: "PrimerCat 当前支持人和小鼠。PrimerCat 在 NCBI Nucleotide 中检索 RefSeq mRNA，优先选择检索记录中的 MANE Select；若无 MANE Select，则在 NM_ 编码转录本中选择 CDS 最长者。设计窗口为 CDS 上下游各延伸 200 bp，并限制在 3,000 bp 内。",
    templateLimit: "该规则只作用于本次实际取回的记录（最多检索 10 个 ID、读取前 5 条 GenBank 记录），不是对该基因全部异构体的穷尽比较。小鼠记录通常没有 MANE Select，因此更多依赖 CDS 长度回退规则。",
    customTitle: "自定义序列模式", customBody: "输入序列经过去空白、转大写与字符检查。qPCR/PCR 允许 A、C、G、T、N；N 比例超过 10% 时拒绝设计。CRISPR 直接在提供的 DNA 序列上扫描，不推断其物种、基因组版本或基因座。",
    qpcrTitle: "qPCR 引物设计", qpcrLead: "qPCR 流程由模板解析、Primer3 候选生成、可用后端筛查和五维启发式排序组成。", workflowLabel: "计算流程",
    qpcrSteps: [["01", "候选生成", "Primer3 最多生成 30 对候选，并按 Primer3 pair penalty 由低到高预排序。"], ["02", "候选缩减", "仅筛查排序靠前的 max(2 × 请求返回数, 10) 对；因此后续排名针对该子集，不代表所有可能引物对。"], ["03", "成对扩增筛查", "生产环境的人类与小鼠模式同时查询版本固定的本地基因组和配套 RefSeq RNA；若本地基因组不可用，才回退到按物种过滤的 NCBI RefSeq RNA BLAST。"], ["04", "综合排序", "总分由 Tm、GC%、当前特异性证据、跨外显子状态和简化 3′ 互补风险组成，最高截断为 100。筛查失败时特异性项记 0，不把未知当作通过。"]],
    paramsTitle: "默认设计约束", paramHead: ["参数", "当前值", "方法学含义"],
    qpcrParams: [["引物长度", "18–25 nt；最优 20 nt", "用于 Primer3 候选生成"], ["Tm", "58–62 °C；最优 60 °C", "单条引物目标范围"], ["GC", "40–60%", "单条引物目标范围"], ["扩增子", "80–200 bp", "RT-qPCR 默认区间"], ["同聚核苷酸", "最多 4 nt", "PRIMER_MAX_POLY_X"], ["结构阈值", "self-any 45 °C；self-end 35 °C；hairpin 24 °C", "Primer3 热力学上限；引物对互补上限同为 45/35 °C"]],
    scoreTitle: "排序分数不是成功率", scoreBody: "Tm 最高 30 分、GC 最高 20 分、特异性最高 30 分、跨外显子最高 19 分、简化二聚体项最高 10 分，总和截断至 100。该分数是 PrimerCat 内部的相对排序规则，没有经过独立数据集校准，不能解释为“成功率 92%”。",
    specificityTitle: "三个筛查范围不可等同",
    specificityRows: [["本地基因组 Bowtie2", "GRCh38.p14 或 GRCm39", "端到端；保留覆盖 ≥85%、≤2 个错配的命中；每端最多 64 个判定命中，再按方向、距离和目标基因座组成 50–5,000 bp 产物。", "可发现外显子外命中，但结论仍受组装版本、阈值和命中上限限制。"], ["本地 RefSeq RNA Bowtie2", "与组装注释发布配套的 accessioned RNA", "每端最多 128 个判定命中；分别统计所选转录本、同基因异构体、其他基因和未分类转录本产物。", "只覆盖该固定注释中的转录本，不代表样本实际表达谱或未注释转录本。"], ["NCBI RefSeq RNA BLAST 回退", "物种过滤的参考转录本", "仅在本地基因组不可用时使用；短序列 BLAST，每条引物最多 5 个 hits，统计覆盖 ≥85% 的 HSP。", "是受返回集限制的转录本初筛，不能证明全基因组唯一。"]],
    pcrTitle: "常规 PCR 引物设计", pcrLead: "常规 PCR 使用研究者提供的单条 DNA 模板。预设只改变参数起点；研究者实际提交的参数才是本次计算依据。",
    pcrSteps: [["设计", "Primer3 使用 18–25 nt、GC 40–60%、最多 4 个连续相同碱基及与 qPCR 相同的热力学结构上限。标准、菌落 PCR、高保真预设的默认产物区间分别为 150–800、200–1,500、500–3,000 bp。"], ["目标区间", "若研究者给出 1-based 闭区间，PrimerCat 要求返回的扩增子完整包含该区域；结果同时报告引物与扩增子的模板坐标。"], ["退火建议", "PrimerCat 显示的值是简单起始估计：较低引物 Tm − 3 °C；建议梯度为较低 Tm − 5 至 −1 °C。它不是针对具体聚合酶/缓冲液拟合的热循环条件。"], ["可选特异性筛查", "PrimerCat 分别在 NCBI nt 中检索两条引物对物种过滤 RefSeq genomic 记录的命中，再配对同一 accession 上方向相反、间距合规的记录。"]],
    pcrCriteriaTitle: "配对筛查判定", pcrCriteria: ["单条引物查询覆盖率 ≥85%", "总错配 ≤3", "引物 3′ 端最后 3 nt 必须完全匹配", "默认扩增子范围 50–5,000 bp", "每条引物最多检索 100 个 hits；页面最多展示 10 个配对记录"],
    pcrLimit: "“找到 1 个配对记录”只描述本次 BLAST 返回集。结果达到 hit 上限时会标记可能截断；该流程不是 in-silico PCR 的全基因组穷举，也不检查常见变异位点。",
    crisprTitle: "CRISPR gRNA 设计", crisprLead: "PrimerCat 先在正链与反向互补链扫描 PAM，再将序列特征分数与脱靶筛查结果分开计算，最后优先按脱靶标签、其次按活性启发分排序。",
    pamHead: ["核酸酶", "PAM", "候选结构", "实现说明"], pamRows: [["SpCas9", "NGG（3′）", "20 nt + PAM", "双链扫描"], ["SpCas9-NG", "NG（3′）", "20 nt + PAM", "放宽 PAM，不代表与野生型具有相同活性"], ["Cas12a", "TTTV（5′）", "PAM + 20 nt", "V = A/C/G"]],
    activityTitle: "活性分数", activityBody: "SpCas9/SpCas9-NG 分数受 Doench Rule Set 2 启发，但当前代码只使用缩减后的位点碱基权重、GC 区间、poly-T/poly-G、种子区同聚序列与末端偏好；Cas12a 使用另一套简化规则。它不是原论文模型的完整复现，也未考虑染色质可及性、细胞类型、递送方式或表达系统。",
    offTargetTitle: "脱靶筛查", offTargetRows: [["本地 Bowtie2", "参考基因组", "20 nt 端到端比对、默认 ≤3 错配、最多 32 个比对；随后检查候选位点是否具有对应的规范 PAM。可选目标坐标用于锚定 on-target。"], ["NCBI nt BLAST 回退", "物种过滤的 nt", "短查询、最多 15 个 hits；过滤有 gap、长度不足与 >4 错配的 HSP。若未提供可用基因座，最强命中被启发式视为 on-target。"]],
    crisprLimit: "Bowtie2/BLAST 的相似序列筛查不能预测真实切割，也不覆盖 bulge、结构变异、样本特异变异和细胞状态。低风险标签是候选优先级，不是生物安全结论。",
    blastTitle: "BLAST 序列比对", blastLead: "BLAST 页面将查询提交给 NCBI，支持 blastn、blastp、blastx、tblastn 与 nt、nr、RefSeq RNA、RefSeq protein、Swiss-Prot 数据库的兼容组合。",
    blastBody: "PrimerCat 将研究者选择的 E-value 阈值和 hit 数量（1–50）随请求提交。对于每个数据库 hit，PrimerCat 仅展示 bit score 最高的 HSP，并报告 E-value、raw/bit score、identity、gap、坐标和 accession；页面中的序列片段限制为 300 个字符。BLAST 是局部相似性检索，研究者不能仅凭结果断言同源关系、功能注释、系统发育关系或统计多重检验结论。",
    referenceTitle: "实验室参考资料的方法边界", referenceLead: "我们把溶液、Protocol 与试剂安全定位为人工整理的参考资料；其证据性质不同于实时计算或数据库检索。",
    refRows: [["溶液配制", "按摩尔浓度、稀释倍数或百分浓度执行确定性换算；常用配方按目标终体积线性缩放。", "配方中的 pH、温度、纯度、水合物和加样顺序仍以原始来源与实验室 SOP 为准。"], ["Protocol", "把常见工作流整理为适用范围、材料、步骤、质控点和安全提示。", "属于研究参考，不是经过本站实验验证的标准操作规程。"], ["化学品安全", "静态条目汇总代表性 PubChem LCSS/GHS 信息并链接来源。", "不是实时法规数据库；纯物质、浓度、混合物和供应商会改变分类，实际操作以瓶身和当前 SDS 为准。"]],
    referencesTitle: "参考文献", referencesIntro: "文献用于说明算法、数据库与实验验证框架。引用某篇论文不表示 PrimerCat 完整复现其全部模型。",
    ctaTitle: "将方法说明与结果记录一起保存", ctaBody: "研究者若要复现一次设计，至少应记录输入序列或 accession、物种、参数、筛查后端、数据库范围、运行日期与候选序列。", validation: "查看可信度与验证", primer: "设计 qPCR 引物",
  },
  en: {
    eyebrow: "PRIMERCAT · METHODS NOTE", title: "Computational methods, parameters, and scope", abstractLabel: "Abstract",
    abstract: "This document describes how PrimerCat selects reference sequences, generates candidates, performs database screens, and ranks outputs. Thresholds reflect the current implementation; scores compare candidates and are not probabilities of experimental success.",
    meta: ["Document v1.2", "Updated 2026-09-03", "Applies to PrimerCat Web"], asideTitle: "Reading convention", aside: "Design means candidate generation under constraints. Screening means searching a stated database under stated thresholds. Neither constitutes experimental validation.",
    tocTitle: "Contents", toc: [["01", "Inputs & references", "inputs"], ["02", "qPCR primers", "qpcr"], ["03", "Endpoint PCR primers", "pcr"], ["04", "CRISPR gRNA", "crispr"], ["05", "BLAST search", "blast"], ["06", "Laboratory references", "reference-data"], ["REF", "References", "references"]],
    scopeTitle: "Inputs and reference sequences", scopeLead: "Template choice determines every downstream coordinate, candidate, and screening statement, so PrimerCat includes the selected accession and rationale in the result.",
    templateTitle: "Gene-name mode", templateBody: "PrimerCat currently supports human and mouse. PrimerCat retrieves RefSeq mRNAs from NCBI Nucleotide, preferring a MANE Select record when present; otherwise it selects the NM_ coding transcript with the longest CDS. The working window extends the CDS by 200 bp on each side and is capped at 3,000 bp.",
    templateLimit: "The rule applies only to records retrieved for that request (up to 10 IDs; the first five GenBank records are read), not an exhaustive comparison of every isoform. Mouse records generally lack MANE Select and therefore rely more often on the longest-CDS fallback.",
    customTitle: "Custom-sequence mode", customBody: "Whitespace is removed, text is uppercased, and characters are validated. qPCR/PCR accepts A, C, G, T, and N and rejects templates with >10% N. CRISPR scans the supplied DNA directly and does not infer its species, genome assembly, or locus.",
    qpcrTitle: "qPCR primer design", qpcrLead: "The qPCR pipeline combines template resolution, Primer3 generation, backend-dependent screening, and a five-component heuristic rank.", workflowLabel: "Computational workflow",
    qpcrSteps: [["01", "Candidate generation", "Primer3 generates up to 30 pairs and pre-ranks them by ascending pair penalty."], ["02", "Candidate reduction", "Only the top max(2 × requested return count, 10) pairs are screened; the final rank therefore applies to this subset, not every possible pair."], ["03", "Paired-amplicon screen", "Production human and mouse modes query both a version-pinned local genome and its matched RefSeq RNA collection. Species-filtered NCBI RefSeq RNA BLAST is used only when the local genome is unavailable."], ["04", "Composite rank", "Tm, GC%, available specificity evidence, exon spanning, and a simplified 3′ complementarity check are combined. Failed screening contributes zero specificity points rather than treating unknown evidence as a pass."]],
    paramsTitle: "Default design constraints", paramHead: ["Parameter", "Current value", "Methodological role"], qpcrParams: [["Primer length", "18–25 nt; optimum 20 nt", "Primer3 candidate generation"], ["Tm", "58–62 °C; optimum 60 °C", "Per-primer target range"], ["GC", "40–60%", "Per-primer target range"], ["Amplicon", "80–200 bp", "Default RT-qPCR interval"], ["Homopolymer", "Maximum 4 nt", "PRIMER_MAX_POLY_X"], ["Structure ceilings", "self-any 45 °C; self-end 35 °C; hairpin 24 °C", "Primer3 thermodynamic ceilings; pair complementarity uses 45/35 °C"]],
    scoreTitle: "The rank is not a success probability", scoreBody: "Tm contributes up to 30 points, GC up to 20, specificity up to 30, exon spanning up to 19, and simplified dimer risk up to 10; the sum is capped at 100. This is an internal relative-ranking rule that has not been calibrated on an independent validation set and must not be read as “92% success.”",
    specificityTitle: "The three screening scopes are not equivalent", specificityRows: [["Local genome Bowtie2", "GRCh38.p14 or GRCm39", "End-to-end; retains hits with ≥85% coverage and ≤2 mismatches; up to 64 decision hits per end, then composes 50–5,000 bp products by orientation, distance, and target locus.", "Can reveal non-exonic hits, but remains limited by assembly version, thresholds, and the hit cap."], ["Local RefSeq RNA Bowtie2", "Accessioned RNA matched to the assembly annotation release", "Up to 128 decision hits per end; reports products on the selected transcript, same-gene isoforms, other genes, and unclassified transcripts separately.", "Covers only transcripts in that fixed annotation; it is not the sample's expression profile and omits unannotated transcripts."], ["NCBI RefSeq RNA BLAST fallback", "Species-filtered reference transcripts", "Used only when the local genome is unavailable; short-query BLAST with up to five hits per primer and HSP coverage ≥85%.", "A return-set-limited transcript screen that cannot establish whole-genome uniqueness."]],
    pcrTitle: "Endpoint PCR primer design", pcrLead: "Endpoint PCR uses a single DNA template supplied by the researcher. Presets only initialise the controls; the values the researcher submits define the run.",
    pcrSteps: [["Design", "Primer3 uses 18–25 nt, GC 40–60%, no more than four identical consecutive bases, and the same thermodynamic ceilings as qPCR. Standard, colony-PCR, and high-fidelity presets start at 150–800, 200–1,500, and 500–3,000 bp."], ["Target interval", "When a researcher supplies a 1-based closed interval, PrimerCat requires the returned amplicon to contain it and reports primer and amplicon template coordinates."], ["Annealing guidance", "PrimerCat displays a simple starting estimate of lower primer Tm − 3 °C and a gradient of lower Tm − 5 to −1 °C. It is not fitted to a particular polymerase or buffer."], ["Optional specificity screen", "PrimerCat searches each primer against species-filtered RefSeq genomic records in NCBI nt, then pairs compatible opposite-strand hits on the same accession."]],
    pcrCriteriaTitle: "Pair-screen criteria", pcrCriteria: ["Query coverage ≥85%", "Total mismatches ≤3", "Exact match across the final three 3′ nucleotides", "Default amplicon window 50–5,000 bp", "Up to 100 hits per primer; up to 10 paired records displayed"], pcrLimit: "“One paired record” describes only the returned BLAST set. A truncation flag is shown when the hit cap is reached. This is not an exhaustive whole-genome in-silico PCR and common variants are not checked.",
    crisprTitle: "CRISPR gRNA design", crisprLead: "PrimerCat scans PAM candidates on both strands, computes sequence-feature activity and off-target screening separately, and then orders candidates by the off-target label followed by the activity heuristic.",
    pamHead: ["Nuclease", "PAM", "Candidate", "Implementation"], pamRows: [["SpCas9", "NGG (3′)", "20 nt + PAM", "Both-strand scan"], ["SpCas9-NG", "NG (3′)", "20 nt + PAM", "Relaxed PAM does not imply wild-type-equivalent activity"], ["Cas12a", "TTTV (5′)", "PAM + 20 nt", "V = A/C/G"]],
    activityTitle: "Activity score", activityBody: "The SpCas9/SpCas9-NG score is inspired by Doench Rule Set 2 but the implementation uses a reduced set of positional weights plus GC bands, poly-T/poly-G, seed homopolymers, and terminal preferences. Cas12a uses a separate simplified rule set. This is not a complete reproduction of the published model and excludes chromatin accessibility, cell type, delivery, and expression system.",
    offTargetTitle: "Off-target screen", offTargetRows: [["Local Bowtie2", "Reference genome", "20-nt end-to-end alignment, ≤3 mismatches by default, up to 32 alignments; candidate loci are then checked for the appropriate canonical PAM. Optional target coordinates anchor the on-target locus."], ["NCBI nt BLAST fallback", "Species-filtered nt", "Short query, up to 15 hits; gapped, short, and >4-mismatch HSPs are excluded. Without a usable locus, the strongest hit is heuristically treated as on-target."]],
    crisprLimit: "Bowtie2/BLAST sequence-similarity screening does not predict cleavage and omits bulges, structural variants, sample-specific variants, and cell state. A low-risk label is a prioritisation aid, not a biosafety conclusion.",
    blastTitle: "BLAST sequence search", blastLead: "PrimerCat submits BLAST requests to NCBI and supports compatible combinations of blastn, blastp, blastx, and tblastn with nt, nr, RefSeq RNA, RefSeq protein, and Swiss-Prot.", blastBody: "PrimerCat submits the researcher's selected E-value and hit count (1–50). For each database hit, PrimerCat displays only the highest-bit-score HSP with E-value, raw/bit score, identity, gaps, coordinates, and accession; displayed query/subject strings are capped at 300 characters. Researchers cannot use a local-alignment result alone to establish homology, function, phylogeny, or multiple-testing conclusions.",
    referenceTitle: "Method boundaries for laboratory references", referenceLead: "We present solutions, protocols, and safety records as curated reference material; their evidence character differs from live computation or database search.",
    refRows: [["Solution preparation", "Deterministic molarity, dilution, or percentage calculations; curated recipes scale linearly to final volume.", "pH, temperature, purity, hydrate state, and addition order remain governed by the primary source and laboratory SOP."], ["Protocols", "Common workflows are structured by applicability, materials, steps, quality controls, and safety notes.", "Research reference only; not a standard operating procedure experimentally validated by PrimerCat."], ["Chemical safety", "Static records summarise representative PubChem LCSS/GHS information and link to sources.", "Not a live regulatory database. Form, concentration, mixture, and supplier alter classification; the container label and current SDS govern actual work."]],
    referencesTitle: "References", referencesIntro: "These sources document algorithms, databases, and validation frameworks. Citation does not imply that PrimerCat reproduces every part of a published model.",
    ctaTitle: "Save the method context with each result", ctaBody: "To reproduce a design, researchers should record at least the input sequence or accession, species, parameters, screening backend, database scope, run date, and candidate sequences.", validation: "Confidence & validation", primer: "Design qPCR primers",
  },
} as const;

function Table({ head, rows }: { head: readonly string[]; rows: readonly (readonly string[])[] }) {
  return <div className="academic-table-wrap"><table className="academic-table"><thead><tr>{head.map((cell) => <th key={cell}>{cell}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th key={cell}>{cell}</th> : <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

export default function MethodsPage({ params: { locale } }: { params: { locale: string } }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;
  const zh = locale === "zh";
  return (
    <div className="academic-page methods-academic-page">
      <AcademicHeader eyebrow={copy.eyebrow} title={copy.title} abstractLabel={copy.abstractLabel} abstract={copy.abstract} meta={[...copy.meta]} asideTitle={copy.asideTitle} aside={copy.aside} />
      <div className="academic-document-grid">
        <nav className="academic-toc" aria-label={copy.tocTitle}><span>{copy.tocTitle}</span>{copy.toc.map(([number, label, href]) => <a key={href} href={`#${href}`}><b>{number}</b>{label}</a>)}</nav>
        <article className="academic-article">
          <AcademicSection number="01" id="inputs" title={copy.scopeTitle} lead={copy.scopeLead}>
            <div className="academic-two-column"><div><h3>{copy.templateTitle}</h3><p>{copy.templateBody}<Cite ids={[1, 2]} /></p><p className="academic-caveat">{copy.templateLimit}</p></div><div><h3>{copy.customTitle}</h3><p>{copy.customBody}</p></div></div>
          </AcademicSection>
          <AcademicSection number="02" id="qpcr" title={copy.qpcrTitle} lead={<>{copy.qpcrLead}<Cite ids={[3, 4]} /></>}>
            <p className="academic-subheading">{copy.workflowLabel}</p>
            <div className="academic-process">{copy.qpcrSteps.map(([number, title, body]) => <div key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></div>)}</div>
            <h3>{copy.paramsTitle}</h3><Table head={copy.paramHead} rows={copy.qpcrParams} />
            <div className="academic-note-grid"><aside><span>{copy.scoreTitle}</span><p>{copy.scoreBody}</p></aside><aside><span>{zh ? "实验要求" : "Experimental requirement"}</span><p>{zh ? "MIQE 2.0 强调完整报告样本处理、反应体系、效率、动态范围、对照与原始数据。计算设计只能覆盖其中的引物候选环节。" : "MIQE 2.0 requires transparent reporting of sample handling, reaction chemistry, efficiency, dynamic range, controls, and raw data. Computational design covers only the candidate-primer stage."}<Cite ids={[11]} /></p></aside></div>
            <h3>{copy.specificityTitle}</h3><Table head={zh ? ["后端", "搜索范围", "当前判定", "不能推出"] : ["Backend", "Search scope", "Current evaluation", "Does not establish"]} rows={copy.specificityRows} />
            <p className="academic-caveat">{zh ? "生产参考固定为人类 GRCh38.p14（GCF_000001405.40，RefSeq 2025-08 注释）和小鼠 GRCm39（GCF_000001635.27，RefSeq 2024-02 注释）。" : "Production references are fixed to human GRCh38.p14 (GCF_000001405.40; RefSeq 2025-08 annotation) and mouse GRCm39 (GCF_000001635.27; RefSeq 2024-02 annotation)."}<Cite ids={[13, 14, 15, 16]} /> <Link href="/validation#production-snapshot">{zh ? "查看当前生产证据快照 →" : "View the current production evidence snapshot →"}</Link></p>
          </AcademicSection>
          <AcademicSection number="03" id="pcr" title={copy.pcrTitle} lead={<>{copy.pcrLead}<Cite ids={[3]} /></>}>
            <div className="academic-method-list">{copy.pcrSteps.map(([title, body]) => <div key={title}><h3>{title}</h3><p>{body}</p></div>)}</div>
            <div className="academic-evidence-block"><h3>{copy.pcrCriteriaTitle}</h3><ul>{copy.pcrCriteria.map((item) => <li key={item}>{item}</li>)}</ul><p>{copy.pcrLimit}<Cite ids={[4, 6]} /></p></div>
          </AcademicSection>
          <AcademicSection number="04" id="crispr" title={copy.crisprTitle} lead={<>{copy.crisprLead}<Cite ids={[7, 8]} /></>}>
            <Table head={copy.pamHead} rows={copy.pamRows} />
            <div className="academic-two-column"><div><h3>{copy.activityTitle}</h3><p>{copy.activityBody}<Cite ids={[7]} /></p></div><div><h3>{zh ? "PAM 依据" : "PAM basis"}</h3><p>{zh ? "SpCas9-NG 的 NG 识别与 Cas12a 的 T-rich PAM 来自相应核酸酶研究；不同变体、细胞与靶点的实测活性仍可能显著不同。" : "NG recognition by SpCas9-NG and the T-rich Cas12a PAM are grounded in the corresponding nuclease studies; measured activity can still vary markedly across variants, cells, and targets."}<Cite ids={[9, 10]} /></p></div></div>
            <h3>{copy.offTargetTitle}</h3><Table head={zh ? ["后端", "范围", "当前实现"] : ["Backend", "Scope", "Current implementation"]} rows={copy.offTargetRows} />
            <p className="academic-caveat">{copy.crisprLimit}<Cite ids={[8]} /></p>
          </AcademicSection>
          <AcademicSection number="05" id="blast" title={copy.blastTitle} lead={<>{copy.blastLead}<Cite ids={[6]} /></>}><div className="academic-reading-block"><p>{copy.blastBody}</p></div></AcademicSection>
          <AcademicSection number="06" id="reference-data" title={copy.referenceTitle} lead={copy.referenceLead}>
            <Table head={zh ? ["模块", "页面提供", "使用边界"] : ["Module", "What the page provides", "Use boundary"]} rows={copy.refRows} />
            <p className="academic-caveat">{zh ? "PubChem 汇集多来源化学信息；页面采用代表性记录，不把聚合数据误写成单一、永久有效的法规结论。" : "PubChem aggregates chemical information from many contributors. PrimerCat uses representative records rather than presenting aggregated data as one permanent regulatory conclusion."}<Cite ids={[12]} /></p>
          </AcademicSection>
          <ReferenceList title={copy.referencesTitle} intro={copy.referencesIntro} references={REFERENCES} />
          <section className="academic-cta"><div><span>{zh ? "复现清单" : "Reproducibility checklist"}</span><h2>{copy.ctaTitle}</h2><p>{copy.ctaBody}</p></div><div><Link href="/validation">{copy.validation}</Link><Link href="/primer">{copy.primer}</Link></div></section>
        </article>
      </div>
    </div>
  );
}
