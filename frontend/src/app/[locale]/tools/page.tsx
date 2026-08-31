import { getTranslations } from "next-intl/server";
import ToolsAppLauncher, { type ToolApp } from "./ToolsAppLauncher";

export default async function ToolsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "tools" });
  const isZh = locale === "zh";
  const ready = isZh ? "可用" : "Ready";

  const apps: ToolApp[] = [
    {
      id: "molecular-weight",
      category: "calculation",
      eyebrow: t("card_mw_eyebrow"),
      title: t("card_mw_title"),
      body: t("card_mw_body"),
      code: "MW",
      tone: "#667085",
      system: "formula · dilution · conversion",
      status: ready,
      actions: [{ href: "/mw-calc", label: t("card_mw_cta") }],
    },
    {
      id: "solution-preparation",
      category: "calculation",
      eyebrow: t("card_solutions_eyebrow"),
      title: t("card_solutions_title"),
      body: t("card_solutions_body"),
      code: "SL",
      tone: "#497d70",
      system: "recipes · scaling · records",
      status: ready,
      actions: [{ href: "/solutions", label: t("card_solutions_cta") }],
    },
    {
      id: "research-fund-planner",
      category: "calculation",
      eyebrow: isZh ? "预算草案 · 年度计划 · 导出" : "Budget draft · annual plan · export",
      title: isZh ? "科研经费分配" : "Research Fund Planner",
      body: isZh
        ? "按总经费、执行年限与内部参考比例生成费用明细和年度预算草案，支持保存、复制与 CSV／Word 导出。"
        : "Build a line-item and annual budget draft from total funding, duration, and editable internal shares. Save, copy, or export it as CSV or Word.",
      code: "FD",
      tone: "#875c92",
      system: "allocation · annual plan · local draft",
      status: ready,
      actions: [{ href: "/fund-calc", label: isZh ? "开始分配" : "Plan a budget" }],
    },
    {
      id: "chemical-safety",
      category: "reference",
      eyebrow: t("card_safety_eyebrow"),
      title: t("card_safety_title"),
      body: t("card_safety_body"),
      code: "HS",
      tone: "#b5473c",
      system: "GHS · SDS · PubChem",
      status: ready,
      actions: [{ href: "/chemical-safety", label: t("card_safety_cta") }],
    },
  ];

  return (
    <ToolsAppLauncher
      locale={locale}
      title={isZh ? "实验室小工具" : "Lab utilities"}
      intro={isZh
        ? "把常用计算、经费预算、溶液配制和安全资料放在手边。核心设计产品与方法说明保留在各自的独立入口。"
        : "Keep routine calculations, budget planning, solution preparation, and safety references close at hand. Core design products and methodology remain in their own destinations."}
      note={isZh
        ? "小工具用于辅助实验准备；数据来源和使用边界会在对应页面中说明。"
        : "Utilities support bench preparation; each page states its sources and usage limits."}
      apps={apps}
    />
  );
}
