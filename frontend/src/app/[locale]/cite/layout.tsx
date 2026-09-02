import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/cite",
    zh: {
      title: "引用 PrimerCat | 版本与方法信息",
      description: "获取引用 PrimerCat 时建议记录的网站版本、访问日期、方法组件和数据库范围。",
    },
    en: {
      title: "Citing PrimerCat | Version and Method Details",
      description: "Recommended version, access-date, method-component, and database-scope details to record when citing PrimerCat.",
    },
  });
}

export default function CiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
