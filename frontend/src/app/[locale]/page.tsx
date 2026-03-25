import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";

function CatLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <ellipse cx="11" cy="13.5" rx="7.5" ry="6.8" fill="white" opacity="0.96" />
      <polygon points="4.2,10 6.5,3.5 9.8,8.8" fill="white" opacity="0.96" />
      <polygon points="17.8,10 15.5,3.5 12.2,8.8" fill="white" opacity="0.96" />
      <polygon points="5.4,9.6 7,5.2 9.2,8.8" fill="#fca5a5" opacity="0.65" />
      <polygon points="16.6,9.6 15,5.2 12.8,8.8" fill="#fca5a5" opacity="0.65" />
      <circle cx="8.2" cy="13" r="1.4" fill="#1e3a8a" />
      <circle cx="13.8" cy="13" r="1.4" fill="#1e3a8a" />
      <circle cx="8.7" cy="12.5" r="0.45" fill="white" />
      <circle cx="14.3" cy="12.5" r="0.45" fill="white" />
      <ellipse cx="11" cy="16.2" rx="0.9" ry="0.65" fill="#fca5a5" opacity="0.9" />
    </svg>
  );
}

function QpcrCatAnimation() {
  return (
    <svg
      className="qpcr-anim"
      viewBox="0 0 560 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g className="qpcr-dna">
        <path d="M20 72 C60 64, 100 80, 140 72 C180 64, 220 80, 260 72 C300 64, 340 80, 380 72 C420 64, 460 80, 500 72 C520 68, 535 70, 540 72" stroke="rgba(148,163,184,0.55)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M20 88 C60 96, 100 80, 140 88 C180 96, 220 80, 260 88 C300 96, 340 80, 380 88 C420 96, 460 80, 500 88 C520 92, 535 90, 540 88" stroke="rgba(148,163,184,0.55)" strokeWidth="1.5" strokeLinecap="round" />
        {[80, 120, 160, 200, 240, 280, 320, 360, 400, 440, 480].map((x) => (
          <line key={x} x1={x} y1="74" x2={x} y2="86" stroke="rgba(148,163,184,0.35)" strokeWidth="1" />
        ))}
      </g>
      <g className="qpcr-cat-fwd">
        <circle cx="68" cy="80" r="16" fill="#A31F34" opacity="0.92" />
        <polygon points="56,67 60,56 66,66" fill="#A31F34" opacity="0.92" />
        <polygon points="70,66 76,56 80,67" fill="#A31F34" opacity="0.92" />
        <polygon points="58,66 61,59 65,66" fill="#fca5a5" opacity="0.6" />
        <polygon points="71,66 75,59 78,66" fill="#fca5a5" opacity="0.6" />
        <circle cx="62" cy="78" r="2.2" fill="#fff" opacity="0.9" />
        <circle cx="74" cy="78" r="2.2" fill="#fff" opacity="0.9" />
        <circle cx="62.6" cy="78.4" r="1.1" fill="#1a1a1a" />
        <circle cx="74.6" cy="78.4" r="1.1" fill="#1a1a1a" />
        <polygon points="68,82 66.5,84.5 69.5,84.5" fill="#fca5a5" opacity="0.8" />
        <path d="M66.5 84.5 Q68 86.5 69.5 84.5" stroke="#fca5a5" strokeWidth="0.8" fill="none" opacity="0.7" />
      </g>
      <g className="qpcr-whisker-fwd">
        <line x1="84" y1="74" x2="190" y2="74" stroke="#A31F34" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
        <line x1="84" y1="80" x2="196" y2="80" stroke="#A31F34" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
        <line x1="84" y1="86" x2="190" y2="86" stroke="#A31F34" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
        <text x="100" y="70" fontSize="9" fill="#A31F34" opacity="0.7" fontWeight="600" letterSpacing="0.04em">5&apos;→3&apos;</text>
      </g>
      <g className="qpcr-cat-rev">
        <circle cx="492" cy="80" r="16" fill="#1e3a8a" opacity="0.92" />
        <polygon points="480,67 484,56 490,66" fill="#1e3a8a" opacity="0.92" />
        <polygon points="494,66 500,56 504,67" fill="#1e3a8a" opacity="0.92" />
        <polygon points="482,66 485,59 489,66" fill="#93c5fd" opacity="0.5" />
        <polygon points="495,66 499,59 502,66" fill="#93c5fd" opacity="0.5" />
        <circle cx="486" cy="78" r="2.2" fill="#fff" opacity="0.9" />
        <circle cx="498" cy="78" r="2.2" fill="#fff" opacity="0.9" />
        <circle cx="486.6" cy="78.4" r="1.1" fill="#1a1a1a" />
        <circle cx="498.6" cy="78.4" r="1.1" fill="#1a1a1a" />
        <polygon points="492,82 490.5,84.5 493.5,84.5" fill="#93c5fd" opacity="0.8" />
        <path d="M490.5 84.5 Q492 86.5 493.5 84.5" stroke="#93c5fd" strokeWidth="0.8" fill="none" opacity="0.7" />
      </g>
      <g className="qpcr-whisker-rev">
        <line x1="476" y1="74" x2="370" y2="74" stroke="#1e3a8a" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
        <line x1="476" y1="80" x2="364" y2="80" stroke="#1e3a8a" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
        <line x1="476" y1="86" x2="370" y2="86" stroke="#1e3a8a" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
        <text x="400" y="70" fontSize="9" fill="#1e3a8a" opacity="0.7" fontWeight="600" letterSpacing="0.04em">3&apos;←5&apos;</text>
      </g>
      <rect className="qpcr-amplicon" x="192" y="66" width="176" height="28" rx="5" fill="url(#ampliconGrad)" opacity="0.22" />
      <rect className="qpcr-amplicon" x="192" y="66" width="176" height="28" rx="5" fill="none" stroke="url(#ampliconGrad)" strokeWidth="1.5" opacity="0.6" />
      <defs>
        <linearGradient id="ampliconGrad" x1="192" y1="80" x2="368" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A31F34" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "home" });

  const toolCards = [
    {
      tag: t("primer_card_tag"),
      title: t("primer_card_title"),
      desc: t("primer_card_desc"),
      href: "/primer",
      iconBg: "linear-gradient(135deg, #7f1d1d 0%, #A31F34 100%)",
      tagColor: "#A31F34",
      ctaColor: "#A31F34",
      icon: "Q",
    },
    {
      tag: t("grna_card_tag"),
      title: t("grna_card_title"),
      desc: t("grna_card_desc"),
      href: "/grna",
      iconBg: "linear-gradient(135deg, #14532d 0%, #276749 100%)",
      tagColor: "#276749",
      ctaColor: "#276749",
      icon: "G",
    },
    {
      tag: t("blast_card_tag"),
      title: t("blast_card_title"),
      desc: t("blast_card_desc"),
      href: "/blast",
      iconBg: "linear-gradient(135deg, #3b0764 0%, #553c9a 100%)",
      tagColor: "#553c9a",
      ctaColor: "#553c9a",
      icon: "B",
    },
  ];

  const features = [
    { title: t("feat_transcript_title"), desc: t("feat_transcript_desc") },
    { title: t("feat_exon_title"), desc: t("feat_exon_desc") },
    { title: t("feat_blast_title"), desc: t("feat_blast_desc") },
    { title: t("feat_score_title"), desc: t("feat_score_desc") },
    { title: t("feat_props_title"), desc: t("feat_props_desc") },
    { title: t("feat_export_title"), desc: t("feat_export_desc") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 80px" }}>
      {/* Hero */}
      <div className="hero-root" style={{ paddingBottom: 20 }}>
        <div className="hero-brand">
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg, #7f1d1d 0%, #A31F34 50%, #1e3a8a 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 1px rgba(163,31,52,0.2), 0 8px 28px rgba(163,31,52,0.28)",
          }}>
            <CatLogo />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-1)" }}>
            Primer<span style={{ color: "#A31F34" }}>Cat</span>
          </span>
        </div>

        <QpcrCatAnimation />

        <h1 className="hero-headline">
          {t("page_headline_1")}<span style={{ color: "#A31F34" }}>{t("page_headline_2")}</span>
        </h1>
        <p className="hero-sub">{t("page_sub")}</p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 40 }}>
          <Link href="/primer" className="hero-cta" style={{ marginBottom: 0 }}>
            {t("cta_primer")}
          </Link>
          <Link
            href="/grna"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 28px", fontSize: 15, fontWeight: 600,
              border: "1.5px solid var(--border-mid)", borderRadius: 12,
              color: "var(--text-1)", background: "var(--bg-card)",
              textDecoration: "none",
              transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
            }}
          >
            {t("cta_grna")}
          </Link>
        </div>

        <div className="hero-features">
          {[t("page_feat_1"), t("page_feat_2"), t("page_feat_3")].map((f) => (
            <div key={f} className="hero-feature-item">
              <div className="hero-feature-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Tool cards */}
      <div className="home-divider" />

      <div className="home-section">
        <div className="home-tools-grid">
          {toolCards.map((card) => (
            <Link key={card.href} href={card.href} className="home-tool-card">
              <div className="home-tool-icon" style={{ background: card.iconBg }}>
                <span style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>{card.icon}</span>
              </div>
              <span className="home-tool-tag" style={{ color: card.tagColor }}>{card.tag}</span>
              <p className="home-tool-title">{card.title}</p>
              <p className="home-tool-desc">{card.desc}</p>
              <span className="home-tool-cta" style={{ color: card.ctaColor }}>
                {locale === "zh" ? "打开工具" : "Open tool"} →
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="home-divider" />

      <div className="home-section">
        <h2 className="home-section-title">{t("features_title")}</h2>
        <p className="home-section-sub">{t("features_subtitle")}</p>
        <div className="home-features-grid">
          {features.map((f) => (
            <div key={f.title} className="home-feat-card">
              <p className="home-feat-title">{f.title}</p>
              <p className="home-feat-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
