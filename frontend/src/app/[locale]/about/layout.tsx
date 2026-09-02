import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/about",
    zh: {
      title: "关于 PrimerCat | 项目与开发说明",
      description: "了解 PrimerCat 的项目目标、开发背景、研究用途定位、维护方式与联系方式。",
    },
    en: {
      title: "About PrimerCat | Project and Development",
      description: "PrimerCat's project goals, development background, research-use scope, maintenance approach, and contact information.",
    },
  });
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
