const COPY = {
  zh: {
    badge: "服务条款",
    title: "服务条款",
    updated: "最近更新：2026 年 8 月 31 日",
    sections: [
      {
        title: "使用范围",
        body: "PrimerCat 仅供学术研究和非商业用途。严禁将本工具用于临床诊断、药物开发决策或任何以盈利为目的的商业活动（未经书面授权）。",
      },
      {
        title: "计算结果与安全资料",
        body: "PrimerCat 提供计算、数据库筛查和研究参考资料，不构成实验成功保证、临床结论或专业安全意见。\n\n• 引物需通过扩增效率、产物大小、熔解曲线等实验验证\n• gRNA 活性与脱靶标签为计算结果，需进一步分析和实验确认\n• BLAST 结论受所选数据库、参数与更新时间限制\n• 配方、Protocol 与试剂安全摘要不能替代产品说明书、SDS、机构 SOP 或风险评估\n\n用户应根据具体实验体系独立复核并承担使用风险。",
      },
      {
        title: "账号与数据",
        body: "用户对自己账号下的所有活动负责。请妥善保管密码。如发现账号异常请立即联系我们。\n\n我们保留在违反条款时暂停或终止账号的权利。",
      },
      {
        title: "知识产权",
        body: "PrimerCat 的原创代码、设计与内容受适用法律保护；第三方软件、数据库和资料仍归各自权利人所有。用户保留其提交内容的相关权利，并授权 PrimerCat 在提供所请求服务所必需的范围内处理该内容。",
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
    updated: "Last updated: 31 August 2026",
    sections: [
      {
        title: "Permitted Use",
        body: "PrimerCat is intended for academic research and non-commercial use only. Use of this tool for clinical diagnosis, pharmaceutical development decisions, or any commercial purpose is prohibited without prior written authorization.",
      },
      {
        title: "Computational results and safety references",
        body: "PrimerCat provides calculations, database screening, and research reference material. It does not provide an experimental guarantee, clinical conclusion, or professional safety advice.\n\n• Primers require experimental validation of efficiency, product size, melt curve, and related performance\n• gRNA activity and off-target labels are computational and require further analysis and experimental confirmation\n• BLAST conclusions depend on the selected database, parameters, and update status\n• Formulations, protocols, and reagent-safety summaries do not replace product instructions, SDS documents, institutional SOPs, or risk assessments\n\nUsers must review outputs for their specific experimental system and accept the risks of use.",
      },
      {
        title: "Accounts and Data",
        body: "You are responsible for all activity under your account. Keep your credentials secure. Contact us immediately if you suspect unauthorized access.\n\nWe reserve the right to suspend or terminate accounts that violate these terms.",
      },
      {
        title: "Intellectual Property",
        body: "Original PrimerCat code, design, and content are protected under applicable law; third-party software, databases, and materials remain the property of their respective rights holders. Users retain applicable rights in submitted content and grant PrimerCat permission to process it only as needed to provide the requested service.",
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
