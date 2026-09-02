import { AcademicHeader, AcademicSection, Cite, ReferenceList, type AcademicReference } from "@/components/AcademicDocument";
import cohortBenchmark from "@/data/qpcr-reference-cohort-mouse-v0.6.json";
import primerBankBenchmark from "@/data/qpcr-transcriptome-benchmark-v0.5.json";
import { Link } from "@/navigation";

const REFERENCES: AcademicReference[] = [
  { id: 1, authors: "Bustin SA, et al.", year: "2025", title: "MIQE 2.0: Revision of the Minimum Information for Publication of Quantitative Real-Time PCR Experiments Guidelines", journal: "Clinical Chemistry", detail: "71:634–651.", doi: "10.1093/clinchem/hvaf043", href: "https://pubmed.ncbi.nlm.nih.gov/40272429/" },
  { id: 2, authors: "Untergasser A, et al.", year: "2012", title: "Primer3—new capabilities and interfaces", journal: "Nucleic Acids Research", detail: "40:e115.", doi: "10.1093/nar/gks596", href: "https://pubmed.ncbi.nlm.nih.gov/22730293/" },
  { id: 3, authors: "Ye J, et al.", year: "2012", title: "Primer-BLAST: a tool to design target-specific primers for polymerase chain reaction", journal: "BMC Bioinformatics", detail: "13:134.", doi: "10.1186/1471-2105-13-134", href: "https://pubmed.ncbi.nlm.nih.gov/22708584/" },
  { id: 4, authors: "Langmead B, Salzberg SL.", year: "2012", title: "Fast gapped-read alignment with Bowtie 2", journal: "Nature Methods", detail: "9:357–359.", doi: "10.1038/nmeth.1923", href: "https://pubmed.ncbi.nlm.nih.gov/22388286/" },
  { id: 5, authors: "Doench JG, et al.", year: "2016", title: "Optimized sgRNA design to maximize activity and minimize off-target effects of CRISPR-Cas9", journal: "Nature Biotechnology", detail: "34:184–191.", doi: "10.1038/nbt.3437", href: "https://pubmed.ncbi.nlm.nih.gov/26780180/" },
  { id: 6, authors: "Hsu PD, et al.", year: "2013", title: "DNA targeting specificity of RNA-guided Cas9 nucleases", journal: "Nature Biotechnology", detail: "31:827–832.", doi: "10.1038/nbt.2647", href: "https://pubmed.ncbi.nlm.nih.gov/23873081/" },
  { id: 7, authors: "Tsai SQ, et al.", year: "2015", title: "GUIDE-seq enables genome-wide profiling of off-target cleavage by CRISPR-Cas nucleases", journal: "Nature Biotechnology", detail: "33:187–197.", doi: "10.1038/nbt.3117", href: "https://pubmed.ncbi.nlm.nih.gov/25513782/" },
  { id: 8, authors: "Camacho C, et al.", year: "2009", title: "BLAST+: architecture and applications", journal: "BMC Bioinformatics", detail: "10:421.", doi: "10.1186/1471-2105-10-421", href: "https://pubmed.ncbi.nlm.nih.gov/20003500/" },
  { id: 9, authors: "O’Leary NA, et al.", year: "2016", title: "Reference sequence (RefSeq) database at NCBI: current status, taxonomic expansion, and functional annotation", journal: "Nucleic Acids Research", detail: "44:D733–D745.", doi: "10.1093/nar/gkv1189", href: "https://pubmed.ncbi.nlm.nih.gov/26553804/" },
  { id: 10, authors: "Kim S, et al.", year: "2025", title: "PubChem 2025 update", journal: "Nucleic Acids Research", detail: "53:D1516–D1525.", doi: "10.1093/nar/gkae1059", href: "https://pubmed.ncbi.nlm.nih.gov/39558165/" },
  { id: 11, authors: "Wang X, et al.", year: "2012", title: "PrimerBank: a PCR primer database for quantitative gene expression analysis, 2012 update", journal: "Nucleic Acids Research", detail: "40:D1144–D1149.", doi: "10.1093/nar/gkr1013", href: "https://academic.oup.com/nar/article/40/D1/D1144/2902573" },
  { id: 12, authors: "Spandidos A, et al.", year: "2008", title: "A comprehensive collection of experimentally validated primers for Polymerase Chain Reaction quantitation of murine transcript abundance", journal: "BMC Genomics", detail: "9:633.", doi: "10.1186/1471-2164-9-633", href: "https://pubmed.ncbi.nlm.nih.gov/19108745/" },
  { id: 13, authors: "NCBI RefSeq", year: "2024", title: "Mus musculus genome assembly GRCm39", journal: "NCBI Datasets", detail: "RefSeq assembly GCF_000001635.27.", href: "https://www.ncbi.nlm.nih.gov/datasets/genome/GCF_000001635.27/" },
  { id: 14, authors: "NCBI RefSeq", year: "2024", title: "Mus musculus Annotation Release GCF_000001635.27-RS_2024_02", journal: "NCBI Eukaryotic Genome Annotation", detail: "GRCm39 RefSeq annotation report.", href: "https://www.ncbi.nlm.nih.gov/refseq/annotation_euk/Mus_musculus/GCF_000001635.27-RS_2024_02/" },
  { id: 15, authors: "NCBI", year: "2026", title: "Genomes Download FAQ: assembly-directory file content", journal: "NCBI Genome", detail: "Defines *_rna.fna.gz as accessioned RNA products annotated on a RefSeq assembly.", href: "https://www.ncbi.nlm.nih.gov/genome/doc/ftpfaq/#files" },
  { id: 16, authors: "NCBI RefSeq", year: "2025", title: "Homo sapiens genome assembly GRCh38.p14", journal: "NCBI Datasets", detail: "RefSeq assembly GCF_000001405.40.", href: "https://www.ncbi.nlm.nih.gov/datasets/genome/GCF_000001405.40/" },
  { id: 17, authors: "NCBI RefSeq", year: "2025", title: "Homo sapiens Annotation Release GCF_000001405.40-RS_2025_08", journal: "NCBI Eukaryotic Genome Annotation", detail: "GRCh38.p14 RefSeq annotation report.", href: "https://www.ncbi.nlm.nih.gov/refseq/annotation_euk/Homo_sapiens/GCF_000001405.40-RS_2025_08/" },
];

const COPY = {
  zh: {
    eyebrow: "PRIMERCAT · 证据与验证说明", title: "如何判断结果的可信度", abstractLabel: "摘要",
    abstract: "PrimerCat 的“可信度”不等同于一个统一准确率，而是由输入质量、算法输出、数据库覆盖、启发式假设和实验验证共同决定。本页给出证据分级、可支持的结论、已知限制与建议验证路径。",
    meta: ["证据框架 1.6", "更新：2026-09-03", "研究用途"], asideTitle: "核心结论",
    aside: "数值可精确计算，不代表生物学结论同样确定；数据库未见命中，不代表真实样本中不存在风险；排名第一，不代表实验必然成功。",
    tocTitle: "本文目录", toc: [["01", "证据分级", "evidence"], ["02", "各工具可支持的结论", "claims"], ["03", "状态标签解释", "status"], ["04", "实验验证建议", "experimental"], ["05", "复现与变更因素", "reproducibility"], ["06", "计算覆盖与公开对照", "benchmark"], ["07", "当前验证状态", "current-status"], ["REF", "参考文献", "references"]],
    evidenceTitle: "证据分级", evidenceLead: "不同类型的输出不能放在同一把尺子上评价。下列分级描述证据来源，而不是给结果打“可信度百分比”。",
    evidenceHead: ["等级", "证据类型", "典型输出", "正确解释"],
    evidenceRows: [
      ["C1", "确定性计算", "序列长度、GC%、坐标、配方换算、Primer3 返回参数", "在相同输入、参数和软件版本下应可复现；仍可能受输入错误或模型假设影响。"],
      ["D1", "数据库依赖筛查", "RefSeq 模板、BLAST/Bowtie2 命中、accession", "只对结果标注的数据库/参考组装、检索日期、阈值和 hit 上限成立。"],
      ["H1", "启发式排序", "qPCR 综合分、gRNA 活性分、Low/Medium/High 标签", "用于候选间排序；没有校准为概率，也不能跨工具或跨实验直接比较。"],
      ["R1", "人工整理参考", "Protocol、配方说明、化学品危险摘要", "用于准备与核对，不替代原始论文、产品说明、SDS、SOP 或风险评估。"],
      ["X0", "实验确认", "效率、单一产物、真实编辑率、真实脱靶、样本适用性", "不由 PrimerCat 产生；必须在用户的实验体系内建立。"],
    ],
    separationTitle: "三个概念必须分开",
    separation: [["计算完成", "算法已返回数值或候选。"], ["筛查通过", "在特定数据库、阈值和返回范围内未触发警示。"], ["实验有效", "在目标样本、试剂、设备和对照下获得符合预设标准的结果。"]],
    claimsTitle: "各工具可支持的结论", claimsLead: "下表采用保守表述：页面能支持什么，以及不能从结果继续推导什么。",
    claimsHead: ["模块", "可以据此判断", "不能据此断言", "证据"],
    claimsRows: [
      ["qPCR 引物", "候选满足当前 Primer3 约束；人类与小鼠模式分别在固定的 GRCh38.p14 或 GRCm39 基因组及配套 RefSeq RNA 上模拟成对扩增，并区分所选转录本、同基因异构体与其他基因产物。", "扩增效率合格、单一熔解峰、样本中没有未注释转录本或变异影响，或实验必然成功。", "C1 + D1 + H1"],
      ["常规 PCR", "候选在提交模板上的坐标、产物长度、结构参数；可选 BLAST 返回集中可形成的配对记录。", "全基因组唯一、目标样本一定有单条带、退火温度无需优化。", "C1 + D1"],
      ["CRISPR gRNA", "PAM/链/位置；序列特征优先级；当前后端发现的近似位点。", "真实 on-target 编辑率、细胞内无脱靶、适用于任何 Cas 变体/递送系统。", "C1 + D1 + H1"],
      ["BLAST", "选定数据库和参数下的局部相似命中及其统计量。", "功能相同、同源关系成立、物种鉴定完成或未命中即不存在。", "D1"],
      ["溶液/Protocol/安全", "按给定数值计算用量；查阅结构化参考与来源链接。", "配方适配所有实验、网页摘要等同 SOP/SDS、危险分类适用于所有浓度和混合物。", "C1 或 R1"],
    ],
    variabilityTitle: "影响结果的主要变量", variability: ["输入序列、转录本与基因组版本", "物种过滤与数据库更新状态", "阈值、返回 hit 数和超时/回退后端", "聚合酶、缓冲液、模板质量与样本变异", "细胞类型、染色质、Cas 变体与递送方式"],
    statusTitle: "状态标签如何解释", statusLead: "状态只总结当前筛查，不把“没有证据”误写成“安全”或“特异”。",
    statusRows: [
      ["通过 / Low", "当前后端返回集中没有达到警示规则的额外命中。", "继续查看数据库范围、hit 上限和 on-target 识别方式；仍需实验确认。"],
      ["复核 / Medium", "存在中等相似的额外命中，或证据不足以直接排除。", "比较候选、检查基因区域与错配位置，必要时使用更完整的专用工具。"],
      ["高风险 / High", "发现额外完美/高相似命中、较多候选命中，或给定目标坐标未被锚定。", "通常优先更换候选；若必须使用，先完成针对性计算与实验验证。"],
      ["无命中 / no hits", "该后端没有返回通过过滤条件的命中。", "检查查询是否正确、数据库是否覆盖目标，以及短序列搜索是否受限；不能视为“唯一”。"],
      ["未检查 / error / skipped", "筛查未运行、超时或服务不可用。", "不得授予特异性或低风险结论；重试或改用独立工具。"],
    ],
    experimentalTitle: "建议的实验验证路径", experimentalLead: "以下是最低限度的验证方向，不是统一 SOP；具体接受标准应在实验计划中预先定义。",
    validationGroups: [
      ["RT-qPCR / qPCR", ["确认 accession、目标异构体与扩增子序列；必要时检查常见变异位点。", "设置 NTC 与 no-RT 对照；验证单一产物（熔解曲线和/或凝胶）。", "用标准曲线评估扩增效率、线性范围与检测限；报告引物序列、浓度、反应条件和原始数据。", "表达定量使用经验证的参考基因与适当归一化，并遵循 MIQE 2.0。"]],
      ["常规 PCR", ["先做退火温度梯度，并同时设置阳性、阴性和无模板对照。", "用凝胶确认产物数量与大小；关键应用用 Sanger 或其他方法确认序列。", "针对真实样本来源检查基因组版本、变异和模板复杂度。"]],
      ["CRISPR", ["使用独立、基因组感知的设计工具复核候选，并优先提供明确的目标基因座。", "在目标细胞中用 amplicon sequencing 或等效方法测量 on-target 编辑和 indel 谱。", "按应用风险选择预测位点测序或 GUIDE-seq 等无偏方法；计算筛查不能替代细胞内脱靶测量。"]],
      ["BLAST 与参考资料", ["以 accession 与原始记录复核关键结论，必要时使用多序列比对、结构域和系统发育分析。", "Protocol 与配方回到原始来源和本机构 SOP；化学品操作核对当前瓶身、供应商 SDS 与 EHS 要求。"]],
    ],
    reproTitle: "复现与变更因素", reproLead: "要让另一位研究者能够重建本次结果，输出必须携带计算上下文，而不只是复制一条候选序列。",
    reproHead: ["必须记录", "原因"], reproRows: [["原始输入或 accession + version", "数据库 accession 更新后序列可能改变。"], ["物种与参考组装", "同一序列在不同组装中的命中和坐标不同。"], ["全部设计参数", "预设只是初值，实际提交值决定候选。"], ["筛查后端、数据库和日期", "本地 Bowtie2 与 NCBI BLAST 的覆盖范围不同，远程数据库持续更新。"], ["返回上限与异常状态", "hit 截断、超时或回退会改变可见证据。"], ["PrimerCat/依赖版本", "Primer3、Biopython、索引和评分规则变更可能改变输出。"]],
    benchmarkTitle: "固定参考计算覆盖审计 v0.6", benchmarkLead: "从固定版小鼠 RefSeq RNA 以公开、确定性的散列规则选取 200 个不同基因，每个基因保留一个 NM_ 转录本，重新生成并筛查候选。这一批次扩大了流程覆盖面；它不是随机抽样、外部准确率测试或湿实验验证。",
    benchmarkFacts: ["候选对已筛查", "联合计算通过", "基因至少一对通过"],
    benchmarkMethodTitle: "本轮如何运行",
    benchmarkMethod: "抽样框限于固定 RNA FASTA 中具有 GTF 基因座、长度 250–5,000 bp 且只含 A/C/G/T 的 NM_ 转录本。按 SHA-256(seed:accession) 排序，每个基因保留第一个转录本，再取前 200 个基因。每条记录以 Primer3 生成并保留 penalty 最低的 10 对候选，随后在 GRCm39 基因组和配套 RefSeq RNA 上执行同一套成对扩增规则。联合通过要求所选转录本恰有 1 个产物、没有其他基因或未分类转录本产物，且基因组结果兼容；同基因异构体另行报告。",
    benchmarkHead: ["指标", "判定规则", "结果", "正确解释"],
    benchmarkDownload: "下载基准快照",
    benchmarkPrevious: "查看 100 基因 PrimerBank 外部对照 v0.5",
    benchmarkPriorNote: "为避免混淆两类证据，v0.5 的 100 个 PrimerBank 基因外部对照继续单独保留。PrimerBank 的实验记录只验证其公开引物，不验证 PrimerCat 新生成的候选。",
    benchmarkCaveat: "页面中的比例只描述固定组装、固定 RNA 集合、当前软件版本和预设规则下的计算结果。它不是准确率、灵敏度、临床性能或实验成功率；散列抽样保证可复现，但不能使该队列代表基因表达丰度、人群、组织或真实实验分布。",
    benchmarkNextTitle: "下一层证据",
    benchmarkNext: "在引物结合位点增加固定版本常见变异检查，并从联合通过、跨基因产物、同基因多异构体和无连续基因组产物等类别中预先抽样，依据效率、线性、单一产物、NTC 与 no-RT 标准开展前瞻性湿实验。",
    currentTitle: "当前验证状态", currentLead: "公开说明当前尚未建立的证据，防止把软件可用性误写成学术验证。",
    currentItems: [
      ["已公开扩大后的逐候选计算记录", "v0.6 从固定 RefSeq RNA 中确定性选取 200 个不同基因，并公开抽样规则、参考文件校验值、运行参数、逐候选筛查记录和代码校验值。"],
      ["尚无临床验证", "本工具仅用于研究设计，不用于诊断、治疗决策、临床报告或监管提交。"],
      ["算法组件有同行评议依据", "Primer3、BLAST、Bowtie2、RefSeq、MIQE 与 CRISPR 研究为组件和验证框架提供依据，但不等于对 PrimerCat 整体性能的背书。"],
      ["仍未覆盖样本变异与实验体系", "固定 RefSeq RNA 能区分已注释异构体，但不代表样本实际表达谱，也不覆盖未注释转录本、样本 SNP/结构变异、试剂体系或实际扩增行为。命中达到上限的候选按不确定处理。"],
    ],
    refsTitle: "参考文献", refsIntro: "参考文献覆盖算法基础、数据库、qPCR 报告规范、PrimerBank 公开对照与 CRISPR 实验脱靶验证。",
    ctaTitle: "把“可信”变成可检查的记录", ctaBody: "先确认输入与后端，再阅读命中详情，最后按实际实验体系完成验证。", methods: "查看完整方法", primer: "开始 qPCR 设计",
  },
  en: {
    eyebrow: "PRIMERCAT · EVIDENCE & VALIDATION NOTE", title: "How to assess confidence in a result", abstractLabel: "Abstract",
    abstract: "PrimerCat does not assign one universal accuracy value. Confidence depends on input quality, algorithmic output, database coverage, heuristic assumptions, and experimental confirmation. This page defines evidence classes, supported claims, known limitations, and validation paths.",
    meta: ["Evidence framework 1.6", "Updated 2026-09-03", "Research use only"], asideTitle: "Central conclusion", aside: "A value can be computed precisely while the biological conclusion remains uncertain. No database hit does not prove absence of risk, and a first-ranked candidate is not guaranteed to work.",
    tocTitle: "Contents", toc: [["01", "Evidence classes", "evidence"], ["02", "Supported claims", "claims"], ["03", "Status labels", "status"], ["04", "Experimental validation", "experimental"], ["05", "Reproducibility", "reproducibility"], ["06", "Computational coverage & public comparator", "benchmark"], ["07", "Current validation status", "current-status"], ["REF", "References", "references"]],
    evidenceTitle: "Evidence classes", evidenceLead: "Outputs with different origins should not be judged on one scale. These classes describe where evidence comes from; they are not confidence percentages.",
    evidenceHead: ["Class", "Evidence type", "Typical output", "Correct interpretation"],
    evidenceRows: [["C1", "Deterministic computation", "Sequence length, GC%, coordinates, solution arithmetic, Primer3 fields", "Reproducible under the same input, parameters, and software version; still vulnerable to input error and model assumptions."], ["D1", "Database-dependent screen", "RefSeq template, BLAST/Bowtie2 hits, accessions", "Valid only for the stated database/assembly, query date, thresholds, and hit cap."], ["H1", "Heuristic rank", "qPCR composite score, gRNA activity score, Low/Medium/High labels", "Candidate prioritisation only; not calibrated as probability and not comparable across tools or experiments."], ["R1", "Curated reference", "Protocols, recipe notes, chemical-hazard summaries", "A preparation and review aid; not a substitute for primary literature, product instructions, SDS, SOP, or risk assessment."], ["X0", "Experimental confirmation", "Efficiency, single product, measured editing, measured off-targets, sample suitability", "Not produced by PrimerCat; it must be established in the user's experimental system."]],
    separationTitle: "Keep three concepts separate", separation: [["Computation complete", "The algorithm returned values or candidates."], ["Screen passed", "No warning rule was triggered in a defined database, threshold, and return set."], ["Experiment valid", "The target sample, reagents, instrument, and controls met pre-specified acceptance criteria."]],
    claimsTitle: "Claims supported by each tool", claimsLead: "The table uses conservative language: what the result supports, and what cannot be inferred from it.",
    claimsHead: ["Module", "Supported interpretation", "Unsupported inference", "Evidence"], claimsRows: [["qPCR primers", "Candidates meet current Primer3 constraints. Human and mouse modes simulate paired amplification on fixed GRCh38.p14 or GRCm39 genomes and their matched RefSeq RNA collections, distinguishing the selected transcript, same-gene isoforms, and other-gene products.", "Acceptable efficiency, one melt peak, absence of unannotated transcripts or sample-variant effects, or guaranteed experimental success.", "C1 + D1 + H1"], ["Endpoint PCR", "Coordinates, product size, and structure fields on the submitted template; paired records in the optional returned BLAST set.", "Whole-genome uniqueness, a single band in the sample, or no need to optimise annealing temperature.", "C1 + D1"], ["CRISPR gRNA", "PAM/strand/position, sequence-feature priority, and near matches found by the current backend.", "Measured on-target editing, absence of cellular off-targets, or portability across Cas variants and delivery systems.", "C1 + D1 + H1"], ["BLAST", "Local-similarity hits and statistics under the selected database and parameters.", "Shared function, proven homology, completed species identification, or absence when no hit is returned.", "D1"], ["Solutions/protocols/safety", "Calculate amounts from stated values and inspect structured references with source links.", "Universal recipe suitability, equivalence to an SOP/SDS, or hazard classification across all concentrations and mixtures.", "C1 or R1"]],
    variabilityTitle: "Major sources of variability", variability: ["Input sequence, transcript, and genome version", "Species filter and database update state", "Thresholds, hit cap, timeout, and fallback backend", "Polymerase, buffer, template quality, and sample variants", "Cell type, chromatin, Cas variant, and delivery method"],
    statusTitle: "How to read status labels", statusLead: "A status summarises the current screen. It must not convert absence of evidence into a claim of safety or specificity.",
    statusRows: [["Pass / Low", "No additional returned hit met the active warning rule.", "Review scope, hit cap, and on-target identification; experimental confirmation is still required."], ["Review / Medium", "Moderately similar extra hits exist, or evidence is insufficient for exclusion.", "Compare candidates, inspect genomic context and mismatch positions, and use a more complete specialist tool when needed."], ["High risk / High", "An extra perfect/high-similarity hit, several candidate hits, or failure to anchor the supplied target locus was found.", "Usually prefer another candidate; if use is necessary, perform targeted computation and experiments first."], ["No hits", "The backend returned no hit passing its filters.", "Check the query, database coverage, and short-query limitations; never treat this as proof of uniqueness."], ["Not checked / error / skipped", "The screen did not run, timed out, or was unavailable.", "Do not assign specificity or low risk; retry or use an independent method."]],
    experimentalTitle: "Recommended experimental validation", experimentalLead: "These are minimum validation directions, not a universal SOP. Pre-specify acceptance criteria for the actual study.",
    validationGroups: [["RT-qPCR / qPCR", ["Confirm the accession, target isoform, and amplicon; inspect common variants when relevant.", "Include NTC and no-RT controls and confirm a single product by melt curve and/or gel.", "Use a standard curve to assess efficiency, linear range, and detection limit; report sequences, concentrations, chemistry, and raw data.", "Use validated reference genes and appropriate normalisation; follow MIQE 2.0."]], ["Endpoint PCR", ["Run an annealing-temperature gradient with positive, negative, and no-template controls.", "Confirm product count and size by gel; confirm sequence by Sanger or another method for critical applications.", "Check the relevant assembly and sample variation for the real specimen source."]], ["CRISPR", ["Cross-check candidates in an independent genome-aware design tool and provide an explicit target locus where possible.", "Measure on-target editing and indel spectrum in the target cells by amplicon sequencing or an equivalent assay.", "Choose targeted-site sequencing or an unbiased method such as GUIDE-seq according to application risk; computational screening cannot replace cellular off-target measurement."]], ["BLAST & references", ["Verify critical claims against the accession and primary record; add MSA, domain, and phylogenetic analysis when required.", "Return from protocols and recipes to the primary source and institutional SOP; for chemicals, check the current label, supplier SDS, and EHS requirements."]]],
    reproTitle: "Reproducibility and change factors", reproLead: "To reconstruct a run, the output must carry its computational context, not only a copied candidate sequence.",
    reproHead: ["Record", "Why"], reproRows: [["Original input or accession + version", "The sequence can change when an accession is revised."], ["Species and reference assembly", "Hits and coordinates differ between assemblies."], ["All submitted parameters", "Presets initialise controls; submitted values determine candidates."], ["Backend, database, and date", "Local Bowtie2 and NCBI BLAST have different scope, and remote databases evolve."], ["Hit caps and exception states", "Truncation, timeout, and fallback alter the visible evidence."], ["PrimerCat and dependency versions", "Primer3, Biopython, index, and score-rule changes may alter output."]],
    benchmarkTitle: "Fixed-reference computational coverage audit v0.6", benchmarkLead: "A public deterministic hash rule selects 200 distinct genes from the pinned mouse RefSeq RNA collection, retaining one NM_ transcript per gene. Candidates are regenerated and screened for every record. This expands pipeline coverage; it is not random sampling, an external accuracy test, or wet-lab validation.",
    benchmarkFacts: ["Candidate pairs screened", "Joint computational passes", "Genes with ≥1 pass"],
    benchmarkMethodTitle: "How this run was performed",
    benchmarkMethod: "The sampling frame is restricted to NM_ transcripts in the pinned RNA FASTA that have a GTF locus, are 250–5,000 bp long, and contain only A/C/G/T. Records are ranked by SHA-256(seed:accession), the first transcript per gene is retained, and the first 200 genes are selected. Primer3 generates ten lowest-penalty pairs per record, which are then screened under the same paired-amplicon rule against GRCm39 and matched RefSeq RNA. A joint pass requires exactly one selected-transcript product, no other-gene or unclassified transcript product, and a compatible genomic result; same-gene isoforms are reported separately.",
    benchmarkHead: ["Metric", "Decision rule", "Result", "Correct interpretation"],
    benchmarkDownload: "Download benchmark snapshot",
    benchmarkPrevious: "View the 100-gene PrimerBank comparator v0.5",
    benchmarkPriorNote: "To keep evidence types distinct, the 100-gene PrimerBank external comparator remains available as v0.5. PrimerBank experiments validate the published pairs, not newly generated PrimerCat candidates.",
    benchmarkCaveat: "These proportions describe computational outcomes under a fixed assembly, fixed RNA collection, software version, and stated rules. They are not accuracy, sensitivity, clinical performance, or wet-lab success. Deterministic hashing makes the cohort reproducible; it does not make the cohort representative of expression abundance, populations, tissues, or real experiments.",
    benchmarkNextTitle: "Next evidence layer",
    benchmarkNext: "Add version-pinned common-variant checks at primer-binding sites. Then pre-sample joint-pass, cross-gene, multi-isoform, and no-contiguous-genomic-product classes for prospective wet-lab testing against efficiency, linearity, single-product, NTC, and no-RT criteria.",
    currentTitle: "Current validation status", currentLead: "Stating missing evidence prevents software availability from being mistaken for academic validation.",
    currentItems: [["Expanded per-candidate computational records are public", "v0.6 deterministically selects 200 distinct genes from fixed RefSeq RNA and publishes the sampling rule, reference-file checksums, runtime parameters, per-candidate screens, and source-code checksums."], ["No clinical validation", "The tool is for research design only and is not intended for diagnosis, treatment decisions, clinical reporting, or regulatory submission."], ["Components have peer-reviewed foundations", "Primer3, BLAST, Bowtie2, RefSeq, MIQE, and CRISPR studies support components and validation frameworks; they do not endorse PrimerCat's end-to-end performance."], ["Sample variation and experimental context remain uncovered", "Fixed RefSeq RNA can distinguish annotated isoforms, but it is not the sample's expressed transcriptome and does not cover unannotated transcripts, sample SNPs or structural variants, reaction chemistry, or actual amplification. Hit-cap candidates remain indeterminate."]],
    refsTitle: "References", refsIntro: "References cover algorithmic foundations, databases, qPCR reporting standards, the PrimerBank reference set, and experimental CRISPR off-target validation.",
    ctaTitle: "Turn confidence into an inspectable record", ctaBody: "Confirm the input and backend, inspect hit details, then validate in the actual experimental system.", methods: "Read full methods", primer: "Start qPCR design",
  },
} as const;

function Table({ head, rows }: { head: readonly string[]; rows: readonly (readonly string[])[] }) {
  return <div className="academic-table-wrap"><table className="academic-table"><thead><tr>{head.map((cell) => <th key={cell}>{cell}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th key={cell}>{cell}</th> : <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function ReferenceBenchmark({ copy, zh }: { copy: typeof COPY.zh | typeof COPY.en; zh: boolean }) {
  const results = cohortBenchmark.results;
  const priorResults = primerBankBenchmark.results;
  const metricRows = zh ? [
    ["候选对已筛查", `${results.cohort_records} 个不同基因各取 Primer3 penalty 最低的候选`, `${results.candidate_pairs_screened}`, "所有候选使用同一参考组装、参数和判定规则。"],
    ["所选转录本产物", "所选 accession 上恰有 1 个 50–5000 bp 成对产物", `${results.pairs_with_one_target_transcript_product}/${results.candidate_pairs_screened}`, "确认固定 RNA 集合中的预期产物，不代表样本实际表达。"],
    ["转录本基因层面通过", "目标产物存在，且没有其他基因或未分类转录本产物", `${results.transcript_gene_specific_pairs}/${results.candidate_pairs_screened}`, "允许同基因其他异构体共同扩增。"],
    ["异构体特异标志", "基因层面通过，且未见同基因其他异构体产物", `${results.transcript_isoform_specific_pairs}/${results.candidate_pairs_screened}`, "只对当前固定 RefSeq 注释成立。"],
    ["同基因其他异构体", "至少一个其他 RefSeq 异构体可形成产物", `${results.pairs_amplifying_same_gene_isoform}/${results.candidate_pairs_screened}`, "不影响基因总表达用途，但不支持单一异构体结论。"],
    ["其他基因产物", "至少一个其他基因的 RefSeq 转录本可形成产物", `${results.pairs_with_cross_gene_product}/${results.candidate_pairs_screened}`, "联合规则不通过，建议更换候选。"],
    ["联合计算通过", "转录本基因层面通过，且基因组结果兼容", `${results.combined_computational_pass_pairs}/${results.candidate_pairs_screened}`, "计算筛查通过，不是实验成功率。"],
    ["转录组证据补足", "无连续基因组产物，但确认目标 RNA 且未见跨基因产物", `${results.no_contiguous_genomic_product_resolved_by_transcript_evidence}/${results.candidate_pairs_screened}`, "合理识别跨剪接候选，而非把“无基因组产物”直接当成唯一性。"],
    ["转录本命中截断", "任一端超过 128 个转录本判定命中", `${results.transcript_hit_cap_reached_pairs}/${results.candidate_pairs_screened}`, "可能遗漏额外产物，按保守规则不通过。"],
    ["基因至少一对通过", "该基因的候选中至少一对满足联合规则", `${results.records_with_at_least_one_combined_pass}/${results.cohort_records}`, "说明候选集中有计算上更优选项，不代表该基因实验成功率。"],
  ] : [
    ["Candidate pairs screened", `Take the lowest-Penalty Primer3 candidates for each of ${results.cohort_records} distinct genes`, `${results.candidate_pairs_screened}`, "Every candidate used the same assembly, parameters, and decision rule."],
    ["Selected-transcript product", "Exactly one 50–5000 bp paired product occurs on the selected accession", `${results.pairs_with_one_target_transcript_product}/${results.candidate_pairs_screened}`, "Confirms the intended product in the fixed RNA collection, not expression in the sample."],
    ["Transcript gene-level pass", "The target product exists with no other-gene or unclassified transcript product", `${results.transcript_gene_specific_pairs}/${results.candidate_pairs_screened}`, "Other isoforms of the same gene may still be amplified."],
    ["Isoform-specific flag", "Gene-level pass with no product from another isoform of the same gene", `${results.transcript_isoform_specific_pairs}/${results.candidate_pairs_screened}`, "Applies only to this fixed RefSeq annotation."],
    ["Other same-gene isoform", "At least one other RefSeq isoform forms a paired product", `${results.pairs_amplifying_same_gene_isoform}/${results.candidate_pairs_screened}`, "Compatible with total-gene measurement but not a single-isoform claim."],
    ["Cross-gene product", "At least one RefSeq transcript from another gene forms a paired product", `${results.pairs_with_cross_gene_product}/${results.candidate_pairs_screened}`, "Fails the joint rule; prefer another candidate."],
    ["Joint computational pass", "Transcript gene-level pass plus a compatible genomic result", `${results.combined_computational_pass_pairs}/${results.candidate_pairs_screened}`, "A computational screen pass, not wet-lab success."],
    ["Resolved by transcript evidence", "No contiguous genomic product, but intended RNA and no cross-gene product are confirmed", `${results.no_contiguous_genomic_product_resolved_by_transcript_evidence}/${results.candidate_pairs_screened}`, "Handles splice-junction candidates without equating no genomic product with uniqueness."],
    ["Transcript hit cap", "Either primer exceeds the 128-transcript decision limit", `${results.transcript_hit_cap_reached_pairs}/${results.candidate_pairs_screened}`, "Extra products may be hidden, so the conservative rule assigns no pass."],
    ["Gene with at least one pass", "At least one candidate for the gene meets the joint rule", `${results.records_with_at_least_one_combined_pass}/${results.cohort_records}`, "A stronger computational option exists; this is not per-gene experimental success."],
  ];
  return (
    <>
      <div className="academic-definition-row academic-benchmark-facts">
        <div><span>{copy.benchmarkFacts[0]}</span><p><strong>{results.candidate_pairs_screened}</strong></p></div>
        <div><span>{copy.benchmarkFacts[1]}</span><p><strong>{results.combined_computational_pass_pairs}/{results.candidate_pairs_screened}</strong></p></div>
        <div><span>{copy.benchmarkFacts[2]}</span><p><strong>{results.records_with_at_least_one_combined_pass}/{results.cohort_records}</strong></p></div>
      </div>
      <div className="academic-reading-block academic-benchmark-method">
        <h3>{copy.benchmarkMethodTitle}</h3>
        <p>{copy.benchmarkMethod}</p>
      </div>
      <Table head={copy.benchmarkHead} rows={metricRows} />
      <p className="academic-benchmark-download">
        <a href="/benchmarks/qpcr-fixed-refseq-mouse-cohort-v0.6.json">{copy.benchmarkDownload} ↓</a>
        <span aria-hidden="true"> · </span>
        <a href="/benchmarks/qpcr-primerbank-mouse-transcriptome-v0.5.json">{copy.benchmarkPrevious}</a>
      </p>
      <p className="academic-caveat">{copy.benchmarkCaveat}</p>
      <p className="academic-caveat">{copy.benchmarkPriorNote} {zh ? `v0.5 报告 ${priorResults.combined_computational_pass_pairs}/${priorResults.candidate_pairs_screened} 对联合计算通过，${priorResults.records_with_at_least_one_combined_pass}/${priorResults.source_records} 个基因至少有一对通过。` : `v0.5 reports ${priorResults.combined_computational_pass_pairs}/${priorResults.candidate_pairs_screened} joint computational passes and ${priorResults.records_with_at_least_one_combined_pass}/${priorResults.source_records} genes with at least one pass.`}</p>
      <div className="academic-audit-list academic-benchmark-next">
        <div><span>NEXT</span><div><h3>{copy.benchmarkNextTitle}</h3><p>{copy.benchmarkNext}</p></div></div>
      </div>
    </>
  );
}

export default function ValidationPage({ params: { locale } }: { params: { locale: string } }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;
  const zh = locale === "zh";
  return (
    <div className="academic-page validation-academic-page">
      <AcademicHeader eyebrow={copy.eyebrow} title={copy.title} abstractLabel={copy.abstractLabel} abstract={copy.abstract} meta={[...copy.meta]} asideTitle={copy.asideTitle} aside={copy.aside} />
      <div className="academic-document-grid">
        <nav className="academic-toc" aria-label={copy.tocTitle}><span>{copy.tocTitle}</span>{copy.toc.map(([number, label, href]) => <a key={href} href={`#${href}`}><b>{number}</b>{label}</a>)}</nav>
        <article className="academic-article">
          <AcademicSection number="01" id="evidence" title={copy.evidenceTitle} lead={copy.evidenceLead}>
            <Table head={copy.evidenceHead} rows={copy.evidenceRows} />
            <h3>{copy.separationTitle}</h3><div className="academic-definition-row">{copy.separation.map(([title, body]) => <div key={title}><span>{title}</span><p>{body}</p></div>)}</div>
          </AcademicSection>
          <AcademicSection number="02" id="claims" title={copy.claimsTitle} lead={copy.claimsLead}>
            <Table head={copy.claimsHead} rows={copy.claimsRows} />
            <p className="academic-caveat">{zh ? "固定参考版本为人类 GRCh38.p14 / RefSeq 2025-08 注释和小鼠 GRCm39 / RefSeq 2024-02 注释；页面结果中的组装标签用于限定结论范围。" : "Fixed references are human GRCh38.p14 with the RefSeq 2025-08 annotation and mouse GRCm39 with the RefSeq 2024-02 annotation; assembly labels in results define the scope of each statement."}<Cite ids={[13, 14, 16, 17]} /></p>
            <div className="academic-evidence-block"><h3>{copy.variabilityTitle}</h3><ul>{copy.variability.map((item) => <li key={item}>{item}</li>)}</ul><p>{zh ? "算法与数据库组件已有同行评议文献，但具体网站组合流程的可信度仍取决于实现细节和验证数据。" : "Algorithms and databases have peer-reviewed foundations, but confidence in this site's combined workflow still depends on implementation details and validation data."}<Cite ids={[2, 3, 4, 5, 8, 9]} /></p></div>
          </AcademicSection>
          <AcademicSection number="03" id="status" title={copy.statusTitle} lead={copy.statusLead}><Table head={zh ? ["状态", "页面实际表达", "下一步"] : ["Status", "What it actually means", "Next action"]} rows={copy.statusRows} /></AcademicSection>
          <AcademicSection number="04" id="experimental" title={copy.experimentalTitle} lead={copy.experimentalLead}>
            <div className="academic-validation-groups">{copy.validationGroups.map(([title, items]) => <section key={title}><h3>{title}</h3><ol>{items.map((item) => <li key={item}>{item}</li>)}</ol></section>)}</div>
            <div className="academic-note-grid"><aside><span>{zh ? "qPCR 报告框架" : "qPCR reporting framework"}</span><p>{zh ? "MIQE 2.0 要求透明报告样本、反应、效率、动态范围、质控与数据分析；它比“选出一对引物”覆盖更完整的证据链。" : "MIQE 2.0 calls for transparent reporting of samples, reactions, efficiency, dynamic range, quality controls, and analysis—a much broader evidence chain than selecting a primer pair."}<Cite ids={[1]} /></p></aside><aside><span>{zh ? "CRISPR 脱靶" : "CRISPR off-targets"}</span><p>{zh ? "错配数量与位置会改变 Cas9 容忍度；GUIDE-seq 等细胞实验能发现计算方法遗漏的切割位点，因此高风险应用不能只依赖序列筛查。" : "Cas9 tolerance depends on mismatch number and position. Cell-based methods such as GUIDE-seq can detect cleavage sites missed computationally, so high-risk work cannot rely on sequence screening alone."}<Cite ids={[6, 7]} /></p></aside></div>
          </AcademicSection>
          <AcademicSection number="05" id="reproducibility" title={copy.reproTitle} lead={copy.reproLead}><Table head={copy.reproHead} rows={copy.reproRows} /></AcademicSection>
          <AcademicSection number="06" id="benchmark" title={copy.benchmarkTitle} lead={<>{copy.benchmarkLead}<Cite ids={[2, 4, 9, 11, 12, 13, 14, 15]} /></>}>
            <ReferenceBenchmark copy={copy} zh={zh} />
          </AcademicSection>
          <AcademicSection number="07" id="current-status" title={copy.currentTitle} lead={copy.currentLead}>
            <div className="academic-audit-list">{copy.currentItems.map(([title, body], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{body}</p></div></div>)}</div>
            <p className="academic-caveat">{zh ? "化学安全条目采用 PubChem 等代表性来源，但真实操作必须回到当前产品 SDS；聚合数据库的存在不构成针对具体产品的安全保证。" : "Chemical-safety records use representative sources such as PubChem, but actual work must return to the current product SDS; an aggregated database is not a safety guarantee for a specific product."}<Cite ids={[10]} /></p>
          </AcademicSection>
          <ReferenceList title={copy.refsTitle} intro={copy.refsIntro} references={REFERENCES} />
          <section className="academic-cta"><div><span>{zh ? "判读原则" : "Interpretation principle"}</span><h2>{copy.ctaTitle}</h2><p>{copy.ctaBody}</p></div><div><Link href="/methods">{copy.methods}</Link><Link href="/primer">{copy.primer}</Link></div></section>
        </article>
      </div>
    </div>
  );
}
