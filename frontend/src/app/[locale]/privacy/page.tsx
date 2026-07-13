const COPY = {
  zh: {
    badge: "隐私政策",
    title: "隐私政策",
    updated: "最近更新：2026 年 3 月",
    sections: [
      {
        title: "数据收集",
        body: "我们收集以下数据以提供服务：\n• 账号注册信息（邮箱、显示名称）\n• 工具使用记录（设计参数、历史结果）\n• 服务器日志（IP 地址、访问时间，用于安全和调试）\n\n我们不收集、不出售任何个人敏感信息。",
      },
      {
        title: "第三方服务",
        body: "PrimerCat 使用以下第三方服务：\n• NCBI BLAST（由美国国家生物技术信息中心提供，提交序列将按 NCBI 政策处理）\n• 云服务提供商（仅用于托管）\n\n使用这些服务时，用户的数据可能按各自隐私政策处理。",
      },
      {
        title: "数据使用",
        body: "用户数据仅用于以下目的：\n• 提供工具功能（设计结果计算与存储）\n• 用户账号管理\n• 服务改进与 Bug 修复\n\n我们不会将用户数据用于广告或第三方营销。",
      },
      {
        title: "数据安全",
        body: "我们采用 HTTPS 加密传输和安全存储实践。密码以加密方式存储，不可逆。如发现安全漏洞，请联系我们。",
      },
      {
        title: "联系方式",
        body: "如对本隐私政策有疑问，请联系：zihaowangs@proton.me",
      },
    ],
  },
  en: {
    badge: "Privacy Policy",
    title: "Privacy Policy",
    updated: "Last updated: March 2026",
    sections: [
      {
        title: "Data Collection",
        body: "We collect the following data to provide our service:\n• Account registration information (email, display name)\n• Tool usage records (design parameters, history)\n• Server logs (IP address, access time — for security and debugging)\n\nWe do not collect or sell any sensitive personal information.",
      },
      {
        title: "Third-Party Services",
        body: "PrimerCat uses the following third-party services:\n• NCBI BLAST (provided by the US National Center for Biotechnology Information — submitted sequences are handled per NCBI policy)\n• Cloud hosting providers (used only for infrastructure)\n\nWhen using these services, your data may be processed under their respective privacy policies.",
      },
      {
        title: "Data Use",
        body: "Your data is used only for:\n• Providing tool functionality (design result computation and storage)\n• User account management\n• Service improvement and bug fixing\n\nWe will not use your data for advertising or third-party marketing.",
      },
      {
        title: "Data Security",
        body: "We use HTTPS encryption and secure storage practices. Passwords are stored in an irreversible encrypted format. If you discover a security vulnerability, please contact us.",
      },
      {
        title: "Contact",
        body: "For questions about this Privacy Policy, contact: zihaowangs@proton.me",
      },
    ],
  },
} as const;

export default function PrivacyPage({ params: { locale } }: { params: { locale: string } }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;

  return (
    <div className="story-page" style={{ maxWidth: 780 }}>
      <section style={{ marginBottom: 8 }}>
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
