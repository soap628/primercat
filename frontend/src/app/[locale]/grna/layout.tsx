import type { Metadata } from "next";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }): Metadata {
  const isZh = locale === "zh";
  return {
    title: isZh ? "CRISPR gRNA 设计 | CrisprCat" : "CRISPR gRNA Design | CrisprCat",
    description: isZh
      ? "支持 SpCas9、SpCas9-NG 与 Cas12a 的 gRNA 扫描、活性排序和脱靶筛查。"
      : "Scan, rank, and screen CRISPR guides for SpCas9, SpCas9-NG, and Cas12a.",
    alternates: {
      canonical: `https://primercat.tech/${locale}/grna`,
      languages: {
        zh: "https://primercat.tech/zh/grna",
        en: "https://primercat.tech/en/grna",
      },
    },
  };
}

export default function GrnaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
