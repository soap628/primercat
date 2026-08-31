import type { Metadata } from "next";

export function generateMetadata({ params: { locale } }: { params: { locale: string } }): Metadata {
  const zh = locale === "zh";
  return {
    title: zh ? "常用实验流程库 | PrimerCat" : "Laboratory Protocol Library | PrimerCat",
    description: zh
      ? "可检索、可筛选、可逐步勾选的分子生物学实验流程库，覆盖 PCR、电泳、克隆、微生物培养与 Western blot。"
      : "A searchable, filterable, step-by-step laboratory protocol library for PCR, electrophoresis, cloning, microbiology, and western blotting.",
  };
}

export default function ProtocolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
