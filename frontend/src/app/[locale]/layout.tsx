import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Footer from "../Footer";
import SiteHeader from "../SiteHeader";
import { AuthProvider } from "@/lib/useAuth";
import { ToastProvider } from "@/lib/useToast";

const locales = ["zh", "en"] as const;

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: t("meta_title"),
    description: t("meta_desc"),
  };
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

  return (
    <html lang={locale}>
      <body style={{ minHeight: "100vh" }}>
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
