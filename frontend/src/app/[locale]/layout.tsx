import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import Footer from "../Footer";
import SiteHeader from "../SiteHeader";
import { AuthProvider } from "@/lib/useAuth";
import { ToastProvider } from "@/lib/useToast";
import { buildPageMetadata } from "@/lib/pageMetadata";
import StructuredData from "@/components/StructuredData";

const locales = ["zh", "en"] as const;

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  return buildPageMetadata({
    locale,
    path: "",
    zh: {
      title: "引物猫 PrimerCat｜免费在线 qPCR、PCR 引物设计工具",
      description: "PrimerCat（引物猫）是面向生命科学研究的免费在线引物设计工具。输入基因名或 DNA 序列，一键生成 qPCR、PCR 候选引物，并查看 Primer3 参数、RefSeq 参考序列与特异性筛查依据。",
      keywords: ["引物设计", "在线引物设计", "qPCR 引物设计", "PCR 引物设计", "引物猫", "PrimerCat", "Primer3"],
    },
    en: {
      title: "PrimerCat｜Free Online qPCR & PCR Primer Design Tool",
      description: "Design qPCR and PCR primer candidates online from a gene name or DNA sequence. Review Primer3 parameters, RefSeq provenance, and specificity-screening evidence.",
      keywords: ["primer design", "qPCR primer design", "PCR primer design", "online primer design", "PrimerCat", "Primer3"],
    },
  });
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as (typeof locales)[number])) notFound();

  const messages = await getMessages();
  const isZh = locale === "zh";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://primercat.tech/#website",
        url: "https://primercat.tech/",
        name: "PrimerCat",
        alternateName: "引物猫",
        description: isZh
          ? "面向生命科学研究的在线引物设计与实验室工具平台。"
          : "An online primer-design and laboratory utility platform for life-science research.",
        inLanguage: isZh ? "zh-CN" : "en",
      },
      {
        "@type": "WebApplication",
        "@id": "https://primercat.tech/#application",
        name: "PrimerCat",
        alternateName: "引物猫",
        url: `https://primercat.tech/${locale}`,
        applicationCategory: "ScienceApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires a modern web browser with JavaScript enabled.",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "CNY",
        },
        featureList: isZh
          ? ["qPCR 引物设计", "PCR 引物设计", "CRISPR gRNA 设计", "NCBI BLAST 序列比对", "实验室计算与安全资料"]
          : ["qPCR primer design", "PCR primer design", "CRISPR gRNA design", "NCBI BLAST sequence search", "Laboratory calculations and safety references"],
        inLanguage: isZh ? "zh-CN" : "en",
      },
    ],
  };

  return (
    <html lang={locale}>
      <body style={{ minHeight: "100vh" }}>
        <StructuredData data={structuredData} />
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <ToastProvider>
            <div className="site-shell">
              <a className="skip-link" href="#main-content">
                {locale === "zh" ? "跳到主要内容" : "Skip to main content"}
              </a>
              <SiteHeader locale={locale} />

              <main id="main-content" className="site-main">{children}</main>

              <Footer locale={locale} />
            </div>
            </ToastProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
