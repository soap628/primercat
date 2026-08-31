import type { Metadata } from "next";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }): Metadata {
  const isZh = locale === "zh";
  return {
    title: isZh ? "qPCR 引物设计 | PrimerCat" : "qPCR Primer Design | PrimerCat",
    description: isZh
      ? "从基因名或 DNA 序列生成 Primer3 候选引物，进行 RefSeq RNA BLAST 初筛并展示评分依据。"
      : "Generate qPCR primer candidates from a gene name or DNA sequence with Primer3, RefSeq RNA BLAST screening, and reviewable scoring evidence.",
    alternates: {
      canonical: `https://primercat.tech/${locale}/primer`,
      languages: {
        zh: "https://primercat.tech/zh/primer",
        en: "https://primercat.tech/en/primer",
      },
    },
  };
}

export default function PrimerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
