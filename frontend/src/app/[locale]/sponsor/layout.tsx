import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/sponsor",
    zh: {
      title: "支持 PrimerCat | 科研工具维护",
      description: "了解如何支持 PrimerCat 的服务器、数据库查询、维护与开放科研工具开发。",
    },
    en: {
      title: "Support PrimerCat | Research Tool Maintenance",
      description: "Support PrimerCat's servers, database queries, maintenance, and continued development as an open research utility.",
    },
  });
}

export default function SponsorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
