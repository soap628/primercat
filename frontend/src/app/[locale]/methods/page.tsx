import { Link } from "@/navigation";

const COPY = {
  zh: {
    badge: "工作原理",
    title: "PrimerCat 如何设计 qPCR 引物",
    intro:
      "从输入基因名到获得验证好的候选引物，系统自动完成以下四个步骤，并把设计依据和结论边界一起带回来。",
    whyTitle: "为什么结果比普通引物列表更可信",
    whyCards: [
      {
        title: "完整的设计链路",
        body: "转录本选择、Primer3 设计、BLAST 筛查到结果解释，每个环节都在同一个工作流中自动完成。",
      },
      {
        title: "结果附带推荐理由",
        body: "结果页不只给出引物序列，还展示设计依据、BLAST 状态和每对引物的具体推荐理由。",
      },
      {
        title: "边界说清楚",
        body: "BLAST 校验明确标注为转录本层面初筛，不会被包装成全基因组 PCR 验证，用户不需要自己去猜。",
      },
    ],
    qpcrTitle: "四步工作流",
    qpcrIntro:
      "这套流程的价值不在于调用了多少服务，而在于每一步都为用户减少了不确定性，并把决策依据留在结果页。",
    qpcrSteps: [
      {
        title: "1. 选取最佳转录本",
        body: "在基因名模式下，系统实时查询 NCBI RefSeq，筛选 NM_ 编码转录本，优先选取 CDS 完整、外显子最多的主要转录本作为设计模板。",
      },
      {
        title: "2. Primer3 生成候选引物",
        body: "基于转录本序列，Primer3 在 Tm、GC%、产物长度、发卡和自互补等约束下生成候选引物，按 penalty 预筛选最优候选。",
      },
      {
        title: "3. RefSeq RNA BLAST 筛查",
        body: "候选引物并发提交至 NCBI BLAST refseq_rna 数据库，检查转录本层面的非目标命中情况，提前过滤明显不理想的候选。",
      },
      {
        title: "4. 综合评分与结果展示",
        body: "引物按 Tm、GC%、BLAST 状态、跨外显子能力和二聚体风险五维打分排序。结果页同时展示设计依据、推荐理由和扩增子信息。",
      },
    ],
    qpcrReadTitle: "结果页展示什么",
    qpcrReadItems: [
      "本次设计使用的转录本及主要约束参数",
      "每对引物的 checklist、BLAST 状态、扩增子序列和引物性质",
      "为什么这对引物排在当前位置的具体推荐理由",
    ],
    qpcrBoundaryTitle: "需要了解的范围边界",
    qpcrBoundaryBody:
      "RefSeq RNA BLAST 提升的是转录本层面的可信度，不等同于全基因组 PCR 特异性验证。这个边界会在产品页面中明确标注，不会让用户误解。",
    extraTitle: "其他可用工具",
    extraBody:
      "CRISPR gRNA 设计和 BLAST 序列比对仍然保留，可在需要时作为配套工具随时调用。",
    extraCards: [
      {
        title: "CRISPR gRNA Design",
        body: "PAM 位点扫描，活性评分排序，脱靶风险分层，适合 CRISPR 实验设计的初筛工作台。",
      },
      {
        title: "BLAST Alignment",
        body: "对接 NCBI BLAST，适合对任意序列做快速比对检查，可作为 qPCR 设计后的补充验证。",
      },
    ],
    sourceTitle: "数据来源",
    sources: [
      "NCBI RefSeq：转录本和模板序列",
      "Primer3：引物设计算法",
      "NCBI BLAST：RefSeq RNA 转录本层面筛查",
    ],
    ctaTitle: "下一步",
    ctaBody: "想直接体验引物设计，打开 qPCR 页面。想了解结果的可信度边界，查看可信度页面。",
    ctaPrimer: "打开引物设计",
    ctaValidation: "查看可信度",
    ctaTools: "更多工具",
  },
  en: {
    badge: "How It Works",
    title: "How PrimerCat designs qPCR primers",
    intro:
      "From gene name to validated candidate primers, the system runs four steps automatically and returns the design logic and result boundaries alongside the candidates.",
    whyTitle: "Why these results are more defensible than a plain primer list",
    whyCards: [
      {
        title: "End-to-end workflow",
        body: "Transcript selection, Primer3 design, BLAST screening, and result explanation are all part of the same automated chain.",
      },
      {
        title: "Results come with reasoning",
        body: "The result page returns design basis, BLAST status, and the specific rationale behind each primer pair's ranking.",
      },
      {
        title: "Claim boundaries are explicit",
        body: "BLAST validation is labeled as transcript-level evidence, not genome-wide PCR validation — no guesswork required.",
      },
    ],
    qpcrTitle: "Four-step workflow",
    qpcrIntro:
      "What makes this useful is not the number of services involved, but that each step reduces uncertainty and leaves a traceable record on the result page.",
    qpcrSteps: [
      {
        title: "1. Select the best transcript",
        body: "In gene mode, the system queries NCBI RefSeq in real time, filters NM_ protein-coding transcripts, and selects the canonical transcript with complete CDS and the most exons as the design template.",
      },
      {
        title: "2. Generate candidates with Primer3",
        body: "Primer3 runs on the transcript sequence under Tm, GC%, product size, hairpin, and self-complementarity constraints, pre-filtering to the best candidates by penalty score.",
      },
      {
        title: "3. RefSeq RNA BLAST screening",
        body: "All candidate primers are submitted concurrently to NCBI BLAST against the refseq_rna database, screening for transcript-level off-target hits before final ranking.",
      },
      {
        title: "4. Score, rank, and explain",
        body: "Primers are ranked across five dimensions — Tm, GC%, BLAST status, exon-spanning design, and dimer risk. The result page shows design basis, ranking rationale, and amplicon evidence.",
      },
    ],
    qpcrReadTitle: "What you see on the result page",
    qpcrReadItems: [
      "Which transcript was used and what design constraints were applied",
      "Checklist state, BLAST hits, amplicon sequence, and primer properties for each pair",
      "The specific reasoning behind each pair's position in the ranking",
    ],
    qpcrBoundaryTitle: "Important scope boundary",
    qpcrBoundaryBody:
      "RefSeq RNA BLAST improves transcript-level confidence. It is not the same as genome-wide PCR specificity validation, and this distinction is stated clearly throughout the UI.",
    extraTitle: "Other available tools",
    extraBody:
      "CRISPR gRNA design and BLAST sequence alignment remain available as supporting tools to complement the qPCR workflow.",
    extraCards: [
      {
        title: "CRISPR gRNA Design",
        body: "PAM site scanning, activity score ranking, and off-target risk tiers — a useful first-pass screening workbench for CRISPR experiment planning.",
      },
      {
        title: "BLAST Alignment",
        body: "Connects to NCBI BLAST for quick sequence comparisons, useful as a follow-up check after qPCR design or for other sequence analysis.",
      },
    ],
    sourceTitle: "Data sources",
    sources: [
      "NCBI RefSeq: transcript and template sequences",
      "Primer3: primer design algorithm",
      "NCBI BLAST: RefSeq RNA transcript-level screening",
    ],
    ctaTitle: "What to do next",
    ctaBody: "Open the qPCR page to try primer design directly. Open the Trust page to understand the confidence boundaries behind the results.",
    ctaPrimer: "Open Primer Design",
    ctaValidation: "Open Trust Page",
    ctaTools: "More Tools",
  },
} as const;

export default function MethodsPage({ params: { locale } }: { params: { locale: string } }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;
  const heroAsideTitle = locale === "zh" ? "这页解释什么" : "What This Page Covers";
  const heroAsideBody = locale === "zh"
    ? "从转录本选择到引物排序，解释每个环节如何减少不确定性，以及结果的边界在哪里。"
    : "How each step reduces uncertainty — from transcript selection to primer ranking — and where the result boundaries lie.";
  const heroMetricLabel = locale === "zh" ? "主流程" : "Core Flow";
  const heroMetricValue = locale === "zh" ? "RefSeq → Primer3 → BLAST" : "RefSeq → Primer3 → BLAST";
  const heroMetricBody = locale === "zh"
    ? "先选模板，再设计引物，再做 transcript-level 筛查，最后把推荐理由写回结果页。"
    : "Select a template, design primers, screen at transcript level, then return the rationale on the result page.";
  const workflowLabel = locale === "zh" ? "qPCR" : "qPCR";
  const sourceLabel = locale === "zh" ? "Data Sources" : "Data Sources";
  const toolsLabel = locale === "zh" ? "Supporting Tools" : "Supporting Tools";
  const ctaLabel = locale === "zh" ? "Next Step" : "Next Step";

  return (
    <div className="story-page">
      <section
        className="story-hero"
        style={{
          padding: "34px clamp(22px, 4vw, 40px)",
          borderRadius: 34,
          background:
            "radial-gradient(circle at top right, rgba(15,106,69,0.16), transparent 28%), linear-gradient(135deg, #071224 0%, #0d2238 58%, #103952 100%)",
          color: "#fff",
          boxShadow: "0 28px 64px rgba(15,23,42,0.18)",
        }}
      >
        <div className="story-hero-grid">
          <div className="story-hero-panel">
            <div className="story-kicker">{copy.badge}</div>
            <h1 className="story-display" style={{ margin: "16px 0 14px", maxWidth: 920 }}>
              {copy.title}
            </h1>
            <p className="story-copy" style={{ color: "rgba(255,255,255,0.84)", maxWidth: 920 }}>{copy.intro}</p>
          </div>

          <aside className="story-hero-aside">
            <div className="story-mini-label">{heroAsideTitle}</div>
            <div className="story-mini-body" style={{ marginTop: 10 }}>{heroAsideBody}</div>
            <div className="story-mini-metric">
              <div className="story-mini-label">{heroMetricLabel}</div>
              <div className="story-mini-value">{heroMetricValue}</div>
              <div className="story-mini-body">{heroMetricBody}</div>
            </div>
          </aside>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-1)" }}>{copy.whyTitle}</div>
        <div className="story-card-grid">
          {copy.whyCards.map((card) => (
            <div
              key={card.title}
              className="tool-card story-card"
            >
              <div className="story-card-title">{card.title}</div>
              <p className="story-card-copy">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="story-surface story-split"
        style={{
          padding: "24px clamp(20px, 4vw, 30px)",
        }}
      >
        <div className="story-column">
          <div style={{ maxWidth: 920, marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0f6a45", marginBottom: 10 }}>
              {workflowLabel}
            </div>
            <h2 style={{ fontSize: 30, letterSpacing: "-0.04em", color: "var(--text-1)", marginBottom: 10 }}>{copy.qpcrTitle}</h2>
            <p style={{ fontSize: 14, lineHeight: 1.85, color: "var(--text-2)" }}>{copy.qpcrIntro}</p>
          </div>
          <div className="story-column">
            {copy.qpcrSteps.map((step) => (
              <div
                key={step.title}
                className="tool-card story-card"
              >
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>{step.title}</div>
                <p className="story-card-copy">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="story-column">
          <div className="tool-card story-card">
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0f6a45", marginBottom: 10 }}>
                {copy.qpcrReadTitle}
              </div>
              <div className="story-bullet-list">
                {copy.qpcrReadItems.map((item) => (
                  <div key={item} className="story-bullet">
                    {item}
                  </div>
                ))}
              </div>
          </div>

          <div className="tool-card story-note-card">
            <div className="story-note-title">{copy.qpcrBoundaryTitle}</div>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text-2)", margin: 0 }}>{copy.qpcrBoundaryBody}</p>
          </div>
        </div>
      </section>

      <section
        className="story-surface"
        style={{
          padding: 20,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c2d12", marginBottom: 10 }}>
          {sourceLabel}
        </div>
        <div className="story-card-grid">
          {copy.sources.map((item) => (
            <div key={item} className="story-card">
              <div className="story-card-copy">{item}</div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="story-surface"
        style={{
          padding: "24px clamp(20px, 4vw, 30px)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1d4ed8", marginBottom: 10 }}>
          {toolsLabel}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-1)", marginBottom: 10 }}>{copy.extraTitle}</div>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-2)", marginBottom: 14 }}>{copy.extraBody}</p>
        <div className="story-card-grid">
          {copy.extraCards.map((card) => (
            <div key={card.title} className="tool-card story-card">
              <div className="story-card-title">{card.title}</div>
              <p className="story-card-copy">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="story-cta-panel"
        style={{
          padding: "26px clamp(20px, 4vw, 30px)",
          background: "linear-gradient(135deg, #0b1e3e, #15324b)",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.68)", marginBottom: 10 }}>
          {ctaLabel}
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.85, color: "rgba(255,255,255,0.84)", maxWidth: 920 }}>{copy.ctaBody}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <Link href="/primer">
            <button className="hero-btn-primary">{copy.ctaPrimer}</button>
          </Link>
          <Link href="/validation">
            <button className="hero-btn-secondary">{copy.ctaValidation}</button>
          </Link>
          <Link href="/tools">
            <button className="hero-btn-secondary">{copy.ctaTools}</button>
          </Link>
        </div>
      </section>
    </div>
  );
}
