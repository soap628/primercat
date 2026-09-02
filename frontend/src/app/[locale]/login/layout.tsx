import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/login",
    zh: { title: "登录 | PrimerCat", description: "登录 PrimerCat 以查看已保存的设计记录。" },
    en: { title: "Sign In | PrimerCat", description: "Sign in to PrimerCat to access saved design records." },
    index: false,
  });
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
