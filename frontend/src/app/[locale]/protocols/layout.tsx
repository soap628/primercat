import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/protocols",
    zh: {
      title: "分子生物学实验 Protocol 与操作流程｜PrimerCat",
      description: "检索并逐步查看 PCR、电泳、克隆、微生物培养、Western blot 等常用生命科学实验流程，包含关键检查点、风险提示和原始来源。",
      keywords: ["分子生物学 protocol", "实验流程", "PCR 实验步骤", "Western blot protocol", "实验室操作指南"],
    },
    en: {
      title: "Molecular Biology Protocols & Laboratory Workflows｜PrimerCat",
      description: "Search step-by-step protocols for PCR, electrophoresis, cloning, microbiology, and western blotting, with checkpoints, risk notes, and primary sources.",
      keywords: ["molecular biology protocols", "laboratory workflows", "PCR protocol", "western blot protocol", "lab procedures"],
    },
  });
}

export default function ProtocolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
