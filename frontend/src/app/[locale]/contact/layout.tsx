import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/contact",
    zh: {
      title: "联系 PrimerCat | 支持与合作",
      description: "联系 PrimerCat，反馈工具问题、提出功能建议，或沟通学术合作、数据共享和项目支持。",
    },
    en: {
      title: "Contact PrimerCat | Support and Collaboration",
      description: "Contact PrimerCat about tool issues, feature requests, academic collaboration, data sharing, or project support.",
    },
  });
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
