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
    docs: "方法与可信度",
    docsLinks: [
      { label: "方法说明", href: "/methods" },
      { label: "可信度说明", href: "/validation" },
    ],
    addOns: "实验室工作台",
    addOnLinks: [
      { label: "分子量计算器", href: "/mw-calc" },
      { label: "溶液配制指南", href: "/solutions" },
      { label: "试剂安全与毒性", href: "/chemical-safety" },
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
    docs: "Methods & trust",
    docsLinks: [
      { label: "Methods", href: "/methods" },
      { label: "Trust & Limitations", href: "/validation" },
    ],
    addOns: "Lab Bench",
    addOnLinks: [
      { label: "MW Calculator", href: "/mw-calc" },
      { label: "Solution Preparation", href: "/solutions" },
      { label: "Reagent Safety & Toxicity", href: "/chemical-safety" },
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
      <div className="footer-grid-wrap">
        <div className="footer-grid">
          {/* Brand column */}
          <div className="footer-brand">
            <div className="footer-brand-lockup">
              <div className="footer-brand-mark">
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <ellipse cx="11" cy="13.5" rx="7.5" ry="6.8" fill="currentColor" opacity="0.96" />
                  <polygon points="4.2,10 6.5,3.5 9.8,8.8" fill="currentColor" opacity="0.96" />
                  <polygon points="17.8,10 15.5,3.5 12.2,8.8" fill="currentColor" opacity="0.96" />
                  <polygon points="5.4,9.6 7,5.2 9.2,8.8" fill="#fca5a5" opacity="0.65" />
                  <polygon points="16.6,9.6 15,5.2 12.8,8.8" fill="#fca5a5" opacity="0.65" />
                  <circle cx="8.2" cy="13" r="1.4" fill="var(--accent)" />
                  <circle cx="13.8" cy="13" r="1.4" fill="var(--accent)" />
                  <ellipse cx="11" cy="16.2" rx="0.9" ry="0.65" fill="#fca5a5" opacity="0.9" />
                </svg>
              </div>
              <span className="footer-brand-name">
                Primer<strong>Cat</strong>
              </span>
            </div>
            <p className="footer-brand-description">
              {copy.brandDesc}
            </p>
            <p className="footer-disclaimer">
              {copy.disclaimer}
            </p>
          </div>

          {/* Link columns */}
          {sections.map((section) => (
            <div className="footer-section" key={section.title}>
              <h2 className="footer-section-title">
                {section.title}
              </h2>
              <ul className="footer-link-list">
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
        <div className="footer-bottom-inner">
          <span>{copy.copyright}</span>
          <div className="footer-legal-links">
            <Link href={`/${locale}/privacy`}>
              {copy.privacy}
            </Link>
            <Link href={`/${locale}/terms`}>
              {copy.terms}
            </Link>
          </div>
        </div>
        <div className="footer-icp">
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
          >
            晋ICP备2025066604号
          </a>
        </div>
      </div>
    </footer>
  );
}
