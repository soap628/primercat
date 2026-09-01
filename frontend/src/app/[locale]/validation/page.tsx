import { AcademicHeader, AcademicSection, Cite, ReferenceList, type AcademicReference } from "@/components/AcademicDocument";
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
];

const COPY = {
  zh: {
    eyebrow: "PRIMERCAT · 证据与验证说明", title: "如何判断结果的可信度", abstractLabel: "摘要",
    abstract: "PrimerCat 的“可信度”不等同于一个统一准确率，而是由输入质量、算法输出、数据库覆盖、启发式假设和实验验证共同决定。本页给出证据分级、可支持的结论、已知限制与建议验证路径。",
    meta: ["证据框架 1.0", "更新：2026-09-01", "研究用途"], asideTitle: "核心结论",
    aside: "数值可精确计算，不代表生物学结论同样确定；数据库未见命中，不代表真实样本中不存在风险；排名第一，不代表实验必然成功。",
    tocTitle: "本文目录", toc: [["01", "证据分级", "evidence"], ["02", "各工具可支持的结论", "claims"], ["03", "状态标签解释", "status"], ["04", "实验验证建议", "experimental"], ["05", "复现与变更因素", "reproducibility"], ["06", "当前验证状态", "current-status"], ["REF", "参考文献", "references"]],
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
      ["qPCR 引物", "候选满足当前 Primer3 约束；比较 Tm/GC、结构指标、外显子跨越与当前筛查命中。", "扩增效率合格、单一熔解峰、无 gDNA 干扰、适用于全部转录异构体或人群变异。", "C1 + D1 + H1"],
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
    currentTitle: "当前验证状态", currentLead: "公开说明当前尚未建立的证据，防止把软件可用性误写成学术验证。",
    currentItems: [
      ["尚无独立基准集", "目前没有公开的、预注册的独立数据集用于估计 PrimerCat qPCR 成功率、gRNA 编辑率或脱靶分类的敏感度/特异度。"],
      ["尚无临床验证", "本工具仅用于研究设计，不用于诊断、治疗决策、临床报告或监管提交。"],
      ["算法组件有同行评议依据", "Primer3、BLAST、Bowtie2、RefSeq、MIQE 与 CRISPR 研究为组件和验证框架提供依据，但不等于对 PrimerCat 整体性能的背书。"],
      ["结果可审计但仍需改进", "页面展示参数、筛查范围和限制；后续应补充软件版本快照、可下载运行清单、回归基准和公开验证数据。"],
    ],
    refsTitle: "参考文献", refsIntro: "参考文献覆盖算法基础、数据库、qPCR 报告规范和 CRISPR 实验脱靶验证。",
    ctaTitle: "把“可信”变成可检查的记录", ctaBody: "先确认输入与后端，再阅读命中详情，最后按实际实验体系完成验证。", methods: "查看完整方法", primer: "开始 qPCR 设计",
  },
  en: {
    eyebrow: "PRIMERCAT · EVIDENCE & VALIDATION NOTE", title: "How to assess confidence in a result", abstractLabel: "Abstract",
    abstract: "PrimerCat does not assign one universal accuracy value. Confidence depends on input quality, algorithmic output, database coverage, heuristic assumptions, and experimental confirmation. This page defines evidence classes, supported claims, known limitations, and validation paths.",
    meta: ["Evidence framework 1.0", "Updated 2026-09-01", "Research use only"], asideTitle: "Central conclusion", aside: "A value can be computed precisely while the biological conclusion remains uncertain. No database hit does not prove absence of risk, and a first-ranked candidate is not guaranteed to work.",
    tocTitle: "Contents", toc: [["01", "Evidence classes", "evidence"], ["02", "Supported claims", "claims"], ["03", "Status labels", "status"], ["04", "Experimental validation", "experimental"], ["05", "Reproducibility", "reproducibility"], ["06", "Current validation status", "current-status"], ["REF", "References", "references"]],
    evidenceTitle: "Evidence classes", evidenceLead: "Outputs with different origins should not be judged on one scale. These classes describe where evidence comes from; they are not confidence percentages.",
    evidenceHead: ["Class", "Evidence type", "Typical output", "Correct interpretation"],
    evidenceRows: [["C1", "Deterministic computation", "Sequence length, GC%, coordinates, solution arithmetic, Primer3 fields", "Reproducible under the same input, parameters, and software version; still vulnerable to input error and model assumptions."], ["D1", "Database-dependent screen", "RefSeq template, BLAST/Bowtie2 hits, accessions", "Valid only for the stated database/assembly, query date, thresholds, and hit cap."], ["H1", "Heuristic rank", "qPCR composite score, gRNA activity score, Low/Medium/High labels", "Candidate prioritisation only; not calibrated as probability and not comparable across tools or experiments."], ["R1", "Curated reference", "Protocols, recipe notes, chemical-hazard summaries", "A preparation and review aid; not a substitute for primary literature, product instructions, SDS, SOP, or risk assessment."], ["X0", "Experimental confirmation", "Efficiency, single product, measured editing, measured off-targets, sample suitability", "Not produced by PrimerCat; it must be established in the user's experimental system."]],
    separationTitle: "Keep three concepts separate", separation: [["Computation complete", "The algorithm returned values or candidates."], ["Screen passed", "No warning rule was triggered in a defined database, threshold, and return set."], ["Experiment valid", "The target sample, reagents, instrument, and controls met pre-specified acceptance criteria."]],
    claimsTitle: "Claims supported by each tool", claimsLead: "The table uses conservative language: what the result supports, and what cannot be inferred from it.",
    claimsHead: ["Module", "Supported interpretation", "Unsupported inference", "Evidence"], claimsRows: [["qPCR primers", "Candidates meet current Primer3 constraints; compare Tm/GC, structure fields, exon spanning, and current-screen hits.", "Acceptable efficiency, one melt peak, no gDNA interference, or suitability for every isoform and population variant.", "C1 + D1 + H1"], ["Endpoint PCR", "Coordinates, product size, and structure fields on the submitted template; paired records in the optional returned BLAST set.", "Whole-genome uniqueness, a single band in the sample, or no need to optimise annealing temperature.", "C1 + D1"], ["CRISPR gRNA", "PAM/strand/position, sequence-feature priority, and near matches found by the current backend.", "Measured on-target editing, absence of cellular off-targets, or portability across Cas variants and delivery systems.", "C1 + D1 + H1"], ["BLAST", "Local-similarity hits and statistics under the selected database and parameters.", "Shared function, proven homology, completed species identification, or absence when no hit is returned.", "D1"], ["Solutions/protocols/safety", "Calculate amounts from stated values and inspect structured references with source links.", "Universal recipe suitability, equivalence to an SOP/SDS, or hazard classification across all concentrations and mixtures.", "C1 or R1"]],
    variabilityTitle: "Major sources of variability", variability: ["Input sequence, transcript, and genome version", "Species filter and database update state", "Thresholds, hit cap, timeout, and fallback backend", "Polymerase, buffer, template quality, and sample variants", "Cell type, chromatin, Cas variant, and delivery method"],
    statusTitle: "How to read status labels", statusLead: "A status summarises the current screen. It must not convert absence of evidence into a claim of safety or specificity.",
    statusRows: [["Pass / Low", "No additional returned hit met the active warning rule.", "Review scope, hit cap, and on-target identification; experimental confirmation is still required."], ["Review / Medium", "Moderately similar extra hits exist, or evidence is insufficient for exclusion.", "Compare candidates, inspect genomic context and mismatch positions, and use a more complete specialist tool when needed."], ["High risk / High", "An extra perfect/high-similarity hit, several candidate hits, or failure to anchor the supplied target locus was found.", "Usually prefer another candidate; if use is necessary, perform targeted computation and experiments first."], ["No hits", "The backend returned no hit passing its filters.", "Check the query, database coverage, and short-query limitations; never treat this as proof of uniqueness."], ["Not checked / error / skipped", "The screen did not run, timed out, or was unavailable.", "Do not assign specificity or low risk; retry or use an independent method."]],
    experimentalTitle: "Recommended experimental validation", experimentalLead: "These are minimum validation directions, not a universal SOP. Pre-specify acceptance criteria for the actual study.",
    validationGroups: [["RT-qPCR / qPCR", ["Confirm the accession, target isoform, and amplicon; inspect common variants when relevant.", "Include NTC and no-RT controls and confirm a single product by melt curve and/or gel.", "Use a standard curve to assess efficiency, linear range, and detection limit; report sequences, concentrations, chemistry, and raw data.", "Use validated reference genes and appropriate normalisation; follow MIQE 2.0."]], ["Endpoint PCR", ["Run an annealing-temperature gradient with positive, negative, and no-template controls.", "Confirm product count and size by gel; confirm sequence by Sanger or another method for critical applications.", "Check the relevant assembly and sample variation for the real specimen source."]], ["CRISPR", ["Cross-check candidates in an independent genome-aware design tool and provide an explicit target locus where possible.", "Measure on-target editing and indel spectrum in the target cells by amplicon sequencing or an equivalent assay.", "Choose targeted-site sequencing or an unbiased method such as GUIDE-seq according to application risk; computational screening cannot replace cellular off-target measurement."]], ["BLAST & references", ["Verify critical claims against the accession and primary record; add MSA, domain, and phylogenetic analysis when required.", "Return from protocols and recipes to the primary source and institutional SOP; for chemicals, check the current label, supplier SDS, and EHS requirements."]]],
    reproTitle: "Reproducibility and change factors", reproLead: "To reconstruct a run, the output must carry its computational context, not only a copied candidate sequence.",
    reproHead: ["Record", "Why"], reproRows: [["Original input or accession + version", "The sequence can change when an accession is revised."], ["Species and reference assembly", "Hits and coordinates differ between assemblies."], ["All submitted parameters", "Presets initialise controls; submitted values determine candidates."], ["Backend, database, and date", "Local Bowtie2 and NCBI BLAST have different scope, and remote databases evolve."], ["Hit caps and exception states", "Truncation, timeout, and fallback alter the visible evidence."], ["PrimerCat and dependency versions", "Primer3, Biopython, index, and score-rule changes may alter output."]],
    currentTitle: "Current validation status", currentLead: "Stating missing evidence prevents software availability from being mistaken for academic validation.",
    currentItems: [["No independent benchmark yet", "There is currently no public, pre-registered independent dataset estimating PrimerCat qPCR success, gRNA editing accuracy, or off-target classification sensitivity/specificity."], ["No clinical validation", "The tool is for research design only and is not intended for diagnosis, treatment decisions, clinical reporting, or regulatory submission."], ["Components have peer-reviewed foundations", "Primer3, BLAST, Bowtie2, RefSeq, MIQE, and CRISPR studies support components and validation frameworks; they do not endorse PrimerCat's end-to-end performance."], ["Auditable, with more work planned", "Pages expose parameters, screening scope, and limitations. Future work should add dependency snapshots, downloadable run manifests, regression benchmarks, and public validation data."]],
    refsTitle: "References", refsIntro: "References cover algorithmic foundations, databases, qPCR reporting standards, and experimental CRISPR off-target validation.",
    ctaTitle: "Turn confidence into an inspectable record", ctaBody: "Confirm the input and backend, inspect hit details, then validate in the actual experimental system.", methods: "Read full methods", primer: "Start qPCR design",
  },
} as const;

function Table({ head, rows }: { head: readonly string[]; rows: readonly (readonly string[])[] }) {
  return <div className="academic-table-wrap"><table className="academic-table"><thead><tr>{head.map((cell) => <th key={cell}>{cell}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th key={cell}>{cell}</th> : <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div>;
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
            <div className="academic-evidence-block"><h3>{copy.variabilityTitle}</h3><ul>{copy.variability.map((item) => <li key={item}>{item}</li>)}</ul><p>{zh ? "算法与数据库组件已有同行评议文献，但具体网站组合流程的可信度仍取决于实现细节和验证数据。" : "Algorithms and databases have peer-reviewed foundations, but confidence in this site's combined workflow still depends on implementation details and validation data."}<Cite ids={[2, 3, 4, 5, 8, 9]} /></p></div>
          </AcademicSection>
          <AcademicSection number="03" id="status" title={copy.statusTitle} lead={copy.statusLead}><Table head={zh ? ["状态", "页面实际表达", "下一步"] : ["Status", "What it actually means", "Next action"]} rows={copy.statusRows} /></AcademicSection>
          <AcademicSection number="04" id="experimental" title={copy.experimentalTitle} lead={copy.experimentalLead}>
            <div className="academic-validation-groups">{copy.validationGroups.map(([title, items]) => <section key={title}><h3>{title}</h3><ol>{items.map((item) => <li key={item}>{item}</li>)}</ol></section>)}</div>
            <div className="academic-note-grid"><aside><span>{zh ? "qPCR 报告框架" : "qPCR reporting framework"}</span><p>{zh ? "MIQE 2.0 要求透明报告样本、反应、效率、动态范围、质控与数据分析；它比“选出一对引物”覆盖更完整的证据链。" : "MIQE 2.0 calls for transparent reporting of samples, reactions, efficiency, dynamic range, quality controls, and analysis—a much broader evidence chain than selecting a primer pair."}<Cite ids={[1]} /></p></aside><aside><span>{zh ? "CRISPR 脱靶" : "CRISPR off-targets"}</span><p>{zh ? "错配数量与位置会改变 Cas9 容忍度；GUIDE-seq 等细胞实验能发现计算方法遗漏的切割位点，因此高风险应用不能只依赖序列筛查。" : "Cas9 tolerance depends on mismatch number and position. Cell-based methods such as GUIDE-seq can detect cleavage sites missed computationally, so high-risk work cannot rely on sequence screening alone."}<Cite ids={[6, 7]} /></p></aside></div>
          </AcademicSection>
          <AcademicSection number="05" id="reproducibility" title={copy.reproTitle} lead={copy.reproLead}><Table head={copy.reproHead} rows={copy.reproRows} /></AcademicSection>
          <AcademicSection number="06" id="current-status" title={copy.currentTitle} lead={copy.currentLead}>
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
