import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/zh/account", "/en/account", "/api/"],
    },
    sitemap: "https://primercat.tech/sitemap.xml",
    host: "https://primercat.tech",
  };
}
