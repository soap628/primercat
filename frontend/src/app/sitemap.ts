import type { MetadataRoute } from "next";

const routes = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/primer", priority: 0.9, changeFrequency: "weekly" },
  { path: "/pcr", priority: 0.9, changeFrequency: "weekly" },
  { path: "/grna", priority: 0.9, changeFrequency: "weekly" },
  { path: "/blast", priority: 0.9, changeFrequency: "weekly" },
  { path: "/tools", priority: 0.8, changeFrequency: "monthly" },
  { path: "/methods", priority: 0.8, changeFrequency: "monthly" },
  { path: "/validation", priority: 0.8, changeFrequency: "monthly" },
  { path: "/protocols", priority: 0.8, changeFrequency: "monthly" },
  { path: "/solutions", priority: 0.8, changeFrequency: "monthly" },
  { path: "/chemical-safety", priority: 0.8, changeFrequency: "monthly" },
  { path: "/mw-calc", priority: 0.7, changeFrequency: "monthly" },
  { path: "/fund-calc", priority: 0.7, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/cite", priority: 0.5, changeFrequency: "monthly" },
  { path: "/sponsor", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const modified = new Date();
  return (["zh", "en"] as const).flatMap((locale) =>
    routes.map((route) => ({
      url: `https://primercat.tech/${locale}${route.path}`,
      lastModified: modified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: {
          zh: `https://primercat.tech/zh${route.path}`,
          en: `https://primercat.tech/en${route.path}`,
          "x-default": `https://primercat.tech/zh${route.path}`,
        },
      },
    })),
  );
}
