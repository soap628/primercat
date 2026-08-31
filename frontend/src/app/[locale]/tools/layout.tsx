import type { Metadata } from "next";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }): Metadata {
  const zh = locale === "zh";
  return {
    title: zh ? "小工具 | PrimerCat" : "Utilities | PrimerCat",
    description: zh
      ? "分子量、溶液配制、经费草案、试剂安全与实验流程工具。"
      : "Utilities for molecular weight, solution preparation, budget drafts, reagent safety, and laboratory protocols.",
  };
}

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
