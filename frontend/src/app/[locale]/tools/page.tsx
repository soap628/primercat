import ToolsAppLauncher, { type ToolApp } from "./ToolsAppLauncher";

export default function ToolsPage({ params: { locale } }: { params: { locale: string } }) {
  const isZh = locale === "zh";

  const apps: ToolApp[] = [
    {
      id: "molecular-weight",
      title: isZh ? "分子量计算器" : "MW Calculator",
      body: isZh ? "分子式、摩尔质量与稀释换算" : "Formula, molar mass, and dilution",
      code: "MW",
      tone: "#667085",
      href: "/mw-calc",
    },
    {
      id: "solution-preparation",
      title: isZh ? "溶液配制" : "Solution Preparation",
      body: isZh ? "按浓度和体积计算试剂用量" : "Calculate reagent amounts by concentration and volume",
      code: "SL",
      tone: "#497d70",
      href: "/solutions",
    },
    {
      id: "research-fund-planner",
      title: isZh ? "科研经费分配" : "Research Fund Planner",
      body: isZh ? "拆分预算明细与年度计划" : "Split a budget into line items and annual plans",
      code: "FD",
      tone: "#875c92",
      href: "/fund-calc",
    },
    {
      id: "chemical-safety",
      title: isZh ? "试剂安全与毒性" : "Reagent Safety & Toxicity",
      body: isZh ? "查询常用试剂的安全信息" : "Look up safety information for common reagents",
      code: "HS",
      tone: "#b5473c",
      href: "/chemical-safety",
    },
  ];

  return (
    <ToolsAppLauncher
      title={isZh ? "小工具" : "Utilities"}
      apps={apps}
    />
  );
}
