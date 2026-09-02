import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/mw-calc",
    zh: {
      title: "分子量计算器 | PrimerCat",
      description: "按化学式计算摩尔质量，并显示元素组成、质量贡献和可复核的计算明细。",
    },
    en: {
      title: "Molecular Weight Calculator | PrimerCat",
      description: "Calculate molar mass from a chemical formula with elemental composition, mass contributions, and reviewable calculation details.",
    },
  });
}

export default function MolecularWeightLayout({ children }: { children: React.ReactNode }) {
  return children;
}
