import Link from "next/link";

const COPY = {
  zh: {
    brandDesc: "分子生物学科研工具。每个决策都展示，每个数字都有来源。",
    product: "工具",
    productLinks: [
      { label: "qPCR 引物设计 — PrimerCat", href: "/primer" },
      { label: "常规 PCR 引物设计", href: "/pcr" },
      { label: "gRNA 设计 — CrisprCat", href: "/grna" },
      { label: "BLAST 序列比对", href: "/blast" },
    ],
    docs: "文档",
    docsLinks: [
      { label: "方法说明", href: "/methods" },
      { label: "可信度说明", href: "/validation" },
    ],
    addOns: "实验室计算",
    addOnLinks: [
      { label: "分子量计算器", href: "/mw-calc" },
    ],
    connect: "关于",
    connectLinks: [
      { label: "开发人员", href: "/about" },
      { label: "寻求合作", href: "/contact" },
      { label: "赞助支持", href: "/sponsor" },
      { label: "引用", href: "/cite" },
    ],
    disclaimer: "仅供研究使用。结果需经实验确认，RefSeq RNA BLAST 不等于全基因组 PCR 验证。",
    copyright: "© 2026 PrimerCat. Research use only.",
    privacy: "隐私政策",
    terms: "服务条款",
  },
  en: {
    brandDesc: "Molecular biology research tools. Every decision shown. Every number has a source.",
    product: "Tools",
    productLinks: [
      { label: "qPCR Primer Design — PrimerCat", href: "/primer" },
      { label: "Endpoint PCR Primer Design", href: "/pcr" },
      { label: "gRNA Design — CrisprCat", href: "/grna" },
      { label: "BLAST Sequence Search", href: "/blast" },
    ],
    docs: "Docs",
    docsLinks: [
      { label: "Methods", href: "/methods" },
      { label: "Trust & Limitations", href: "/validation" },
    ],
    addOns: "Lab Calculators",
    addOnLinks: [
      { label: "MW Calculator", href: "/mw-calc" },
    ],
    connect: "About",
    connectLinks: [
      { label: "Developer", href: "/about" },
      { label: "Collaborate", href: "/contact" },
      { label: "Sponsor", href: "/sponsor" },
      { label: "Cite", href: "/cite" },
    ],
    disclaimer: "For research use only. Results require experimental validation. RefSeq RNA BLAST is not genome-wide PCR validation.",
    copyright: "© 2026 PrimerCat. Research use only.",
    privacy: "Privacy",
    terms: "Terms",
  },
} as const;

export default function Footer({ locale }: { locale: string }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;
  const sections = [
    { title: copy.product, links: copy.productLinks },
    { title: copy.docs, links: copy.docsLinks },
    { title: copy.addOns, links: copy.addOnLinks },
    { title: copy.connect, links: copy.connectLinks },
  ];

  return (
    <footer className="site-footer">
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--border-mid) 30%, var(--border-mid) 70%, transparent)" }} />

      <div className="footer-grid-wrap">
        <div className="footer-grid">
          {/* Brand column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div
                style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: "var(--bg-inset)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 0 1px var(--border)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <ellipse cx="11" cy="13.5" rx="7.5" ry="6.8" fill="white" opacity="0.96" />
                  <polygon points="4.2,10 6.5,3.5 9.8,8.8" fill="white" opacity="0.96" />
                  <polygon points="17.8,10 15.5,3.5 12.2,8.8" fill="white" opacity="0.96" />
                  <polygon points="5.4,9.6 7,5.2 9.2,8.8" fill="#fca5a5" opacity="0.65" />
                  <polygon points="16.6,9.6 15,5.2 12.8,8.8" fill="#fca5a5" opacity="0.65" />
                  <circle cx="8.2" cy="13" r="1.4" fill="var(--accent)" />
                  <circle cx="13.8" cy="13" r="1.4" fill="var(--accent)" />
                  <ellipse cx="11" cy="16.2" rx="0.9" ry="0.65" fill="#fca5a5" opacity="0.9" />
                </svg>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.01em" }}>
                Primer<span style={{ color: "var(--accent)" }}>Cat</span>
              </span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.75, maxWidth: 230, color: "var(--text-2)" }}>
              {copy.brandDesc}
            </p>
            <p style={{ fontSize: 11, lineHeight: 1.6, maxWidth: 230, color: "var(--text-3)", marginTop: 10, fontStyle: "italic" }}>
              {copy.disclaimer}
            </p>
          </div>

          {/* Link columns */}
          {sections.map((section) => (
            <div key={section.title}>
              <div
                style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.09em",
                  textTransform: "uppercase", color: "var(--text-3)",
                  marginBottom: 14, paddingBottom: 8,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {section.title}
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={`/${locale}${link.href}`} className="footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="footer-bottom">
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{copy.copyright}</span>
          <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
            <Link href={`/${locale}/privacy`} style={{ color: "var(--text-3)", textDecoration: "none" }}>
              {copy.privacy}
            </Link>
            <Link href={`/${locale}/terms`} style={{ color: "var(--text-3)", textDecoration: "none" }}>
              {copy.terms}
            </Link>
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: "8px auto 0", textAlign: "center" }}>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 11, color: "var(--text-3)", opacity: 0.5, textDecoration: "none" }}
          >
            晋ICP备2025066604号
          </a>
        </div>
      </div>
    </footer>
  );
}
