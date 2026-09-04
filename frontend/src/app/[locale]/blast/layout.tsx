import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/blast",
    zh: {
      title: "NCBI BLAST 在线序列比对工具｜PrimerCat",
      description: "在线运行 NCBI blastn、blastp、blastx 与 tblastn，查看匹配序列、相似度、E-value、覆盖度和逐段比对详情。",
      keywords: ["NCBI BLAST", "在线序列比对", "blastn", "blastp", "DNA 序列比对", "蛋白序列比对"],
    },
    en: {
      title: "NCBI BLAST Online Sequence Search｜PrimerCat",
      description: "Run NCBI blastn, blastp, blastx, or tblastn online and inspect ranked hits, identity, E-values, coverage, and alignment details.",
      keywords: ["NCBI BLAST", "online sequence alignment", "blastn", "blastp", "DNA sequence search", "protein sequence search"],
    },
  });
}

export default function BlastLayout({ children }: { children: React.ReactNode }) {
  return children;
}
