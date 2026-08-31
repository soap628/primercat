import { Link } from "@/navigation";

const TONE_STYLES: Record<string, { bg: string; border: string; dot: string }> = {
  green: { bg: "rgba(34,197,94,0.07)",  border: "rgba(34,197,94,0.22)",  dot: "#22c55e" },
  amber: { bg: "rgba(251,191,36,0.07)", border: "rgba(251,191,36,0.25)", dot: "#f59e0b" },
  red:   { bg: "rgba(239,68,68,0.07)",  border: "rgba(239,68,68,0.20)",  dot: "#ef4444" },
};

const COPY = {
  zh: {
    badge: "结果依据与边界",
    title: "如何解读计算结果",
    intro:
      "结果页同时展示参数、评分依据、筛查状态与适用边界。这里说明各项数据来自哪里、可支持什么判断，以及不能替代哪些验证。",

    heroAsideTitle: "判读原则",
    heroAsideBody:
      "评分用于比较候选，不代表实验成功率。Tm、GC%、跨外显子状态、Bowtie2 / BLAST 命中等证据与限制会在结果页分别标注。",
    heroMetricLabel: "主要证据维度",
    heroMetricValue: "6 项",
    heroMetricBody: "不同工具按需展示序列参数、热力学特性、特异性证据、结构风险、外显子结构与活性估算。",

    evidenceTitle: "结果页提供的主要证据",
    evidenceIntro:
      "不同工具会显示下列相关信息。具体字段以当前结果页为准，方法与阈值仍应结合实验体系复核。",
    evidenceItems: [
      {
        icon: "01",
        title: "模板来源与转录本 ID",
        body: "系统从 NCBI RefSeq 按规则选择的参考转录本编号（NM_XXXXXX.X）、外显子数量、CDS 长度及选择依据。",
      },
      {
        icon: "02",
        title: "热力学参数",
        body: "左右引物的 Tm（熔解温度）、GC%、发卡 Tm 与 3' 端自互补参数由 Primer3 计算；候选按当前约束条件生成和筛选。",
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
        body: "总分由 Tm、GC%、当前特异性证据、外显子跨越和二聚体风险五项加权合并；每项得分可在结果卡中查看。",
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
          "综合评分排序（5 项加权）",
          "设计依据完整展示在结果页",
        ],
        limit: [
          "基因组 DNA 中的内含子命中被保守标记为脱靶（RT-qPCR 的 cDNA 模板不含内含子，此保守性可接受）",
          "SNP / 多态性位点不检查——引物覆盖区域若含常见 SNP 可能导致扩增失败",
          "不做湿实验验证（扩增效率、熔解曲线和产物大小需自行验证）",
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

    signalTitle: "如何解读筛查状态",
    signalItems: [
      {
        signal: "✓ 未见明显非目标命中",
        meaning: "当前后端与阈值下未发现需要警示的非目标命中。该状态仅适用于结果页标注的数据库和筛查范围，仍需凝胶、熔解曲线或其他实验验证。",
        tone: "green",
      },
      {
        signal: "⚠ 需要复核",
        meaning: "发现潜在非目标命中、筛查范围受限或证据不完整。使用前应查看命中位置、相似度、产物长度和数据库范围。",
        tone: "amber",
      },
      {
        signal: "✗ 存在明显非目标风险",
        meaning: "当前筛查发现多个高相似度非目标命中。应优先比较其他候选，并在使用前进行更完整的计算与实验验证。",
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

    ctaTitle: "查看结果前，先确认筛查范围",
    ctaBody: "先确认模板、数据库、阈值和未覆盖风险，再决定需要补充哪些计算或实验验证。",
    ctaPrimer: "设计 qPCR 引物",
    ctaMethods: "查看工作原理",
    ctaGrna: "设计 CRISPR gRNA",
  },

  en: {
    badge: "Evidence & Boundaries",
    title: "How to interpret computational results",
    intro:
      "Result pages display parameters, ranking evidence, screening status, and scope boundaries together. This page explains where those values come from, what they support, and which validations they cannot replace.",

    heroAsideTitle: "Interpretation principle",
    heroAsideBody:
      "Scores compare candidates; they are not experimental success rates. Evidence such as Tm, GC%, exon-spanning status, and Bowtie2 or BLAST hits is shown separately from its limitations.",
    heroMetricLabel: "Main evidence dimensions",
    heroMetricValue: "6",
    heroMetricBody: "Tools display the relevant subset of sequence parameters, thermodynamics, specificity evidence, structural risk, exon architecture, and activity estimates.",

    evidenceTitle: "Evidence provided on result pages",
    evidenceIntro:
      "Different tools display the relevant items below. Review the current result page and interpret its methods and thresholds in the context of your assay.",
    evidenceItems: [
      {
        icon: "01",
        title: "Template source & transcript ID",
        body: "The RefSeq transcript accession (NM_XXXXXX.X) selected by stated rules, exon count, CDS length, and selection rationale.",
      },
      {
        icon: "02",
        title: "Thermodynamic parameters",
        body: "Tm, GC%, hairpin Tm, and 3′-end self-complementarity parameters for both primers are computed by Primer3; candidates are generated and filtered under the active constraints.",
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
        body: "Total score combines five weighted dimensions: Tm, GC%, available specificity evidence, exon-spanning design, and dimer risk. Expand a result card to inspect each score.",
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
          "Composite score ranking (5 weighted dimensions)",
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

    signalTitle: "How to read screening-status labels",
    signalItems: [
      {
        signal: "✓ No evident non-target hit",
        meaning: "No reportable non-target hit was found under the active backend and thresholds. This applies only to the database and scope shown on the result page; gel, melt-curve, or other experimental confirmation is still required.",
        tone: "green",
      },
      {
        signal: "⚠ Review required",
        meaning: "Potential non-target hits, limited screening scope, or incomplete evidence was detected. Review hit locations, identity, product size, and database scope before use.",
        tone: "amber",
      },
      {
        signal: "✗ Evident non-target risk",
        meaning: "The active screen found multiple high-identity non-target hits. Compare other candidates and perform more complete computational and experimental validation before use.",
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

    ctaTitle: "Confirm the screening scope before using a result",
    ctaBody: "Review the template, database, thresholds, and uncovered risks before deciding which additional computational or experimental checks are required.",
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
      className="vp-main validation-page-v6"
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
