"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "@/navigation";
import { useAuth } from "@/lib/useAuth";

function CatLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M4.4 10.2 6.7 3.8l3.2 4.3a9 9 0 0 1 2.2 0l3.2-4.3 2.3 6.4a7.5 7.5 0 0 1 .9 3.6c0 4-3.3 6.2-7.5 6.2s-7.5-2.2-7.5-6.2c0-1.3.3-2.5.9-3.6Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <circle cx="8.4" cy="13.2" r="1" fill="currentColor" />
      <circle cx="13.6" cy="13.2" r="1" fill="currentColor" />
      <path d="M9.4 16.3c1 .7 2.2.7 3.2 0" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  }
  return { dark, toggle };
}

// SVG icons — clean, no emoji
function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="4"/>
      <line x1="12" y1="20" x2="12" y2="22"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="2" y1="12" x2="4" y2="12"/>
      <line x1="20" y1="12" x2="22" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

export default function HomeTopBar({ locale }: { locale: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { dark, toggle } = useDarkMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const topbarRef = useRef<HTMLElement>(null);

  const otherLocale = locale === "zh" ? "en" : "zh";
  const otherLabel  = locale === "zh" ? "EN" : "中文";
  const loginLabel  = locale === "zh" ? "登录" : "Sign in";
  const accountLabel = locale === "zh" ? "账户" : "Account";
  const navLinks = locale === "zh"
    ? [
        { href: "/primer", label: "引物设计" },
        { href: "/pcr", label: "PCR" },
        { href: "/grna", label: "CRISPR" },
        { href: "/solutions", label: "溶液配制" },
        { href: "/chemical-safety", label: "试剂安全" },
        { href: "/tools", label: "全部工具" },
      ]
    : [
        { href: "/primer", label: "Primer design" },
        { href: "/pcr", label: "PCR" },
        { href: "/grna", label: "CRISPR" },
        { href: "/solutions", label: "Solutions" },
        { href: "/chemical-safety", label: "Chemical safety" },
        { href: "/tools", label: "All tools" },
      ];

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (topbarRef.current && !topbarRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  function switchLocale() {
    setMenuOpen(false);
    router.push(pathname, { locale: otherLocale });
  }

  return (
    <header ref={topbarRef} className="home-topbar">
      <Link href={`/${locale}`} className="home-topbar-brand" aria-label={locale === "zh" ? "PrimerCat 首页" : "PrimerCat home"}>
        <span className="home-brand-mark"><CatLogo size={18} /></span>
        <span className="home-brand-wordmark">Primer<strong>Cat</strong></span>
        <span className="home-topbar-tagline">{locale === "zh" ? "科研设计工作台" : "Research design workspace"}</span>
      </Link>

      <nav className="home-primary-nav" aria-label={locale === "zh" ? "首页主导航" : "Homepage navigation"}>
        {navLinks.map((item) => (
          <Link key={item.href} href={`/${locale}${item.href}`} className="home-primary-nav-link">
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Right controls */}
      <div className="home-topbar-actions">

      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={locale === "zh" ? (menuOpen ? "关闭导航菜单" : "打开导航菜单") : (menuOpen ? "Close navigation menu" : "Open navigation menu")}
        aria-expanded={menuOpen}
        aria-controls="home-mobile-navigation"
        className="home-topbar-action home-topbar-menu-button"
      >
        <MenuIcon open={menuOpen} />
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        aria-label={locale === "zh" ? (dark ? "切换到浅色模式" : "切换到深色模式") : (dark ? "Switch to light mode" : "Switch to dark mode")}
        className="home-topbar-action"
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* Language */}
      <button
        onClick={switchLocale}
        aria-label={locale === "zh" ? "Switch to English" : "切换到中文"}
        className="home-topbar-action"
      >
        <GlobeIcon />
        {otherLabel}
      </button>

      {/* Login / Account */}
      {!loading && (
        user ? (
          <Link
            href={`/${locale}/account`}
            className="home-topbar-action home-topbar-account"
          >
            <UserIcon />
            {accountLabel}
          </Link>
        ) : (
          <Link
            href={`/${locale}/login`}
            className="home-topbar-action home-topbar-account"
          >
            <UserIcon />
            {loginLabel}
          </Link>
        )
      )}
      </div>

      {menuOpen && (
        <nav id="home-mobile-navigation" className="home-mobile-primary-nav" aria-label={locale === "zh" ? "移动端首页导航" : "Mobile homepage navigation"}>
          <span className="home-mobile-nav-label">{locale === "zh" ? "探索 PrimerCat" : "Explore PrimerCat"}</span>
          <div className="home-mobile-nav-links">
            {navLinks.map((item, index) => (
              <Link key={item.href} href={`/${locale}${item.href}`} onClick={() => setMenuOpen(false)} className="home-mobile-nav-link">
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.label}
                <b aria-hidden="true">↗</b>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
