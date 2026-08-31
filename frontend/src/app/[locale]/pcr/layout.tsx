import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const isZh = params.locale === "zh";
  return {
    title: isZh ? "常规 PCR 引物设计 | PrimerCat" : "Endpoint PCR Primer Design | PrimerCat",
    description: isZh
      ? "从 DNA 或 FASTA 模板生成常规、菌落与高保真 PCR 候选引物，并查看扩增子、坐标和结构参数。"
      : "Generate endpoint, colony, and high-fidelity PCR primer candidates from DNA or FASTA templates with amplicon, coordinate, and structure metrics.",
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
