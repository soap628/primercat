import type { Metadata } from "next";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }): Metadata {
  const zh = locale === "zh";
  return {
    title: zh ? "科研经费预算助手 | PrimerCat" : "Research Budget Planner | PrimerCat",
    description: zh
      ? "按项目总经费、执行年限与可编辑参考比例，生成费用明细和年度科研预算草案。"
      : "Create a line-item and annual research budget draft from total funding, duration, and editable reference shares.",
  };
}

export default function FundCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
