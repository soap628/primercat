import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/tools",
    zh: {
      title: "生命科学实验室小工具｜计算、配液与安全资料｜PrimerCat",
      description: "面向生化、分子生物学与生命科学实验室的在线小工具，包括分子量计算、溶液配制、科研经费预算、试剂安全和实验流程。",
      keywords: ["生命科学工具", "实验室小工具", "溶液配制", "分子量计算", "试剂安全", "科研工具"],
    },
    en: {
      title: "Life Science Laboratory Utilities｜PrimerCat",
      description: "Online utilities for biochemistry and molecular-biology laboratories, including molar-mass calculations, solution preparation, budget planning, reagent safety, and protocols.",
      keywords: ["life science tools", "laboratory utilities", "solution preparation", "molar mass calculator", "reagent safety", "research tools"],
    },
  });
}

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
