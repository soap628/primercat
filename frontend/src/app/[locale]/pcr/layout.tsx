import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/pcr",
    zh: {
      title: "PCR 引物设计工具｜在线生成与特异性筛查｜PrimerCat",
      description: "粘贴 DNA 或 FASTA 序列，在线生成常规 PCR、菌落 PCR 与高保真 PCR 候选引物；查看 5′→3′ 序列、Tm、GC、扩增子、二聚体和可选特异性筛查。",
      keywords: ["PCR 引物设计", "在线 PCR 引物设计", "菌落 PCR 引物", "高保真 PCR", "Primer3", "PrimerCat"],
    },
    en: {
      title: "PCR Primer Design Tool｜Online Design & Screening｜PrimerCat",
      description: "Generate endpoint, colony, and high-fidelity PCR primer candidates from DNA or FASTA. Review 5′→3′ sequences, Tm, GC, amplicons, dimers, and optional specificity screening.",
      keywords: ["PCR primer design", "online PCR primer tool", "colony PCR primers", "high-fidelity PCR", "Primer3", "PrimerCat"],
    },
  });
}

export default function PCRLayout({ children }: { children: React.ReactNode }) {
  return children;
}
