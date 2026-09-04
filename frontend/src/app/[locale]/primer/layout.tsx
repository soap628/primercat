import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/primer",
    zh: {
      title: "qPCR 引物设计工具｜按基因名或序列一键生成｜PrimerCat",
      description: "免费在线设计 qPCR 引物。输入人或小鼠基因名，或粘贴 DNA 序列，由 Primer3 生成候选，并查看 RefSeq 转录本、5′→3′ 序列、扩增子与特异性筛查依据。",
      keywords: ["qPCR 引物设计", "实时荧光定量 PCR 引物", "在线设计引物", "一键设计引物", "Primer3", "PrimerCat"],
    },
    en: {
      title: "qPCR Primer Design Tool｜Gene or Sequence Input｜PrimerCat",
      description: "Design qPCR primers online from a human or mouse gene name or a DNA sequence. Review Primer3 candidates, RefSeq provenance, 5′→3′ sequences, amplicons, and specificity evidence.",
      keywords: ["qPCR primer design", "real-time PCR primers", "online primer design", "Primer3", "PrimerCat"],
    },
  });
}

export default function PrimerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
