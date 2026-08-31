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
        title: login ? "继续你的设计工作" : "建立可追溯的科研工作区",
        intro: login
          ? "登录后集中查看保存的引物、gRNA 与 BLAST 分析记录，并继续尚未完成的研究工作。"
          : "创建账户，把不同工具的设计记录放在同一处。参数、结果和证据边界会随记录一起保存。",
        points: login
          ? ["集中查看三类分析记录", "跨设备继续已保存的工作", "结果依据与设计边界同步保留"]
          : ["保存 qPCR、gRNA 与 BLAST 记录", "按基因名或序列快速检索", "随时回看参数、评分和筛查范围"],
        formKicker: login ? "安全访问" : "创建账户",
        formTitle: login ? "登录 PrimerCat" : "注册 PrimerCat",
        formBody: login ? "使用你的邮箱和密码进入账户。" : "填写邮箱和密码即可开始，昵称可以稍后再决定。",
      }
    : {
        kicker: "Research account",
        title: login ? "Continue your design work" : "Build a traceable research workspace",
        intro: login
          ? "Sign in to review saved primer, gRNA, and BLAST analyses in one place and continue your unfinished work."
          : "Create an account to keep design records from every tool together, with parameters, results, and evidence boundaries attached.",
        points: login
          ? ["Review all three analysis histories", "Continue saved work across devices", "Keep rationale and scope with every result"]
          : ["Save qPCR, gRNA, and BLAST records", "Search quickly by gene or sequence", "Revisit parameters, scores, and screening scope"],
        formKicker: login ? "Secure access" : "Create account",
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
