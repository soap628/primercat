const COPY = {
  zh: {
    badge: "服务条款",
    title: "服务条款",
    updated: "最近更新：2026 年 3 月",
    sections: [
      {
        title: "使用范围",
        body: "PrimerCat 仅供学术研究和非商业用途。严禁将本工具用于临床诊断、药物开发决策或任何以盈利为目的的商业活动（未经书面授权）。",
      },
      {
        title: "结果免责声明",
        body: "本工具提供的所有结果（引物设计、gRNA 设计、BLAST 比对）均为计算预测，不构成实验保证。\n\n• 引物设计结果需经实验验证（PCR 扩增、熔解曲线等）\n• gRNA 活性评分为预测值，脱靶风险需实验确认\n• BLAST 比对仅针对参考数据库，不等同于全基因组验证\n\n使用本工具的风险由用户自行承担。",
      },
      {
        title: "账号与数据",
        body: "用户对自己账号下的所有活动负责。请妥善保管密码。如发现账号异常请立即联系我们。\n\n我们保留在违反条款时暂停或终止账号的权利。",
      },
      {
        title: "知识产权",
        body: "PrimerCat 平台代码、设计和内容归开发者所有。用户提交的序列数据归用户所有，我们不对其主张任何权利。",
      },
      {
        title: "服务变更",
        body: "我们保留随时修改、暂停或终止服务的权利，恕不另行通知。重大变更将通过邮件或网站公告告知。",
      },
      {
        title: "联系方式",
        body: "如对本条款有疑问，请联系：zihaowangs@proton.me",
      },
    ],
  },
  en: {
    badge: "Terms of Service",
    title: "Terms of Service",
    updated: "Last updated: March 2026",
    sections: [
      {
        title: "Permitted Use",
        body: "PrimerCat is intended for academic research and non-commercial use only. Use of this tool for clinical diagnosis, pharmaceutical development decisions, or any commercial purpose is prohibited without prior written authorization.",
      },
      {
        title: "Disclaimer of Results",
        body: "All results provided by this tool (primer design, gRNA design, BLAST alignment) are computational predictions and do not constitute experimental guarantees.\n\n• Primer design results require experimental validation (PCR amplification, melt curve analysis, etc.)\n• gRNA activity scores are predictions; off-target risk requires experimental confirmation\n• BLAST alignment is limited to reference databases and is not equivalent to genome-wide PCR validation\n\nYou use this tool at your own risk.",
      },
      {
        title: "Accounts and Data",
        body: "You are responsible for all activity under your account. Keep your credentials secure. Contact us immediately if you suspect unauthorized access.\n\nWe reserve the right to suspend or terminate accounts that violate these terms.",
      },
      {
        title: "Intellectual Property",
        body: "The PrimerCat platform code, design, and content are owned by the developers. Sequence data submitted by users belongs to the users — we make no claims to it.",
      },
      {
        title: "Service Changes",
        body: "We reserve the right to modify, suspend, or discontinue the service at any time without notice. Significant changes will be communicated via email or site announcement.",
      },
      {
        title: "Contact",
        body: "For questions about these Terms, contact: zihaowangs@proton.me",
      },
    ],
  },
} as const;

export default function TermsPage({ params: { locale } }: { params: { locale: string } }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;

  return (
    <div className="story-page aux-page-v7 legal-page-v7 terms-page-v7" style={{ maxWidth: 780 }}>
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
