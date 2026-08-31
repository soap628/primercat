"use client";

import Link from "next/link";
import { usePathname } from "@/navigation";
import NavLinks from "./NavLinks";

export default function SiteHeader({ locale }: { locale: string }) {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const isGrna = pathname === "/grna" || pathname.startsWith("/grna/");

  return (
    <header className="nav-glass sticky top-0 site-header-shell">
      <div className="site-header-inner">
        <Link href={`/${locale}`} className={`site-brand${isGrna ? " site-brand-crispr" : ""}`}>
          <span className="site-brand-mark">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <ellipse cx="11" cy="13.5" rx="7.5" ry="6.8" fill="currentColor" opacity="0.96" />
                <polygon points="4.2,10 6.5,3.5 9.8,8.8" fill="currentColor" opacity="0.96" />
                <polygon points="17.8,10 15.5,3.5 12.2,8.8" fill="currentColor" opacity="0.96" />
                <polygon points="5.4,9.6 7,5.2 9.2,8.8" fill="#fca5a5" opacity="0.65" />
                <polygon points="16.6,9.6 15,5.2 12.8,8.8" fill="#fca5a5" opacity="0.65" />
                <circle cx="8.2" cy="13" r="1.4" className="site-brand-eye" />
                <circle cx="13.8" cy="13" r="1.4" className="site-brand-eye" />
                <circle cx="8.7" cy="12.5" r="0.45" fill="white" />
                <circle cx="14.3" cy="12.5" r="0.45" fill="white" />
                <ellipse cx="11" cy="16.2" rx="0.9" ry="0.65" fill="#fca5a5" opacity="0.9" />
              </svg>
          </span>
          <span className="site-brand-name"><span>{isGrna ? "Crispr" : "Primer"}</span><strong>Cat</strong></span>
        </Link>
        <NavLinks locale={locale} />
      </div>
    </header>
  );
}
