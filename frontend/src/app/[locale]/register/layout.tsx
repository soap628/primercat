import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/register",
    zh: { title: "注册 | PrimerCat", description: "创建 PrimerCat 账户以保存设计记录。" },
    en: { title: "Create Account | PrimerCat", description: "Create a PrimerCat account to save design records." },
    index: false,
  });
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
