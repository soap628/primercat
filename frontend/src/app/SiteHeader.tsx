"use client";

import Link from "next/link";
import { usePathname } from "@/navigation";
import NavLinks from "./NavLinks";

export default function SiteHeader({ locale }: { locale: string }) {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const isGrna = pathname === "/grna" || pathname.startsWith("/grna/");

  const innerEarColor = "#3ecf8e";
  const brandAccent = "#3ecf8e";
  const brandName = isGrna
    ? <><span style={{ color: "#fafafa" }}>Crispr</span><span style={{ color: brandAccent }}>Cat</span></>
    : <><span style={{ color: "#fafafa" }}>Primer</span><span style={{ color: brandAccent }}>Cat</span></>;

  return (
    <>
      <div style={{ height: 1, background: "#2e2e2e" }} />
      <header className="nav-glass sticky top-0 site-header-shell">
        <div className="site-header-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link
            href={`/${locale}`}
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
          >
            <div
              style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: "#171717",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 0 1px #2e2e2e",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <ellipse cx="11" cy="13.5" rx="7.5" ry="6.8" fill="white" opacity="0.96" />
                <polygon points="4.2,10 6.5,3.5 9.8,8.8" fill="white" opacity="0.96" />
                <polygon points="17.8,10 15.5,3.5 12.2,8.8" fill="white" opacity="0.96" />
                <polygon points="5.4,9.6 7,5.2 9.2,8.8" fill="#fca5a5" opacity="0.65" />
                <polygon points="16.6,9.6 15,5.2 12.8,8.8" fill="#fca5a5" opacity="0.65" />
                <circle cx="8.2" cy="13" r="1.4" fill={innerEarColor} />
                <circle cx="13.8" cy="13" r="1.4" fill={innerEarColor} />
                <circle cx="8.7" cy="12.5" r="0.45" fill="white" />
                <circle cx="14.3" cy="12.5" r="0.45" fill="white" />
                <ellipse cx="11" cy="16.2" rx="0.9" ry="0.65" fill="#fca5a5" opacity="0.9" />
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {brandName}
            </span>
          </Link>
          <NavLinks locale={locale} />
        </div>
      </header>
    </>
  );
}
