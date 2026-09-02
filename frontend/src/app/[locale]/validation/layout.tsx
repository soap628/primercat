import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/validation",
    zh: {
      title: "结果可信度与验证建议 | PrimerCat",
      description: "区分确定性计算、数据库筛查、启发式排序与实验验证，并说明 PrimerCat 当前能够支持和不能支持的结论。",
    },
    en: {
      title: "Confidence and Validation Guidance | PrimerCat",
      description: "Separate deterministic calculations, database screens, heuristic ranks, and experimental validation, with explicit limits on supported conclusions.",
    },
  });
}

export default function ValidationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
