import { Link } from "@/navigation";

const COPY = {
  zh: {
    badge: "可信度",
    title: "结果的可信度从何而来",
    intro:
      "这页解释 PrimerCat 的结果在哪些方面有充分依据、哪些方面仍需进一步验证，以及如何正确理解 BLAST 状态标注。",
    qpcrTitle: "qPCR 引物设计已经能提供什么",
    qpcrIntro:
      "每次设计都附带了足够的依据和边界标注，让用户在实验前就能对候选引物有清晰的判断，而不是盲目信任一个黑盒分数。",
    qpcrGoodTitle: "这些方面已经有说服力",
    qpcrGood: [
      "在物种上下文中自动选取最合适的 RefSeq 转录本作为设计模板",
      "结果页直接展示设计依据、筛查状态、扩增子和推荐理由",
      "BLAST 失败不会被误报为已通过特异性验证",
      "转录本层面证据与全基因组结论在产品中已明确区分",
    ],
    qpcrCareTitle: "用户仍需自行确认",
    qpcrCare: [
      "RefSeq RNA BLAST 不等同于全基因组 PCR 特异性验证",
      "正式实验前建议结合更高层级的 in-silico 分析或湿实验验证",
    ],
    positioningTitle: "如何向他人介绍这个工具",
    positioningCards: [
      {
        title: "适合这样描述",
        body: "可审计的 qPCR 引物设计工具，结果附带设计依据和明确的结论边界。",
      },
      {
        title: "避免这样描述",
        body: "不要用「保证准确」「完全验证」「临床级别」等措辞，这类说法会让专业用户立刻产生警惕。",
      },
      {
        title: "最准确的定位",
        body: "面向科研用途的 qPCR 引物设计工具，以透明的工作流和清晰的结论边界见长。",
      },
    ],
    extraTitle: "其他工具如何理解",
    extraIntro:
      "CRISPR gRNA 设计和 BLAST 比对仍然可用，更适合作为配套能力理解，在需要时调用。",
    extraCards: [
      {
        title: "CRISPR gRNA",
        body: "有脱靶证据层，适合作为 CRISPR 实验设计的初筛工作台。功能实用，通过 More Tools 可随时访问。",
      },
      {
        title: "BLAST",
        body: "作为配套序列工具，适合在 qPCR 设计或其他分析任务后做快速比对检查。",
      },
    ],
    reasonTitle: "清楚的边界反而更有说服力",
    reasonBody:
      "长期使用科研工具的人，更愿意信任那些清楚知道自己能做什么、不能做什么的工具。PrimerCat 把结论边界直接写在产品里，而不是等用户自己去猜。",
    ctaPrimer: "打开引物设计",
    ctaMethods: "了解工作原理",
    ctaTools: "更多工具",
  },
  en: {
    badge: "Trust",
    title: "Where this tool's confidence comes from",
    intro:
      "This page explains what PrimerCat results are well-supported for, what still needs user verification, and how to read the BLAST validation status correctly.",
    qpcrTitle: "What the qPCR primer design already delivers",
    qpcrIntro:
      "Results come with enough evidence and labeled boundaries that users can form a clear picture of each candidate before going to the bench — not just a score to trust blindly.",
    qpcrGoodTitle: "What is already solid",
    qpcrGood: [
      "Automatically selects the most suitable RefSeq transcript in species context before primer design",
      "Result page shows design basis, screening status, amplicon evidence, and ranking rationale",
      "BLAST failures are not reported as specificity passes",
      "Transcript-level evidence and genome-wide claims are clearly separated throughout the UI",
    ],
    qpcrCareTitle: "What you still need to verify",
    qpcrCare: [
      "RefSeq RNA BLAST is not the same as genome-wide PCR specificity validation",
      "Formal experimental use should include stronger in-silico checks or wet-lab validation",
    ],
    positioningTitle: "How to describe this tool",
    positioningCards: [
      {
        title: "Accurate framing",
        body: "Auditable qPCR primer design — results include design basis and explicit confidence boundaries.",
      },
      {
        title: "Avoid",
        body: "Words like guaranteed, fully validated, or clinical-grade will immediately prompt skepticism from experienced researchers.",
      },
      {
        title: "Best positioning",
        body: "A research-use qPCR primer design tool with transparent workflow and clearly labeled result boundaries.",
      },
    ],
    extraTitle: "The additional tools",
    extraIntro:
      "CRISPR gRNA design and BLAST alignment remain useful supporting capabilities — available whenever you need them.",
    extraCards: [
      {
        title: "CRISPR gRNA",
        body: "Has evidence layers and clear status reporting — a practical first-pass screening workbench, accessible through More Tools.",
      },
      {
        title: "BLAST",
        body: "A supporting sequence utility for quick follow-up checks after qPCR design or other analysis work.",
      },
    ],
    reasonTitle: "Honest boundaries build more trust",
    reasonBody:
      "Researchers who rely on scientific tools over time trust the ones that are clear about what they can and cannot prove. PrimerCat states its result boundaries directly rather than leaving users to figure them out.",
    ctaPrimer: "Open Primer Design",
    ctaMethods: "How It Works",
    ctaTools: "More Tools",
  },
} as const;

function BulletBlock({
  title,
  intro,
  goodTitle,
  goodItems,
  careTitle,
  careItems,
}: {
  title: string;
  intro: string;
  goodTitle: string;
  goodItems: ReadonlyArray<string>;
  careTitle: string;
  careItems: ReadonlyArray<string>;
}) {
  return (
    <section
      style={{
        padding: "24px clamp(20px, 4vw, 30px)",
        borderRadius: 32,
        background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))",
        border: "1px solid rgba(148,163,184,0.16)",
        boxShadow: "0 18px 36px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ maxWidth: 920, marginBottom: 18 }}>
        <h2 style={{ fontSize: 30, letterSpacing: "-0.04em", color: "var(--text-1)", marginBottom: 10 }}>{title}</h2>
        <p style={{ fontSize: 14, lineHeight: 1.85, color: "var(--text-2)" }}>{intro}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <div
          className="tool-card"
          style={{
            padding: 18,
            borderRadius: 24,
            background: "rgba(244,250,246,0.92)",
            border: "1px solid rgba(15,106,69,0.16)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0f6a45", marginBottom: 10 }}>
            {goodTitle}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {goodItems.map((item) => (
              <div
                key={item}
                style={{
                  padding: "10px 12px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.86)",
                  border: "1px solid rgba(148,163,184,0.12)",
                  fontSize: 13,
                  lineHeight: 1.75,
                  color: "var(--text-2)",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div
          className="tool-card"
          style={{
            padding: 18,
            borderRadius: 24,
            background: "rgba(255,248,235,0.92)",
            border: "1px solid rgba(245,158,11,0.18)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#b45309", marginBottom: 10 }}>
            {careTitle}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {careItems.map((item) => (
              <div
                key={item}
                style={{
                  padding: "10px 12px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.86)",
                  border: "1px solid rgba(245,158,11,0.14)",
                  fontSize: 13,
                  lineHeight: 1.75,
                  color: "var(--text-2)",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ValidationPage({ params: { locale } }: { params: { locale: string } }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;
  const heroAsideTitle = locale === "zh" ? "核心结论" : "Short Answer";
  const heroAsideBody = locale === "zh"
    ? "qPCR 引物设计是目前最完整的功能，有清晰的流程和边界标注。其他工具可配合使用。"
    : "The most well-supported feature here is qPCR primer design. The other tools are useful but work best as supporting capabilities.";
  const heroMetricLabel = locale === "zh" ? "主承诺" : "Main Promise";
  const heroMetricValue = locale === "zh" ? "Auditable qPCR" : "Auditable qPCR";
  const heroMetricBody = locale === "zh"
    ? "核心可信度来自透明的流程、真实的筛查状态和明确的边界，而不是更大的宣传口号。"
    : "Credibility comes from transparent workflow, explicit screening state, and clear boundaries — not louder claims.";
  const positioningLabel = locale === "zh" ? "Public Framing" : "Public Framing";
  const supportingLabel = locale === "zh" ? "Supporting Tools" : "Supporting Tools";
  const reasonLabel = locale === "zh" ? "Trust Direction" : "Trust Direction";

  return (
    <div className="story-page">
      <section
        className="story-hero"
        style={{
          padding: "34px clamp(22px, 4vw, 40px)",
          borderRadius: 34,
          background:
            "radial-gradient(circle at top right, rgba(15,106,69,0.16), transparent 30%), linear-gradient(135deg, #071224 0%, #10263c 58%, #0f6a45 100%)",
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

      <BulletBlock
        title={copy.qpcrTitle}
        intro={copy.qpcrIntro}
        goodTitle={copy.qpcrGoodTitle}
        goodItems={copy.qpcrGood}
        careTitle={copy.qpcrCareTitle}
        careItems={copy.qpcrCare}
      />

      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-1)" }}>{copy.positioningTitle}</div>
        <div className="story-card-grid">
          {copy.positioningCards.map((card) => (
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
        className="story-surface"
        style={{
          padding: "24px clamp(20px, 4vw, 30px)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1d4ed8", marginBottom: 10 }}>
          {supportingLabel}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-1)", marginBottom: 10 }}>{copy.extraTitle}</div>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-2)", marginBottom: 14 }}>{copy.extraIntro}</p>
        <div className="story-card-grid">
          {copy.extraCards.map((card) => (
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
        className="story-cta-panel"
        style={{
          padding: "24px clamp(20px, 4vw, 30px)",
          background: "linear-gradient(135deg, #0b1e3e, #15324b)",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.68)", marginBottom: 10 }}>
          {reasonLabel}
        </div>
        <div style={{ fontSize: 28, lineHeight: 1.08, letterSpacing: "-0.04em", marginBottom: 10 }}>{copy.reasonTitle}</div>
        <p style={{ fontSize: 14, lineHeight: 1.85, color: "rgba(255,255,255,0.84)", maxWidth: 920 }}>{copy.reasonBody}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <Link href="/primer">
            <button className="hero-btn-primary">{copy.ctaPrimer}</button>
          </Link>
          <Link href="/methods">
            <button className="hero-btn-secondary">{copy.ctaMethods}</button>
          </Link>
          <Link href="/tools">
            <button className="hero-btn-secondary">{copy.ctaTools}</button>
          </Link>
        </div>
      </section>
    </div>
  );
}
