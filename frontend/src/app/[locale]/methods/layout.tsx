import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/methods",
    zh: {
      title: "计算方法、参数与适用范围 | PrimerCat",
      description: "说明 PrimerCat 如何选择参考序列、生成候选、执行数据库筛查并排序，包含默认阈值、实现范围与结论边界。",
    },
    en: {
      title: "Methods, Parameters, and Scope | PrimerCat",
      description: "How PrimerCat resolves reference sequences, generates candidates, screens databases, and ranks results, including defaults and conclusion boundaries.",
    },
  });
}

export default function MethodsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
