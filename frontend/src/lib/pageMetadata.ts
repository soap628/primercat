import type { Metadata } from "next";

type PageCopy = {
  title: string;
  description: string;
};

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
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const canonical = `https://primercat.tech/${activeLocale}${normalizedPath}`;

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical,
      languages: {
        zh: `https://primercat.tech/zh${normalizedPath}`,
        en: `https://primercat.tech/en${normalizedPath}`,
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
    robots: index ? undefined : { index: false, follow: false },
  };
}
