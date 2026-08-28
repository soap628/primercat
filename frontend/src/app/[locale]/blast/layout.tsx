import type { Metadata } from "next";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }): Metadata {
  const isZh = locale === "zh";
  return {
    title: isZh ? "NCBI BLAST 序列比对 | PrimerCat" : "NCBI BLAST Sequence Search | PrimerCat",
    description: isZh
      ? "运行 blastn、blastp、blastx 与 tblastn，并查看命中和比对详情。"
      : "Run blastn, blastp, blastx, or tblastn and inspect ranked hits and alignments.",
    alternates: {
      canonical: `https://primercat.tech/${locale}/blast`,
      languages: {
        zh: "https://primercat.tech/zh/blast",
        en: "https://primercat.tech/en/blast",
      },
    },
  };
}

export default function BlastLayout({ children }: { children: React.ReactNode }) {
  return children;
}
