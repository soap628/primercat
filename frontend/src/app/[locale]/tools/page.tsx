import { Link } from "@/navigation";

const COPY = {
  zh: {
    badge: "More Tools",
    title: "更多工具",
    intro:
      "除 qPCR 引物设计外，PrimerCat 还提供以下工具，可在需要时随时使用。",
    note: "如果你是第一次使用，建议先从 qPCR 引物设计页面开始。",
    cards: [
      {
        eyebrow: "CRISPR",
        title: "gRNA 设计",
        body: "支持 SpCas9 / SpCas9-NG / Cas12a，全序列 PAM 扫描，活性评分排序，脱靶风险分层，适合 CRISPR 实验设计的初筛。",
        href: "/grna",
        cta: "打开 gRNA 工具",
      },
      {
        eyebrow: "序列分析",
        title: "BLAST 比对",
        body: "对接 NCBI BLAST，支持 blastn / blastp / blastx 等多种程序，比对详情可视化展开，适合快速做补充检查。",
        href: "/blast",
        cta: "打开 BLAST",
      },
    ],
    whyTitle: "这些工具的定位",
    whyItems: [
      "CRISPR gRNA 设计和 BLAST 都是有价值的辅助工具，与 qPCR 引物设计配合使用效果最好。",
      "已集成到同一个平台，无需切换工具或重复登录。",
      "将持续维护更新，随时可用。",
    ],
    primaryCta: "回到引物设计",
    secondaryCta: "了解工作原理",
  },
  en: {
    badge: "More Tools",
    title: "More Tools",
    intro:
      "Beyond qPCR primer design, PrimerCat includes the following tools, available whenever you need them.",
    note: "If this is your first visit, the qPCR primer design page is the best place to start.",
    cards: [
      {
        eyebrow: "CRISPR",
        title: "gRNA Design",
        body: "Supports SpCas9 / SpCas9-NG / Cas12a with full-sequence PAM scanning, activity score ranking, and off-target risk tiers — a practical first-pass screening tool for CRISPR experiment planning.",
        href: "/grna",
        cta: "Open gRNA Tool",
      },
      {
        eyebrow: "Sequence Analysis",
        title: "BLAST Alignment",
        body: "Connects to NCBI BLAST with blastn / blastp / blastx and more. Alignment details expand on click — useful for quick follow-up checks.",
        href: "/blast",
        cta: "Open BLAST",
      },
    ],
    whyTitle: "How these tools fit in",
    whyItems: [
      "Both CRISPR gRNA design and BLAST are useful supporting tools that complement the qPCR workflow.",
      "Integrated into the same platform — no separate logins or tool switching required.",
      "Actively maintained and available at any time.",
    ],
    primaryCta: "Back to Primer Design",
    secondaryCta: "How It Works",
  },
} as const;

export default function ToolsPage({ params: { locale } }: { params: { locale: string } }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;
  const heroAsideTitle = locale === "zh" ? "这些工具的定位" : "What These Tools Are";
  const heroAsideBody = locale === "zh"
    ? "这些工具可与 qPCR 引物设计配合使用，在需要时直接调用。"
    : "These tools work best alongside qPCR primer design — open them when you need them.";
  const heroMetricLabel = locale === "zh" ? "定位" : "Positioning";
  const heroMetricValue = locale === "zh" ? "配套工具" : "Supporting tools";
  const heroMetricBody = locale === "zh"
    ? "无需切换平台或重复登录，随时可用。"
    : "Integrated into the same platform — no switching or separate logins required.";
  const whyLabel = locale === "zh" ? "Why It Works" : "Why It Works";

  return (
    <div className="story-page">
      <section
        className="story-hero"
        style={{
          padding: "34px clamp(22px, 4vw, 40px)",
          borderRadius: 34,
          background:
            "radial-gradient(circle at top right, rgba(29,78,216,0.16), transparent 30%), linear-gradient(135deg, #071224 0%, #10263c 58%, #1d4ed8 100%)",
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
            <div style={{ marginTop: 18, fontSize: 13, lineHeight: 1.8, color: "#dbeafe", maxWidth: 760 }}>{copy.note}</div>
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

      <section className="story-card-grid">
        {copy.cards.map((card) => (
          <Link key={card.title} href={card.href} style={{ textDecoration: "none" }}>
            <div className="tool-card story-card" style={{ height: "100%" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1d4ed8", marginBottom: 10 }}>
                {card.eyebrow}
              </div>
              <div className="story-card-title" style={{ fontSize: 20 }}>{card.title}</div>
              <p className="story-card-copy" style={{ marginBottom: 14 }}>{card.body}</p>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f6a45" }}>{card.cta}</div>
            </div>
          </Link>
        ))}
      </section>

      <section
        className="story-surface"
        style={{
          padding: "24px clamp(20px, 4vw, 30px)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0f6a45", marginBottom: 10 }}>
          {whyLabel}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-1)", marginBottom: 12 }}>{copy.whyTitle}</div>
        <div className="story-bullet-list">
          {copy.whyItems.map((item) => (
            <div key={item} className="story-bullet">
              {item}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <Link href="/primer">
            <button className="hero-btn-primary">{copy.primaryCta}</button>
          </Link>
          <Link href="/methods">
            <button className="hero-btn-secondary">{copy.secondaryCta}</button>
          </Link>
        </div>
      </section>
    </div>
  );
}
