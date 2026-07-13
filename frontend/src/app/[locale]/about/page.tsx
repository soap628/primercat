import { Link } from "@/navigation";

const COPY = {
  zh: {
    badge: "开发人员",
    name: "小王",
    tags: ["独立开发者", "全栈工程师", "无党派人士", "学生"],
    homepage: "https://soap628.com",
    intro:
      "PrimerCat 是我在分子生物学实验室工作期间独立开发的工具。每次需要设计引物或 gRNA，都要在多个网站之间来回跳转、手动核对参数——这个流程既耗时又容易出错。PrimerCat 把这些步骤整合成一个可审计、有依据的流程。",
    storyTitle: "为什么做这个工具",
    storyBody:
      "市面上现有的引物和 gRNA 设计工具，大多只给你一个结果序列，不告诉你它为什么排在前面、用了哪条参考序列、特异性检查结果如何。对于实验室新成员来说，这些「黑盒」输出很难判断是否值得信任。\n\nPrimerCat 的目标是让每一步推理都可见：用了哪条转录本、引物打了多少分、为什么这条排第一。结果页面把推理依据和结果放在一起，让实验方案的决策更有依据。",
    stackTitle: "技术栈",
    stackItems: [
      { label: "后端", value: "Python · FastAPI · SQLAlchemy · Primer3-py · Biopython" },
      { label: "前端", value: "Next.js 14 · TypeScript · next-intl（中英双语）" },
      { label: "外部服务", value: "NCBI BLAST · NCBI Entrez · Bowtie2（离线基因组比对）" },
      { label: "部署", value: "Linux 服务器 · Nginx · Docker Compose" },
    ],
    contactTitle: "联系 / 合作",
    contactBody:
      "如果你是研究人员、开发者，或者有功能建议、Bug 反馈、合作意向，欢迎联系。",
    email: "zihaowangs@proton.me",
    links: [
      { label: "引用 PrimerCat", href: "/cite" },
      { label: "方法说明", href: "/methods" },
      { label: "寻求合作", href: "/contact" },
    ],
    disclaimer:
      "PrimerCat 是个人独立项目，不代表任何机构立场。工具结果仅供研究参考，使用前请自行验证。",
  },
  en: {
    badge: "Developer",
    name: "Zihao Wang",
    tags: ["Independent Developer", "Full-stack Engineer", "Non-partisan", "Student"],
    homepage: "https://soap628.com",
    intro:
      "PrimerCat is a tool I built independently while working in a molecular biology lab. Every primer or gRNA design session meant jumping between multiple websites and manually cross-checking parameters — slow and error-prone. PrimerCat consolidates those steps into one auditable, evidence-backed workflow.",
    storyTitle: "Why I built this",
    storyBody:
      "Most existing primer and gRNA design tools give you a result sequence without explaining why it ranks first, which reference sequence was used, or how the specificity check went. For new lab members, that black-box output is hard to trust.\n\nPrimerCat's goal is to make every reasoning step visible: which transcript was used, how primers were scored, why this one ranks first. The results page shows the reasoning alongside the output, so experimental decisions have a documented basis.",
    stackTitle: "Tech stack",
    stackItems: [
      { label: "Backend", value: "Python · FastAPI · SQLAlchemy · Primer3-py · Biopython" },
      { label: "Frontend", value: "Next.js 14 · TypeScript · next-intl (EN/ZH)" },
      { label: "External services", value: "NCBI BLAST · NCBI Entrez · Bowtie2 (offline genome alignment)" },
      { label: "Deployment", value: "Linux server · Nginx · Docker Compose" },
    ],
    contactTitle: "Contact / Collaborate",
    contactBody:
      "If you're a researcher, developer, or have feature suggestions, bug reports, or collaboration ideas, feel free to reach out.",
    email: "zihaowangs@proton.me",
    links: [
      { label: "Cite PrimerCat", href: "/cite" },
      { label: "Methods", href: "/methods" },
      { label: "Collaborate", href: "/contact" },
    ],
    disclaimer:
      "PrimerCat is a personal independent project and does not represent any institutional position. Results are for research reference only — please validate before use.",
  },
} as const;

export default function AboutPage({ params: { locale } }: { params: { locale: string } }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;

  return (
    <div className="story-page" style={{ maxWidth: 820 }}>
      {/* Header */}
      <section style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.09em",
          textTransform: "uppercase", color: "var(--accent)", marginBottom: 14,
        }}>
          {copy.badge}
        </div>

        {/* Avatar + name card */}
        <div style={{
          display: "flex", alignItems: "center", gap: 20, marginBottom: 20,
          flexWrap: "wrap",
        }}>
          {/* Illustrated avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: 20, flexShrink: 0,
            background: "#2a2a2a",
            boxShadow: "0 0 0 3px var(--bg-base), 0 0 0 4px var(--border), 0 4px 20px rgba(0,0,0,0.4)",
            overflow: "hidden", position: "relative",
          }}>
            <svg viewBox="0 0 80 80" width="80" height="80" xmlns="http://www.w3.org/2000/svg" aria-label="Developer avatar">
              <defs>
                <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3a3a3a" />
                  <stop offset="100%" stopColor="#252525" />
                </linearGradient>
                <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6b3a1f" />
                  <stop offset="100%" stopColor="#4a2510" />
                </linearGradient>
                <linearGradient id="jacketGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2a2a2a" />
                  <stop offset="100%" stopColor="#111111" />
                </linearGradient>
                <radialGradient id="glowRed" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Background */}
              <rect width="80" height="80" fill="url(#bgGrad)" />
              {/* Subtle red glow backdrop */}
              <ellipse cx="40" cy="55" rx="38" ry="28" fill="url(#glowRed)" />

              {/* Leather jacket body */}
              <path d="M10,80 L10,60 Q16,50 40,50 Q64,50 70,60 L70,80 Z" fill="url(#jacketGrad)" />
              {/* Jacket lapels */}
              <path d="M40,50 L32,58 L28,50" fill="none" stroke="#444" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M40,50 L48,58 L52,50" fill="none" stroke="#444" strokeWidth="1.5" strokeLinejoin="round" />
              {/* Metal chain */}
              <path d="M30,56 Q40,62 50,56" fill="none" stroke="#d4af37" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2,2.5" />
              {/* Jacket collar detail */}
              <path d="M28,50 Q30,54 32,58" stroke="#555" strokeWidth="1" fill="none" />
              <path d="M52,50 Q50,54 48,58" stroke="#555" strokeWidth="1" fill="none" />

              {/* Neck */}
              <rect x="34" y="46" width="12" height="8" rx="4" fill="#5a3018" />

              {/* Head */}
              <ellipse cx="40" cy="34" rx="17" ry="18" fill="url(#skinGrad)" />

              {/* Natural afro hair */}
              <ellipse cx="40" cy="22" rx="20" ry="14" fill="#1a0e08" />
              {/* Afro volume — bumpy silhouette */}
              <circle cx="23" cy="26" r="8" fill="#1a0e08" />
              <circle cx="57" cy="26" r="8" fill="#1a0e08" />
              <circle cx="30" cy="18" r="9" fill="#1a0e08" />
              <circle cx="50" cy="18" r="9" fill="#1a0e08" />
              <circle cx="40" cy="15" r="10" fill="#1a0e08" />
              {/* Hair texture highlights */}
              <circle cx="36" cy="17" r="1.5" fill="#2a1a10" opacity="0.7" />
              <circle cx="44" cy="16" r="1.5" fill="#2a1a10" opacity="0.7" />
              <circle cx="28" cy="24" r="1.5" fill="#2a1a10" opacity="0.7" />
              <circle cx="52" cy="24" r="1.5" fill="#2a1a10" opacity="0.7" />

              {/* Ears */}
              <ellipse cx="23" cy="35" rx="3" ry="4" fill="#5a3018" />
              <ellipse cx="57" cy="35" rx="3" ry="4" fill="#5a3018" />
              {/* Ear stud */}
              <circle cx="23" cy="38" r="1.2" fill="#d4af37" />

              {/* Sunglasses — rebellious wraparound */}
              <rect x="26" y="30" width="12" height="7" rx="2" fill="#111" stroke="#333" strokeWidth="0.8" />
              <rect x="42" y="30" width="12" height="7" rx="2" fill="#111" stroke="#333" strokeWidth="0.8" />
              {/* Lens tint — red accent */}
              <rect x="26.5" y="30.5" width="11" height="6" rx="1.5" fill="#ef4444" opacity="0.15" />
              <rect x="42.5" y="30.5" width="11" height="6" rx="1.5" fill="#ef4444" opacity="0.15" />
              {/* Bridge */}
              <path d="M38,33.5 L42,33.5" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
              {/* Temples */}
              <line x1="26" y1="33" x2="23" y2="33" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="54" y1="33" x2="57" y2="33" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
              {/* Lens shine */}
              <path d="M28,31.5 L31,31.5" stroke="white" strokeWidth="0.6" strokeLinecap="round" opacity="0.4" />
              <path d="M44,31.5 L47,31.5" stroke="white" strokeWidth="0.6" strokeLinecap="round" opacity="0.4" />

              {/* Nose */}
              <path d="M38.5,37 Q38,40 36.5,41 Q40,42 43.5,41 Q42,40 41.5,37 Z" fill="#3d1f0a" opacity="0.6" />

              {/* Smirk — asymmetric rebel smile */}
              <path d="M36,44 Q39,46.5 45,44.5" stroke="#3d1f0a" strokeWidth="1.4" fill="none" strokeLinecap="round" />

              {/* Red accent glow bottom */}
              <ellipse cx="40" cy="79" rx="24" ry="5" fill="#ef4444" opacity="0.2" />

              {/* Small graffiti-style tag mark on jacket */}
              <text x="38" y="72" fontSize="6" fill="#ef4444" opacity="0.6" fontWeight="bold" fontFamily="monospace">RBL</text>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-1)", margin: "0 0 8px" }}>
              {copy.name}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {copy.tags.map((tag) => (
                <span key={tag} style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
                  padding: "2px 9px", borderRadius: 20,
                  background: "var(--bg-inset)", border: "1px solid var(--border)",
                  color: "var(--text-3)",
                }}>
                  {tag}
                </span>
              ))}
            </div>
            <a
              href={copy.homepage}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
            >
              🌐 {copy.homepage.replace("https://", "")}
            </a>
          </div>
        </div>

        <p style={{ fontSize: 14, lineHeight: 1.85, color: "var(--text-2)", maxWidth: 680, margin: 0 }}>
          {copy.intro}
        </p>
      </section>

      {/* Story */}
      <section className="story-surface" style={{ padding: "22px clamp(18px, 3vw, 28px)", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 12 }}>
          {copy.storyTitle}
        </div>
        <pre style={{
          fontSize: 13, lineHeight: 1.85, color: "var(--text-2)",
          margin: 0, whiteSpace: "pre-wrap", fontFamily: "var(--font-sans, inherit)",
        }}>
          {copy.storyBody}
        </pre>
      </section>

      {/* Tech stack */}
      <section className="story-surface" style={{ padding: "22px clamp(18px, 3vw, 28px)", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 14 }}>
          {copy.stackTitle}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {copy.stackItems.map((item) => (
            <div key={item.label} style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.07em",
                textTransform: "uppercase", color: "var(--text-3)",
                minWidth: 110, flexShrink: 0,
              }}>
                {item.label}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="story-surface" style={{ padding: "22px clamp(18px, 3vw, 28px)", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 10 }}>
          {copy.contactTitle}
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text-2)", margin: "0 0 14px" }}>
          {copy.contactBody}
        </p>
        <a
          href={`mailto:${copy.email}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, fontWeight: 600, color: "var(--accent)",
            textDecoration: "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 7l8 5.5L18 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {copy.email}
        </a>
      </section>

      {/* Quick links */}
      <section style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
        {copy.links.map((link) => (
          <Link key={link.href} href={link.href}>
            <button className="hero-btn-secondary">{link.label}</button>
          </Link>
        ))}
      </section>

      {/* Disclaimer */}
      <p style={{
        fontSize: 11, lineHeight: 1.7, color: "var(--text-3)",
        fontStyle: "italic", marginTop: 24, maxWidth: 640,
      }}>
        {copy.disclaimer}
      </p>
    </div>
  );
}
