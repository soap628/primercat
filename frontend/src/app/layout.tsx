import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  verification: {
    other: {
      "baidu-site-verification": "codeva-8yg84JXAaU",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Root layout — shell only.
// Language-specific layout, nav, and providers live in app/[locale]/layout.tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
