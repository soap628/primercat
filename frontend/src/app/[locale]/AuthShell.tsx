import type { ReactNode } from "react";

type AuthMode = "login" | "register";

export default function AuthShell({
  locale,
  mode,
  children,
  footer,
}: {
  locale: string;
  mode: AuthMode;
  children: ReactNode;
  footer: ReactNode;
}) {
  const zh = locale === "zh";
  const login = mode === "login";

  const copy = zh
    ? {
        kicker: "科研账户",
        title: login ? "查看已保存的设计记录" : "创建研究记录空间",
        intro: login
          ? "登录后查看已保存的 qPCR 引物、gRNA 与 BLAST 记录。"
          : "创建账户，以便保存和检索设计参数、结果与筛查范围。",
        points: login
          ? ["集中查看三类分析记录", "跨设备访问已保存记录", "保留结果依据与筛查范围"]
          : ["保存 qPCR、gRNA 与 BLAST 记录", "按基因名或序列快速检索", "随时回看参数、评分和筛查范围"],
        formKicker: login ? "账户访问" : "创建账户",
        formTitle: login ? "登录 PrimerCat" : "注册 PrimerCat",
        formBody: login ? "使用你的邮箱和密码进入账户。" : "填写邮箱和密码即可开始，昵称可以稍后再决定。",
      }
    : {
        kicker: "Research account",
        title: login ? "Review saved design records" : "Create a research record space",
        intro: login
          ? "Sign in to review saved qPCR primer, gRNA, and BLAST records."
          : "Create an account to save and search design parameters, results, and screening scope.",
        points: login
          ? ["Review all three analysis histories", "Access saved records across devices", "Retain result evidence and screening scope"]
          : ["Save qPCR, gRNA, and BLAST records", "Search quickly by gene or sequence", "Revisit parameters, scores, and screening scope"],
        formKicker: login ? "Account access" : "Create account",
        formTitle: login ? "Sign in to PrimerCat" : "Register for PrimerCat",
        formBody: login ? "Use your email and password to access your account." : "Start with an email and password. A display name is optional.",
      };

  return (
    <main className="auth-page-v8">
      <section className="auth-intro-v8">
        <div className="auth-kicker-v8">{copy.kicker}</div>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
        <div className="auth-benefits-v8">
          {copy.points.map((point, index) => (
            <div key={point}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{point}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="auth-form-panel-v8">
        <div className="auth-form-head-v8">
          <div className="auth-mark-v8" aria-hidden="true">PC</div>
          <div>
            <div className="auth-form-kicker-v8">{copy.formKicker}</div>
            <h2>{copy.formTitle}</h2>
            <p>{copy.formBody}</p>
          </div>
        </div>
        {children}
        <div className="auth-footer-v8">{footer}</div>
      </section>
    </main>
  );
}
