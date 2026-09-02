const COPY = {
  zh: {
    badge: "隐私政策",
    title: "隐私政策",
    updated: "最近更新：2026 年 8 月 31 日",
    sections: [
      {
        title: "数据收集",
        body: "为提供与维护服务，PrimerCat 可能处理以下数据：\n• 账号信息（邮箱、显示名称和密码哈希）\n• 用户主动提交的序列、设计参数与结果；登录用户选择保存时形成历史记录\n• 服务器日志（如 IP 地址、访问时间、请求状态和错误信息），用于安全、排错与运行维护\n\nPrimerCat 不出售用户数据。请勿提交无权处理或不应传输至第三方服务的敏感序列。",
      },
      {
        title: "第三方服务",
        body: "PrimerCat 使用第三方基础设施与数据库服务：\n• NCBI BLAST / Entrez：相关查询、序列或标识符可能被发送至 NCBI，并按其政策处理\n• 云服务提供商：用于网站、接口、数据库与日志托管\n\n第三方服务按照各自的隐私政策处理数据。",
      },
      {
        title: "数据使用",
        body: "用户数据仅用于以下目的：\n• 提供工具功能（设计结果计算与存储）\n• 用户账号管理\n• 服务改进与 Bug 修复\n\n我们不会将用户数据用于广告或第三方营销。",
      },
      {
        title: "数据安全",
        body: "PrimerCat 使用 HTTPS 传输，并以单向哈希保存密码。任何互联网服务都无法保证绝对安全；如发现安全问题，请通过联系页面报告。",
      },
      {
        title: "联系方式",
        body: "如对本隐私政策有疑问，请联系：support@primercat.com",
      },
    ],
  },
  en: {
    badge: "Privacy Policy",
    title: "Privacy Policy",
    updated: "Last updated: 31 August 2026",
    sections: [
      {
        title: "Data Collection",
        body: "To provide and maintain the service, PrimerCat may process:\n• Account data (email, display name, and password hash)\n• Sequences, design parameters, and results submitted by the user; saved history when a signed-in user chooses to retain it\n• Server logs such as IP address, access time, request status, and error details for security, troubleshooting, and operations\n\nPrimerCat does not sell user data. Do not submit sensitive sequences that you are not authorised to process or transmit to third-party services.",
      },
      {
        title: "Third-Party Services",
        body: "PrimerCat uses third-party infrastructure and database services:\n• NCBI BLAST / Entrez: relevant queries, sequences, or identifiers may be sent to NCBI and processed under its policies\n• Cloud providers: used to host the site, APIs, databases, and operational logs\n\nThird-party services process data under their own privacy policies.",
      },
      {
        title: "Data Use",
        body: "Your data is used only for:\n• Providing tool functionality (design result computation and storage)\n• User account management\n• Service improvement and bug fixing\n\nWe will not use your data for advertising or third-party marketing.",
      },
      {
        title: "Data Security",
        body: "PrimerCat uses HTTPS in transit and stores passwords as one-way hashes. No internet service can guarantee absolute security. Report suspected security issues through the contact page.",
      },
      {
        title: "Contact",
        body: "For questions about this Privacy Policy, contact: support@primercat.com",
      },
    ],
  },
} as const;

export default function PrivacyPage({ params: { locale } }: { params: { locale: string } }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;

  return (
    <div className="story-page aux-page-v7 legal-page-v7 privacy-page-v7" style={{ maxWidth: 780 }}>
      <section className="aux-hero-v7" style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 12 }}>
          {copy.badge}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-1)", margin: "0 0 6px" }}>{copy.title}</h1>
        <p style={{ fontSize: 12, color: "var(--text-3)" }}>{copy.updated}</p>
      </section>

      {copy.sections.map((section) => (
        <section key={section.title} className="story-surface" style={{ padding: "22px clamp(18px, 3vw, 28px)", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 10 }}>{section.title}</div>
          <pre style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text-2)", margin: 0, whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)" }}>
            {section.body}
          </pre>
        </section>
      ))}
    </div>
  );
}
