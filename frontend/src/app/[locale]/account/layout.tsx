import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/account",
    zh: { title: "我的设计记录 | PrimerCat", description: "查看 PrimerCat 账户中保存的设计记录。" },
    en: { title: "Saved Design Records | PrimerCat", description: "Review design records saved to your PrimerCat account." },
    index: false,
  });
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
