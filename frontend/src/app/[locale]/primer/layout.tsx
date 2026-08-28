import type { Metadata } from "next";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }): Metadata {
  const isZh = locale === "zh";
  return {
    title: isZh ? "qPCR 引物设计 | PrimerCat" : "qPCR Primer Design | PrimerCat",
    description: isZh
      ? "从基因名或 DNA 序列自动完成 Primer3 设计、RefSeq RNA BLAST 验证与评分排序。"
      : "Design qPCR primers from a gene name or DNA sequence with Primer3, RefSeq RNA BLAST screening, and transparent scoring.",
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
