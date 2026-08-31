"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "@/navigation";
import { useAuth } from "@/lib/useAuth";

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

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

// Small inline cat logo for PrimerCat nav link
function CatIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <ellipse cx="11" cy="13.5" rx="7.5" ry="6.8" fill="currentColor" opacity="0.9" />
      <polygon points="4.2,10 6.5,3.5 9.8,8.8" fill="currentColor" opacity="0.9" />
      <polygon points="17.8,10 15.5,3.5 12.2,8.8" fill="currentColor" opacity="0.9" />
      <polygon points="5.4,9.6 7,5.2 9.2,8.8" fill="white" opacity="0.35" />
      <polygon points="16.6,9.6 15,5.2 12.8,8.8" fill="white" opacity="0.35" />
      <circle cx="8.2" cy="13" r="1.4" fill="white" opacity="0.85" />
      <circle cx="13.8" cy="13" r="1.4" fill="white" opacity="0.85" />
    </svg>
  );
}

// BlastIcon — DNA search / magnifier motif
function BlastIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="2" />
      <line x1="14" y1="14" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="6" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// CrisprCat — visually distinct: rounder, bigger eyes, CRISPR scissors detail
function CrisprCatIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">
      {/* rounder body */}
      <ellipse cx="11" cy="13" rx="8" ry="7.2" fill="currentColor" opacity="0.9" />
      {/* shorter ears */}
      <polygon points="4.5,10.5 6.2,5 9.2,9.5" fill="currentColor" opacity="0.9" />
      <polygon points="17.5,10.5 15.8,5 12.8,9.5" fill="currentColor" opacity="0.9" />
      {/* inner ear */}
      <polygon points="5.6,10 6.8,6.5 8.7,9.5" fill="white" opacity="0.3" />
      <polygon points="16.4,10 15.2,6.5 13.3,9.5" fill="white" opacity="0.3" />
      {/* bigger eyes */}
      <circle cx="8" cy="12.5" r="1.8" fill="white" opacity="0.9" />
      <circle cx="14" cy="12.5" r="1.8" fill="white" opacity="0.9" />
      {/* pupils */}
      <ellipse cx="8.4" cy="12.8" rx="0.9" ry="1.1" fill="currentColor" />
      <ellipse cx="14.4" cy="12.8" rx="0.9" ry="1.1" fill="currentColor" />
      {/* scissors mark — CRISPR scissors on forehead */}
      <path d="M9.5 8.8 L11 7.5 L12.5 8.8" stroke="white" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" fill="none"/>
    </svg>
  );
}

const COPY = {
  zh: {
    primer: "PrimerCat",
    pcr: "PCR",
    crispr: "CrisprCat",
    blast: "BLAST",
    methods: "方法",
    validation: "可信度",
    tools: "工具",
    otherLabel: "EN",
    login: "登录",
    history: "历史记录",
    logout: "退出登录",
    openMenu: "打开导航菜单",
    closeMenu: "关闭导航菜单",
    darkMode: "切换深色模式",
    lightMode: "切换浅色模式",
  },
  en: {
    primer: "PrimerCat",
    pcr: "PCR",
    crispr: "CrisprCat",
    blast: "BLAST",
    methods: "Methods",
    validation: "Trust",
    tools: "Tools",
    otherLabel: "中文",
    login: "Login",
    history: "History",
    logout: "Logout",
    openMenu: "Open navigation menu",
    closeMenu: "Close navigation menu",
    darkMode: "Switch to dark mode",
    lightMode: "Switch to light mode",
  },
} as const;

export default function NavLinks({ locale }: { locale: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const copy = locale === "zh" ? COPY.zh : COPY.en;
  const otherLocale = locale === "zh" ? "en" : "zh";
  const { user, loading, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const { dark, toggle } = useDarkMode();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const links = [
    { href: "/primer", label: copy.primer, icon: <CatIcon />, matchPrefixes: ["/primer"] },
    { href: "/pcr", label: copy.pcr, icon: "P", matchPrefixes: ["/pcr"] },
    { href: "/grna", label: copy.crispr, icon: <CrisprCatIcon />, matchPrefixes: ["/grna"] },
    { href: "/blast", label: copy.blast, icon: <BlastIcon />, matchPrefixes: ["/blast"] },
    { href: "/methods", label: copy.methods, icon: "M", matchPrefixes: ["/methods"] },
    { href: "/validation", label: copy.validation, icon: "V", matchPrefixes: ["/validation"] },
    { href: "/tools", label: copy.tools, icon: "+", matchPrefixes: ["/tools", "/mw-calc", "/solutions", "/chemical-safety"] },
  ];

  function switchLocale() {
    setMobileOpen(false);
    router.push(pathname, { locale: otherLocale });
  }

  function renderLinks(mobile = false) {
    return links.map((item) => {
        const href = `/${locale}${item.href}`;
        const active = item.matchPrefixes.some(
          (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
        );
        const isCrispr = item.href === "/grna";
        const isBlast = item.href === "/blast";
        const isPcr = item.href === "/pcr";
        return (
          <Link
            key={item.href}
            href={href}
            onClick={mobile ? () => setMobileOpen(false) : undefined}
            aria-current={active ? "page" : undefined}
            className={`nav-link${active ? " nav-link-active" : ""}${isPcr ? " nav-link-pcr" : ""}${isCrispr ? " nav-link-crispr" : ""}${isBlast ? " nav-link-blast" : ""}${mobile ? " mobile-nav-link" : ""}`}
          >
            <span className="nav-product-icon">{item.icon}</span>
            {item.label}
            {isCrispr && (
              <span className="nav-beta">beta</span>
            )}
          </Link>
        );
      });
  }

  return (
    <>
      <nav className="nav-desktop" aria-label={locale === "zh" ? "主导航" : "Main navigation"}>
      {renderLinks()}

      {/* Theme toggle — SVG icon */}
      <button
        type="button"
        onClick={toggle}
        className="nav-link nav-icon-button"
        aria-label={dark ? copy.lightMode : copy.darkMode}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* Language switcher — SVG globe + label */}
      <button
        type="button"
        onClick={switchLocale}
        className="nav-link nav-utility-button nav-language-button"
        aria-label={locale === "zh" ? "Switch to English" : "切换到中文"}
      >
        <GlobeIcon />
        {copy.otherLabel}
      </button>

      {!loading && (
        <>
          {user ? (
            <div ref={dropdownRef} className="nav-account-wrap">
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="nav-link nav-account-button"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-controls="account-navigation-panel"
              >
                {user.display_name || user.email.split("@")[0]} ▾
              </button>
              {dropdownOpen && (
                <div
                  id="account-navigation-panel"
                  className="nav-account-menu"
                >
                  <Link
                    href={`/${locale}/account`}
                    onClick={() => setDropdownOpen(false)}
                    className="nav-account-menu-link"
                  >
                    {copy.history}
                  </Link>
                  <button
                    type="button"
                    onClick={() => { logout(); setDropdownOpen(false); }}
                    className="nav-account-menu-logout"
                  >
                    {copy.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="nav-link nav-account-button"
            >
              {copy.login}
            </Link>
          )}
        </>
      )}
      </nav>

      <div ref={mobileRef} className="nav-mobile">
        <button
          type="button"
          className="nav-menu-button"
          aria-label={mobileOpen ? copy.closeMenu : copy.openMenu}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation-panel"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        {mobileOpen && (
          <nav
            id="mobile-navigation-panel"
            className="mobile-nav-panel"
            aria-label={locale === "zh" ? "移动端导航" : "Mobile navigation"}
          >
            <div className="mobile-nav-links">{renderLinks(true)}</div>
            <div className="mobile-nav-actions">
              <button
                type="button"
                onClick={toggle}
                className="mobile-nav-action"
                aria-label={dark ? copy.lightMode : copy.darkMode}
              >
                {dark ? <SunIcon /> : <MoonIcon />}
                <span>{dark ? copy.lightMode : copy.darkMode}</span>
              </button>
              <button
                type="button"
                onClick={switchLocale}
                className="mobile-nav-action"
                aria-label={locale === "zh" ? "Switch to English" : "切换到中文"}
              >
                <GlobeIcon />
                <span>{copy.otherLabel}</span>
              </button>
            </div>

            {!loading && (
              <div className="mobile-nav-account">
                {user ? (
                  <>
                    <Link href={`/${locale}/account`} onClick={() => setMobileOpen(false)} className="mobile-nav-account-link">
                      <span className="mobile-nav-account-name">{user.display_name || user.email.split("@")[0]}</span>
                      <span>{copy.history}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="mobile-nav-logout"
                    >
                      {copy.logout}
                    </button>
                  </>
                ) : (
                  <Link href={`/${locale}/login`} onClick={() => setMobileOpen(false)} className="mobile-nav-login">
                    {copy.login}
                  </Link>
                )}
              </div>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
