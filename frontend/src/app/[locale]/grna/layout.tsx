import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/grna",
    zh: {
      title: "CRISPR gRNA 在线设计与脱靶筛查｜CRISPR CAT",
      description: "为 SpCas9、SpCas9-NG 与 Cas12a 扫描候选 gRNA，查看 PAM、序列方向、启发式活性排序和声明范围内的脱靶风险。",
      keywords: ["CRISPR gRNA 设计", "sgRNA 设计", "CRISPR 脱靶", "SpCas9", "Cas12a", "CRISPR CAT"],
    },
    en: {
      title: "CRISPR gRNA Design & Off-target Screening｜CRISPR CAT",
      description: "Scan candidate guides for SpCas9, SpCas9-NG, and Cas12a, with PAM context, strand orientation, heuristic activity ranking, and scoped off-target evidence.",
      keywords: ["CRISPR gRNA design", "sgRNA design", "CRISPR off-target", "SpCas9", "Cas12a", "CRISPR CAT"],
    },
  });
}

export default function GrnaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
