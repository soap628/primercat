import ToolsAppLauncher, { type ToolApp } from "./ToolsAppLauncher";

export default function ToolsPage({ params: { locale } }: { params: { locale: string } }) {
  const isZh = locale === "zh";

  const apps: ToolApp[] = [
    {
      id: "molecular-weight",
      title: isZh ? "分子量计算器" : "MW Calculator",
      icon: "molecule",
      tone: "#586d91",
      href: "/mw-calc",
    },
    {
      id: "solution-preparation",
      title: isZh ? "溶液配制" : "Solution Preparation",
      icon: "flask",
      tone: "#347c6e",
      href: "/solutions",
    },
    {
      id: "research-fund-planner",
      title: isZh ? "科研经费预算" : "Research Budget Planner",
      icon: "fund",
      tone: "#7d5489",
      href: "/fund-calc",
    },
    {
      id: "chemical-safety",
      title: isZh ? "试剂安全与危害" : "Reagent Safety & Hazards",
      icon: "safety",
      tone: "#a84c45",
      href: "/chemical-safety",
    },
    {
      id: "protocol-library",
      title: isZh ? "实验流程库" : "Protocol Library",
      icon: "protocol",
      tone: "#59616b",
      href: "/protocols",
    },
  ];

  return (
    <ToolsAppLauncher
      title={isZh ? "小工具" : "Utilities"}
      apps={apps}
    />
  );
}
