import Link from "next/link";

const COPY = {
  zh: {
    brandDesc: "以 qPCR 引物设计为核心的科研工具。结果可审查，边界说清楚。",
    product: "产品",
    productLinks: [
      { label: "qPCR 引物设计", href: "/primer" },
      { label: "方法说明", href: "/methods" },
      { label: "可信度说明", href: "/validation" },
      { label: "更多工具", href: "/tools" },
    ],
    addOns: "附加工具",
    addOnLinks: [
      { label: "CRISPR gRNA", href: "/grna" },
      { label: "BLAST 比对", href: "/blast" },
    ],
    trust: "使用边界",
    trustLinks: [
      { label: "研究用途", href: "#" },
      { label: "结果仍需实验确认", href: "#" },
      { label: "RefSeq RNA BLAST 不等于全基因组 PCR 验证", href: "#" },
    ],
    connect: "连接",
    connectLinks: [
      { label: "GitHub", href: "https://github.com", external: true },
      { label: "Contact", href: "#" },
    ],
    copyright: "© 2026 PrimerCat. Research use only.",
    privacy: "隐私政策",
    terms: "服务条款",
  },
  en: {
    brandDesc: "A research tool centered on auditable qPCR primer design. Results come with evidence and clear boundaries.",
    product: "Product",
    productLinks: [
      { label: "qPCR Primer Design", href: "/primer" },
      { label: "Methods", href: "/methods" },
      { label: "Trust", href: "/validation" },
      { label: "More Tools", href: "/tools" },
    ],
    addOns: "Additional Tools",
    addOnLinks: [
      { label: "CRISPR gRNA", href: "/grna" },
      { label: "BLAST Alignment", href: "/blast" },
    ],
    trust: "Boundaries",
    trustLinks: [
      { label: "Research use", href: "#" },
      { label: "Results still require validation", href: "#" },
      { label: "RefSeq RNA BLAST is not genome-wide PCR validation", href: "#" },
    ],
    connect: "Connect",
    connectLinks: [
      { label: "GitHub", href: "https://github.com", external: true },
      { label: "Contact", href: "#" },
    ],
    copyright: "© 2026 PrimerCat. Research use only.",
    privacy: "Privacy",
    terms: "Terms",
  },
} as const;

export default function Footer({ locale }: { locale: string }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;
  const sections = [
    { title: copy.product, links: copy.productLinks },
    { title: copy.addOns, links: copy.addOnLinks },
    { title: copy.trust, links: copy.trustLinks },
    { title: copy.connect, links: copy.connectLinks },
  ];

  return (
    <footer
      style={{
        background: "#0b1e3e",
        color: "rgba(255,255,255,0.55)",
        marginTop: 0,
      }}
    >
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.12) 70%, transparent)" }} />

      <div style={{ padding: "48px 80px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr repeat(4, 1fr)", gap: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #7f1d1d 0%, #A31F34 50%, #1e3a8a 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 0 1px rgba(163,31,52,0.3), 0 4px 12px rgba(163,31,52,0.25)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <ellipse cx="11" cy="13.5" rx="7.5" ry="6.8" fill="white" opacity="0.96" />
                  <polygon points="4.2,10 6.5,3.5 9.8,8.8" fill="white" opacity="0.96" />
                  <polygon points="17.8,10 15.5,3.5 12.2,8.8" fill="white" opacity="0.96" />
                  <polygon points="5.4,9.6 7,5.2 9.2,8.8" fill="#fca5a5" opacity="0.65" />
                  <polygon points="16.6,9.6 15,5.2 12.8,8.8" fill="#fca5a5" opacity="0.65" />
                  <circle cx="8.2" cy="13" r="1.4" fill="#1e3a8a" />
                  <circle cx="13.8" cy="13" r="1.4" fill="#1e3a8a" />
                  <ellipse cx="11" cy="16.2" rx="0.9" ry="0.65" fill="#fca5a5" opacity="0.9" />
                </svg>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" }}>
                Primer<span style={{ color: "#e57373" }}>Cat</span>
              </span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.75, maxWidth: 230 }}>{copy.brandDesc}</p>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.42)",
                  marginBottom: 14,
                  paddingBottom: 8,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {section.title}
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                {section.links.map((link) => {
                  if ("external" in link && link.external) {
                    return (
                      <li key={link.label}>
                        <a href={link.href} target="_blank" rel="noopener noreferrer" className="footer-link">
                          {link.label}
                        </a>
                      </li>
                    );
                  }
                  return (
                    <li key={link.label}>
                      <Link href={`/${locale}${link.href}`} className="footer-link">
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="footer-bottom" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "16px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12 }}>{copy.copyright}</span>
          <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
            <Link href="#" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
              {copy.privacy}
            </Link>
            <Link href="#" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
              {copy.terms}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
