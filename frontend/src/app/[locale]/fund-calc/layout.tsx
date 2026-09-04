import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/fund-calc",
    zh: {
      title: "科研经费预算计算器｜项目预算分配助手｜PrimerCat",
      description: "按项目总经费、执行年限与可编辑参考比例，生成设备费、业务费、劳务费等费用明细和年度科研预算草案。",
      keywords: ["科研经费预算", "项目预算计算器", "科研经费分配", "经费预算表", "科研工具"],
    },
    en: {
      title: "Research Funding Budget Calculator｜PrimerCat",
      description: "Create editable line-item and annual research budget drafts from total funding, project duration, and reference allocation shares.",
      keywords: ["research budget calculator", "grant budget planner", "research funding allocation", "project budget"],
    },
  });
}

export default function FundCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
