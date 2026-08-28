import { Link } from "@/navigation";

const TONE_STYLES: Record<string, { bg: string; border: string; dot: string }> = {
  green: { bg: "rgba(34,197,94,0.07)",  border: "rgba(34,197,94,0.22)",  dot: "#22c55e" },
  amber: { bg: "rgba(251,191,36,0.07)", border: "rgba(251,191,36,0.25)", dot: "#f59e0b" },
  red:   { bg: "rgba(239,68,68,0.07)",  border: "rgba(239,68,68,0.20)",  dot: "#ef4444" },
};

const COPY = {
  zh: {
    badge: "结果可信度",
    title: "结果页面的每一列数字，背后是什么",
    intro:
      "PrimerCat 不只给你一个排名列表——结果页面随结果同步呈现了推理依据、特异性状态和设计边界。这里解释每项数据的来源，以及它能回答哪些问题、回答不了哪些问题。",

    heroAsideTitle: "透明度原则",
    heroAsideBody:
      "结果不是黑箱打分。每一对引物或每一条 gRNA 的得分，都可以在结果页逐项追溯：Tm、GC%、跨外显子状态、Bowtie2 / BLAST 命中数……推荐理由和设计限制一并展示。",
    heroMetricLabel: "结果覆盖维度",
    heroMetricValue: "6 项",
    heroMetricBody: "每条结果涵盖序列参数、热力学特性、基因组特异性、结构风险、外显子结构和活性估算六个维度。",

    evidenceTitle: "结果页面已经给了你什么",
    evidenceIntro:
      "下面六项信息已经内嵌在每条结果里——不需要额外查阅文献，打开结果页就能看到。",
    evidenceItems: [
      {
        icon: "01",
        title: "模板来源与转录本 ID",
        body: "系统自动从 NCBI RefSeq 选取的主转录本编号（NM_XXXXXX.X）、外显子数量、CDS 长度，以及选择该转录本的依据（CDS 完整性优先）。",
      },
      {
        icon: "02",
        title: "热力学参数",
        body: "左右引物的 Tm（熔解温度）、GC%、发卡 ΔG、自身 3' 末端互补热力学值——均由 Primer3 在设计阶段计算，并在参数越界时直接过滤掉该候选。",
      },
      {
        icon: "03",
        title: "特异性证据与筛查范围",
        body: "结果会显示本次使用的筛查后端。本地索引可提供基因组层面命中；未配置索引时使用 RefSeq RNA BLAST，并明确标为转录本层面初筛。",
      },
      {
        icon: "04",
        title: "外显子跨越状态",
        body: "扩增子是否横跨至少一个外显子–外显子连接处，标记为「跨外显子 ✓」或「同一外显子」，以及扩增子长度（bp）。",
      },
      {
        icon: "05",
        title: "综合评分细项",
        body: "总分由 Tm 差、GC% 偏差、特异性、外显子跨越、扩增子大小、引物末端稳定性六个子分加权合并，每项得分可在结果卡展开区查看。",
      },
      {
        icon: "06",
        title: "gRNA 活性估算维度",
        body: "gRNA 结果页包含 GC%、种子区连续 G 计数、PAM 邻近区碱基偏好、脱靶命中数——四项均为序列特征估算，结果页已标注「需实验验证」。",
      },
    ],

    toolsTitle: "每个工具的覆盖范围与边界",
    toolsIntro:
      "下面列出每个工具明确覆盖的内容（✓），以及它不处理或边界情况（⚠）。",
    tools: [
      {
        tag: "qPCR",
        color: "#22c55e",
        title: "qPCR 引物设计",
        solid: [
          "Primer3 热力学过滤（Tm、GC%、hairpin、二聚体）",
          "配置 hg38/mm10 索引时使用 Bowtie2；否则使用批量 RefSeq RNA BLAST 初筛",
          "外显子–外显子跨越检测（基于 RefSeq 注释的外显子坐标）",
          "扩增子大小 80–200 bp（qPCR 优化范围）",
          "综合评分排序（6 子分加权）",
          "设计依据完整展示在结果页",
        ],
        limit: [
          "基因组 DNA 中的内含子命中被保守标记为脱靶（RT-qPCR 的 cDNA 模板不含内含子，此保守性可接受）",
          "SNP / 多态性位点不检查——引物覆盖区域若含常见 SNP 可能导致扩增失败",
          "不做湿实验验证（扩增效率曲线、溶解曲线需自行验证）",
          "引物浓度、缓冲液组成等实验条件由用户自行优化",
        ],
      },
      {
        tag: "CRISPR",
        color: "#7c3aed",
        title: "CRISPR gRNA 设计",
        solid: [
          "配置本地基因组索引时执行基因组筛查；否则使用明确标注的 BLAST 回退",
          "支持 SpCas9（NGG）、SpCas9-NG（NG）、Cas12a（TTTV）三种 PAM",
          "正反链全覆盖扫描",
          "GC%、种子区连续 G、PAM 临近碱基偏好等序列特征评估",
          "脱靶命中数与最高相似度展示",
        ],
        limit: [
          "活性评分为序列特征估算，未纳入染色质可及性、DNA 甲基化等表观遗传因素",
          "脱靶筛查限于 ≤3 错配的完全对齐命中；RNA / DNA 泡形结构或插入/缺失错配不在范围内",
          "编辑效率和脱靶切割需在细胞系中实测验证",
          "不提供 HDR 供体模板设计",
        ],
      },
      {
        tag: "BLAST",
        color: "#3b82f6",
        title: "BLAST 序列比对",
        solid: [
          "NCBI BLAST（blastn / blastp / blastx / tblastn）标准查询",
          "E-value、比对得分、覆盖率、Identity% 完整展示",
          "支持自定义序列输入",
          "结果中展示物种来源与 GenBank 登录号",
        ],
        limit: [
          "依赖 NCBI 服务器响应速度（高峰期可能超时）",
          "结果时效性取决于 NCBI 数据库更新周期",
          "不做 MSA（多序列比对）或系统发育分析",
        ],
      },
    ],

    signalTitle: "如何读懂特异性状态标签",
    signalItems: [
      {
        signal: "✓ 特异",
        meaning: "Bowtie2 / BLAST 仅找到唯一高相似度命中，或脱靶命中数 ≤2 且脱靶相似度 <80%。可作为第一选择，仍建议凝胶或溶解曲线验证。",
        tone: "green",
      },
      {
        signal: "⚠ 潜在脱靶",
        meaning: "发现 >2 处 ≥80% 相似度的脱靶命中，或命中位置落在多个基因座。建议检查脱靶位点的基因功能后再决定是否使用。",
        tone: "amber",
      },
      {
        signal: "✗ 非特异",
        meaning: "存在多处高相似度（>90%）脱靶命中，该引物或 gRNA 在基因组中重复出现。强烈建议优先选用排名靠前的特异性引物。",
        tone: "red",
      },
      {
        signal: "— 无命中",
        meaning: "当前筛查后端未返回满足条件的命中。应结合结果中标注的数据库范围解读；BLAST 无命中不能证明全基因组唯一。",
        tone: "amber",
      },
    ],

    solidLabel: "✓ 覆盖范围",
    limitLabel: "⚠ 边界 / 限制",

    ctaTitle: "准备好了？从这里开始",
    ctaBody: "了解了数据来源和边界，就能更有把握地解读结果——也知道下一步该做什么实验来验证。",
    ctaPrimer: "设计 qPCR 引物",
    ctaMethods: "查看工作原理",
    ctaGrna: "设计 CRISPR gRNA",
  },

  en: {
    badge: "Result Credibility",
    title: "What's behind every column of numbers on the results page",
    intro:
      "PrimerCat doesn't just hand you a ranked list — the results page ships reasoning, specificity status, and design boundaries alongside every result. Here's what each data point comes from, what questions it answers, and where it stops.",

    heroAsideTitle: "Transparency Principle",
    heroAsideBody:
      "Results aren't black-box scores. Every primer pair or gRNA score is traceable on the results page: Tm, GC%, exon-spanning status, Bowtie2 / BLAST hit count… the rationale and design limits are shown together.",
    heroMetricLabel: "Dimensions covered",
    heroMetricValue: "6",
    heroMetricBody: "Each result covers six dimensions: sequence parameters, thermodynamics, specificity evidence, structural risk, exon architecture, and activity estimate.",

    evidenceTitle: "What the results page already tells you",
    evidenceIntro:
      "The six items below are embedded in every result — no extra literature lookup needed. Open the results page and they're right there.",
    evidenceItems: [
      {
        icon: "01",
        title: "Template source & transcript ID",
        body: "The RefSeq primary transcript accession (NM_XXXXXX.X) chosen automatically, exon count, CDS length, and the selection rationale (CDS completeness preferred).",
      },
      {
        icon: "02",
        title: "Thermodynamic parameters",
        body: "Tm, GC%, hairpin ΔG, and 3′-end self-complementarity for both primers — computed by Primer3 at design time; candidates that exceed thresholds are filtered out before ranking.",
      },
      {
        icon: "03",
        title: "Specificity evidence and screening scope",
        body: "The result identifies the backend used. A local index provides genome-level hits; without one, RefSeq RNA BLAST is used and explicitly labeled as transcript-level screening.",
      },
      {
        icon: "04",
        title: "Exon-spanning status",
        body: "Whether the amplicon crosses at least one exon–exon junction (flagged ✓ Exon-spanning or Same exon), plus amplicon length in bp.",
      },
      {
        icon: "05",
        title: "Composite score breakdown",
        body: "Total score combines six sub-scores (Tm delta, GC% deviation, specificity, exon-spanning, amplicon size, primer-end stability) with weighted addition — expand any result card to inspect each sub-score.",
      },
      {
        icon: "06",
        title: "gRNA activity estimate dimensions",
        body: "gRNA results include GC%, seed-region consecutive-G count, PAM-proximal nucleotide preference, and off-target hit count — all sequence-feature estimates; the page already flags 'experimental validation required'.",
      },
    ],

    toolsTitle: "Coverage and boundaries per tool",
    toolsIntro:
      "Below are what each tool explicitly covers (✓) and what it does not handle or where it has known limits (⚠).",
    tools: [
      {
        tag: "qPCR",
        color: "#22c55e",
        title: "qPCR Primer Design",
        solid: [
          "Primer3 thermodynamic filtering (Tm, GC%, hairpin, dimer)",
          "Bowtie2 when an hg38/mm10 index is configured; otherwise batched RefSeq RNA BLAST screening",
          "Exon–exon junction spanning detection (based on RefSeq exon coordinates)",
          "Amplicon size 80–200 bp (qPCR-optimised range)",
          "Composite score ranking (6 weighted sub-scores)",
          "Full design rationale displayed on the results page",
        ],
        limit: [
          "Intronic genomic hits are conservatively flagged as off-target (acceptable for RT-qPCR on cDNA, which lacks introns)",
          "SNP / polymorphism sites not checked — a primer overlapping a common SNP may fail in certain individuals",
          "No wet-lab validation (amplification efficiency curves, melt curves must be verified experimentally)",
          "Primer concentration and buffer conditions are left to the user to optimise",
        ],
      },
      {
        tag: "CRISPR",
        color: "#7c3aed",
        title: "CRISPR gRNA Design",
        solid: [
          "Genome screening when a local index is configured; otherwise an explicitly labeled BLAST fallback",
          "Supports SpCas9 (NGG), SpCas9-NG (NG), Cas12a (TTTV) PAMs",
          "Both-strand full-length scanning",
          "GC%, seed-region consecutive-G, PAM-proximal nucleotide preference scoring",
          "Off-target hit count and top identity displayed",
        ],
        limit: [
          "Activity scores are sequence-feature estimates — chromatin accessibility, DNA methylation, and other epigenetic factors are not considered",
          "Off-target screening limited to ≤3-mismatch end-to-end alignments; RNA/DNA bulge mismatches or indel mismatches are out of scope",
          "Editing efficiency and off-target cleavage must be validated experimentally in your cell line",
          "HDR donor template design is not provided",
        ],
      },
      {
        tag: "BLAST",
        color: "#3b82f6",
        title: "BLAST Sequence Search",
        solid: [
          "Standard NCBI BLAST queries (blastn / blastp / blastx / tblastn)",
          "Full display of E-value, score, coverage, and Identity%",
          "Supports custom sequence input",
          "Species of origin and GenBank accession shown in results",
        ],
        limit: [
          "Dependent on NCBI server response time (may time out during peak hours)",
          "Result freshness depends on the NCBI database update cycle",
          "No MSA (multiple sequence alignment) or phylogenetic analysis",
        ],
      },
    ],

    signalTitle: "How to read specificity status labels",
    signalItems: [
      {
        signal: "✓ Specific",
        meaning: "Bowtie2 / BLAST found only one high-identity hit, or ≤2 off-target hits all below 80% identity. Use as first choice; gel or melt-curve confirmation is still recommended.",
        tone: "green",
      },
      {
        signal: "⚠ Potential off-target",
        meaning: "More than 2 hits with ≥80% identity found, or hits spread across multiple loci. Review the off-target gene functions before committing to this primer or gRNA.",
        tone: "amber",
      },
      {
        signal: "✗ Non-specific",
        meaning: "Multiple high-identity (>90%) off-target hits found — the sequence appears repeatedly in the genome. Strongly prefer higher-ranked specific alternatives.",
        tone: "red",
      },
      {
        signal: "— No hit",
        meaning: "The active screening backend returned no qualifying hit. Interpret this against the database scope shown in the result; no BLAST hit does not prove genome-wide uniqueness.",
        tone: "amber",
      },
    ],

    solidLabel: "✓ Coverage",
    limitLabel: "⚠ Limits / Caveats",

    ctaTitle: "Ready to start?",
    ctaBody: "Understanding where the data comes from — and where it stops — means you can interpret results with confidence and know exactly which experiments to run next.",
    ctaPrimer: "Design qPCR primers",
    ctaMethods: "How it works",
    ctaGrna: "Design CRISPR gRNA",
  },
};

export default function ValidationPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;

  return (
    <main
      className="vp-main"
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "48px 24px 96px",
        display: "flex",
        flexDirection: "column",
        gap: 72,
      }}
    >
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <span
          style={{
            display: "inline-block",
            alignSelf: "flex-start",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--accent)",
            background: "rgba(var(--accent-rgb),0.10)",
            borderRadius: 6,
            padding: "3px 10px",
          }}
        >
          {copy.badge}
        </span>

        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 800,
            lineHeight: 1.2,
            color: "var(--text-1)",
            margin: 0,
          }}
        >
          {copy.title}
        </h1>

        <p style={{ fontSize: 17, lineHeight: 1.75, color: "var(--text-2)", margin: 0, maxWidth: 680 }}>
          {copy.intro}
        </p>

        {/* aside + metric row */}
        <div className="vp-hero-aside-row">
          <div
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "20px 24px",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2)", marginBottom: 8 }}>
              {copy.heroAsideTitle}
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-2)", margin: 0 }}>
              {copy.heroAsideBody}
            </p>
          </div>

          <div
            className="vp-metric-tile"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "20px 24px",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {copy.heroMetricLabel}
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>
              {copy.heroMetricValue}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
              {copy.heroMetricBody}
            </div>
          </div>
        </div>
      </section>

      {/* ── Evidence cards ──────────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)", margin: "0 0 8px" }}>
            {copy.evidenceTitle}
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-2)", margin: 0, lineHeight: 1.7 }}>
            {copy.evidenceIntro}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {copy.evidenceItems.map((item) => (
            <div
              key={item.icon}
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.10em",
                  color: "var(--accent)",
                  background: "rgba(var(--accent-rgb),0.10)",
                  borderRadius: 6,
                  padding: "2px 8px",
                  alignSelf: "flex-start",
                }}
              >
                {item.icon}
              </span>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>
                {item.title}
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-2)", margin: 0 }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Per-tool scope ─────────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)", margin: "0 0 8px" }}>
            {copy.toolsTitle}
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-2)", margin: 0, lineHeight: 1.7 }}>
            {copy.toolsIntro}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {copy.tools.map((tool) => (
            <div
              key={tool.title}
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {/* tool header */}
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: tool.color,
                    background: `${tool.color}18`,
                    borderRadius: 6,
                    padding: "2px 9px",
                  }}
                >
                  {tool.tag}
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>
                  {tool.title}
                </span>
              </div>

              {/* solid + limit columns */}
              <div className="vp-tool-columns">
                <div className="vp-tool-col-solid">
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "#22c55e",
                      marginBottom: 12,
                    }}
                  >
                    {copy.solidLabel}
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                    {tool.solid.map((s, i) => (
                      <li key={i} style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-2)", display: "flex", gap: 7, alignItems: "flex-start" }}>
                        <span style={{ color: "#22c55e", flexShrink: 0, marginTop: 2 }}>✓</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="vp-tool-col-limit">
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "#f59e0b",
                      marginBottom: 12,
                    }}
                  >
                    {copy.limitLabel}
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                    {tool.limit.map((l, i) => (
                      <li key={i} style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-2)", display: "flex", gap: 7, alignItems: "flex-start" }}>
                        <span style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }}>⚠</span>
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Signal guide ──────────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)", margin: 0 }}>
          {copy.signalTitle}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {copy.signalItems.map((item) => {
            const ts = TONE_STYLES[item.tone];
            return (
              <div
                key={item.signal}
                className="vp-signal-row"
                style={{
                  border: `1px solid ${ts.border}`,
                }}
              >
                <div
                  className="vp-signal-label"
                  style={{
                    background: ts.bg,
                    borderRight: `1px solid ${ts.border}`,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: ts.dot,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: ts.dot }}>
                    {item.signal}
                  </span>
                </div>
                <div className="vp-signal-body">
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "var(--text-2)" }}>
                    {item.meaning}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "36px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)", margin: 0 }}>
          {copy.ctaTitle}
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--text-2)", margin: 0, maxWidth: 520 }}>
          {copy.ctaBody}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
          <Link
            href="/primer"
            style={{
              display: "inline-block",
              padding: "10px 22px",
              borderRadius: 8,
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            {copy.ctaPrimer}
          </Link>
          <Link
            href="/methods"
            style={{
              display: "inline-block",
              padding: "10px 22px",
              borderRadius: 8,
              background: "var(--surface-3)",
              color: "var(--text-1)",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              border: "1px solid var(--border)",
            }}
          >
            {copy.ctaMethods}
          </Link>
          <Link
            href="/grna"
            style={{
              display: "inline-block",
              padding: "10px 22px",
              borderRadius: 8,
              background: "var(--surface-3)",
              color: "var(--text-1)",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              border: "1px solid var(--border)",
            }}
          >
            {copy.ctaGrna}
          </Link>
        </div>
      </section>
    </main>
  );
}
