import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/chemical-safety",
    zh: {
      title: "实验室化学品毒性与试剂安全查询｜PrimerCat",
      description: "按名称或 CAS 查询生命科学常见试剂的毒性与危害摘要、PPE、操作控制、不相容物、储存和废弃提示；实际操作前仍须核对商品 SDS。",
      keywords: ["实验室化学品毒性", "试剂安全", "CAS 查询", "化学品危害", "SDS", "生命科学实验室安全"],
    },
    en: {
      title: "Laboratory Chemical Toxicity & Reagent Safety｜PrimerCat",
      description: "Search life-science reagents by name or CAS for toxicity and hazard summaries, PPE, handling controls, incompatibilities, storage, and disposal guidance. Confirm the product SDS before use.",
      keywords: ["laboratory chemical toxicity", "reagent safety", "CAS lookup", "chemical hazards", "SDS", "life science lab safety"],
    },
  });
}

export default function ChemicalSafetyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
