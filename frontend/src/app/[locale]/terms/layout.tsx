import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/terms",
    zh: { title: "服务条款 | PrimerCat", description: "PrimerCat 的研究用途、结果解释、账户责任、可用性和知识产权条款。" },
    en: { title: "Terms of Service | PrimerCat", description: "PrimerCat terms covering research use, result interpretation, account responsibility, availability, and intellectual property." },
  });
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
