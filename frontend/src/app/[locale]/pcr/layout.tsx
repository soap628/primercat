import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const isZh = params.locale === "zh";
  return {
    title: isZh ? "常规 PCR 引物设计 | PrimerCat" : "Endpoint PCR Primer Design | PrimerCat",
    description: isZh
      ? "从 DNA 或 FASTA 模板设计常规 PCR、菌落 PCR 与高保真 PCR 引物，查看扩增子和结构参数。"
      : "Design endpoint, colony, and high-fidelity PCR primers from DNA or FASTA templates with transparent amplicon and structure metrics.",
    alternates: {
      canonical: `https://primercat.tech/${params.locale}/pcr`,
      languages: {
        zh: "https://primercat.tech/zh/pcr",
        en: "https://primercat.tech/en/pcr",
      },
    },
  };
}

export default function PCRLayout({ children }: { children: React.ReactNode }) {
  return children;
}
