const COPY = {
  zh: {
    badge: "联系我们",
    title: "联系 PrimerCat",
    intro: "如有问题、反馈或合作意向，请通过以下方式联系我们。",
    emailLabel: "电子邮件",
    email: "zihaowangs@proton.me",
    responseNote: "我们通常在 1-3 个工作日内回复邮件。",
    topicsTitle: "常见联系原因",
    topics: [
      "工具使用问题或 Bug 反馈",
      "功能建议或新需求",
      "学术合作与数据共享",
      "赞助与支持项目",
    ],
  },
  en: {
    badge: "Contact",
    title: "Contact PrimerCat",
    intro: "For questions, feedback, or collaboration inquiries, please reach out via the contact below.",
    emailLabel: "Email",
    email: "zihaowangs@proton.me",
    responseNote: "We typically respond within 1–3 business days.",
    topicsTitle: "Common Reasons to Contact",
    topics: [
      "Tool usage questions or bug reports",
      "Feature requests or suggestions",
      "Academic collaboration and data sharing",
      "Sponsorship and support",
    ],
  },
} as const;

export default function ContactPage({ params: { locale } }: { params: { locale: string } }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;

  return (
    <div className="story-page">
      <section
        className="story-hero"
        style={{
          padding: "34px clamp(22px, 4vw, 40px)",
          borderRadius: 34,
          background: "radial-gradient(circle at top right, rgba(44,82,130,0.2), transparent 35%), linear-gradient(135deg, #071224 0%, #0f2040 58%, #1e4480 100%)",
          color: "#fff",
          boxShadow: "0 28px 64px rgba(15,23,42,0.18)",
        }}
      >
        <div className="story-kicker">{copy.badge}</div>
        <h1 className="story-display" style={{ margin: "16px 0 14px", maxWidth: 820 }}>{copy.title}</h1>
        <p className="story-copy" style={{ color: "rgba(255,255,255,0.84)", maxWidth: 680 }}>{copy.intro}</p>
      </section>

      <section className="story-surface" style={{ padding: "32px clamp(20px, 4vw, 36px)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 14 }}>
          {copy.emailLabel}
        </div>
        <a
          href={`mailto:${copy.email}`}
          style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)", textDecoration: "none", letterSpacing: "-0.01em" }}
        >
          {copy.email}
        </a>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 10 }}>{copy.responseNote}</p>
      </section>

      <section className="story-surface" style={{ padding: "24px clamp(20px, 4vw, 36px)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 14 }}>
          {copy.topicsTitle}
        </div>
        <div className="story-bullet-list">
          {copy.topics.map((t) => (
            <div key={t} className="story-bullet">{t}</div>
          ))}
        </div>
      </section>
    </div>
  );
}
