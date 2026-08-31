import type { Metadata } from "next";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }): Metadata {
  const zh = locale === "zh";
  return {
    title: zh ? "小工具 | PrimerCat" : "Utilities | PrimerCat",
    description: zh
      ? "PrimerCat 的四个科研小工具。"
      : "Four research utilities from PrimerCat.",
  };
}

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
