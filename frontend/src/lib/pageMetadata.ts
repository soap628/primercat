import type { Metadata } from "next";

type PageCopy = {
  title: string;
  description: string;
  keywords?: string[];
};

const SITE_URL = "https://primercat.tech";

export function buildPageMetadata({
  locale,
  path,
  zh,
  en,
  index = true,
}: {
  locale: string;
  path: string;
  zh: PageCopy;
  en: PageCopy;
  index?: boolean;
}): Metadata {
  const activeLocale = locale === "en" ? "en" : "zh";
  const copy = activeLocale === "zh" ? zh : en;
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  const canonical = `${SITE_URL}/${activeLocale}${normalizedPath}`;
  const defaultUrl = `${SITE_URL}/zh${normalizedPath}`;

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: "PrimerCat",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
    alternates: {
      canonical,
      languages: {
        zh: `${SITE_URL}/zh${normalizedPath}`,
        en: `${SITE_URL}/en${normalizedPath}`,
        "x-default": defaultUrl,
      },
    },
    openGraph: {
      type: "website",
      siteName: "PrimerCat",
      title: copy.title,
      description: copy.description,
      url: canonical,
      locale: activeLocale === "zh" ? "zh_CN" : "en_US",
      alternateLocale: activeLocale === "zh" ? ["en_US"] : ["zh_CN"],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
    },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: false },
  };
}
