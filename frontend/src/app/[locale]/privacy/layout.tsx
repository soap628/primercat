import { buildPageMetadata } from "@/lib/pageMetadata";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  return buildPageMetadata({
    locale,
    path: "/privacy",
    zh: { title: "隐私政策 | PrimerCat", description: "PrimerCat 的数据处理、账户信息、日志、Cookie、第三方服务和用户权利说明。" },
    en: { title: "Privacy Policy | PrimerCat", description: "How PrimerCat handles account data, logs, cookies, third-party services, and user privacy rights." },
  });
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
