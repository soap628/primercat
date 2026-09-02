import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/solutions",
    zh: {
      title: "实验室溶液配制与计算 | PrimerCat",
      description: "摩尔浓度、储备液稀释和百分浓度计算，以及生命科学实验室常用溶液的可缩放配方、安全提示与来源。",
    },
    en: {
      title: "Laboratory Solution Preparation | PrimerCat",
      description: "Molarity, dilution, and percentage calculators with scalable life-science solution recipes, safety notes, and sources.",
    },
  });
}

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
