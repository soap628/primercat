import type { Metadata } from "next";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }): Metadata {
  const isZh = locale === "zh";
  return {
    title: isZh ? "实验室试剂安全与毒性查询 | PrimerCat" : "Laboratory Reagent Safety & Toxicity | PrimerCat",
    description: isZh
      ? "查询生命科学常见试剂的 CAS、危险摘要、操作控制、不相容物和商品 SDS 边界。"
      : "Search common life-science reagents by name or CAS and review hazard summaries, handling controls, incompatibilities, and product-SDS boundaries.",
    alternates: {
      canonical: `https://primercat.tech/${locale}/chemical-safety`,
      languages: {
        zh: "https://primercat.tech/zh/chemical-safety",
        en: "https://primercat.tech/en/chemical-safety",
      },
    },
  };
}

export default function ChemicalSafetyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
