import { Link } from "@/navigation";
import { getTranslations } from "next-intl/server";

export default async function ToolsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "tools" });

  const cards = [
    {
      eyebrow: t("card_fund_eyebrow"),
      title: t("card_fund_title"),
      body: t("card_fund_body"),
      href: "/fund-calc",
      cta: t("card_fund_cta"),
    },
    {
      eyebrow: t("card_offshore_eyebrow"),
      title: t("card_offshore_title"),
      body: t("card_offshore_body"),
      href: "/offshore-hub",
      cta: t("card_offshore_cta"),
    },
    {
      eyebrow: t("card_mw_eyebrow"),
      title: t("card_mw_title"),
      body: t("card_mw_body"),
      href: "/mw-calc",
      cta: t("card_mw_cta"),
    },
  ];

  const whyItems: string[] = t.raw("whyItems") as string[];

  return (
    <div className="story-page">
      <section
        className="story-hero"
        style={{
          padding: "34px clamp(22px, 4vw, 40px)",
          borderRadius: 34,
          background:
            "radial-gradient(circle at top right, rgba(83,157,245,0.16), transparent 30%), linear-gradient(135deg, #0a1628 0%, #0f1f3d 58%, #0f3460 100%)",
          color: "#fff",
          boxShadow: "0 28px 64px rgba(15,23,42,0.18)",
        }}
      >
        <div className="story-hero-grid">
          <div className="story-hero-panel">
            <div className="story-kicker">{t("badge")}</div>
            <h1 className="story-display" style={{ margin: "16px 0 14px", maxWidth: 920 }}>
              {t("title")}
            </h1>
            <p className="story-copy" style={{ color: "rgba(255,255,255,0.84)", maxWidth: 920 }}>{t("intro")}</p>
            <div style={{ marginTop: 18, fontSize: 13, lineHeight: 1.8, color: "rgba(255,255,255,0.7)", maxWidth: 760 }}>{t("note")}</div>
          </div>

          <aside className="story-hero-aside">
            <div className="story-mini-label">{t("heroAsideTitle")}</div>
            <div className="story-mini-body" style={{ marginTop: 10 }}>{t("heroAsideBody")}</div>
            <div className="story-mini-metric">
              <div className="story-mini-label">{t("heroMetricLabel")}</div>
              <div className="story-mini-value">{t("heroMetricValue")}</div>
              <div className="story-mini-body">{t("heroMetricBody")}</div>
            </div>
          </aside>
        </div>
      </section>

      <section className="story-card-grid">
        {cards.map((card) => (
          <Link key={card.title} href={card.href} style={{ textDecoration: "none" }}>
            <div className="tool-card story-card" style={{ height: "100%" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
                {card.eyebrow}
              </div>
              <div className="story-card-title" style={{ fontSize: 20 }}>{card.title}</div>
              <p className="story-card-copy" style={{ marginBottom: 14 }}>{card.body}</p>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{card.cta}</div>
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
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 10 }}>
          {t("whyLabel")}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-1)", marginBottom: 12 }}>{t("whyTitle")}</div>
        <div className="story-bullet-list">
          {whyItems.map((item) => (
            <div key={item} className="story-bullet">
              {item}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <Link href="/primer">
            <button className="hero-btn-primary">{t("primaryCta")}</button>
          </Link>
          <Link href="/methods">
            <button className="hero-btn-secondary">{t("secondaryCta")}</button>
          </Link>
        </div>
      </section>
    </div>
  );
}
