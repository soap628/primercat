"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/navigation";
import { useAuth } from "@/lib/useAuth";

function CatLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <ellipse cx="11" cy="13.5" rx="7.5" ry="6.8" fill="white" opacity="0.96" />
      <polygon points="4.2,10 6.5,3.5 9.8,8.8" fill="white" opacity="0.96" />
      <polygon points="17.8,10 15.5,3.5 12.2,8.8" fill="white" opacity="0.96" />
      <polygon points="5.4,9.6 7,5.2 9.2,8.8" fill="#fca5a5" opacity="0.65" />
      <polygon points="16.6,9.6 15,5.2 12.8,8.8" fill="#fca5a5" opacity="0.65" />
      <circle cx="8.2" cy="13" r="1.4" fill="#ffb1ee" />
      <circle cx="13.8" cy="13" r="1.4" fill="#ffb1ee" />
      <circle cx="8.7" cy="12.5" r="0.45" fill="white" />
      <circle cx="14.3" cy="12.5" r="0.45" fill="white" />
      <ellipse cx="11" cy="16.2" rx="0.9" ry="0.65" fill="#fca5a5" opacity="0.9" />
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

const btnBase: React.CSSProperties = {
  cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  color: "rgba(255,255,255,0.72)",
  display: "flex",
  alignItems: "center",
  gap: 6,
  transition: "background 0.15s, border-color 0.15s, color 0.15s",
  lineHeight: 1,
  whiteSpace: "nowrap" as const,
};

export default function HomeTopBar({ locale }: { locale: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { dark, toggle } = useDarkMode();

  const otherLocale = locale === "zh" ? "en" : "zh";
  const otherLabel  = locale === "zh" ? "EN" : "中文";
  const loginLabel  = locale === "zh" ? "登录" : "Sign in";
  const accountLabel = locale === "zh" ? "账户" : "Account";

  function switchLocale() {
    router.push(pathname, { locale: otherLocale });
  }

  return (
    <div style={{
      position: "absolute",
      top: 0, left: 0, right: 0,
      zIndex: 50,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 6,
      padding: "18px 28px",
    }}>

      {/* Brand pill — left side */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "7px 14px 7px 9px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 7, flexShrink: 0,
          background: "linear-gradient(135deg,#181818,#ffb1ee 50%,#539df5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 0 1px rgba(255,177,238,0.3), 0 4px 12px rgba(255,177,238,0.2)",
        }}>
          <CatLogo size={15} />
        </div>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ffb1ee", boxShadow: "0 0 6px rgba(255,177,238,0.8)", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.02em" }}>
          Primer<span style={{ color: "#ffb1ee" }}>Cat</span>
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", marginLeft: 2 }}>
          {locale === "zh" ? "面向科研" : "Built for researchers"}
        </span>
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        aria-label="Toggle dark mode"
        style={{ ...btnBase, padding: "7px 10px" }}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* Language */}
      <button
        onClick={switchLocale}
        style={{ ...btnBase, padding: "7px 12px", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em" }}
      >
        <GlobeIcon />
        {otherLabel}
      </button>

      {/* Login / Account */}
      {!loading && (
        user ? (
          <Link
            href={`/${locale}/account`}
            style={{
              ...btnBase,
              padding: "7px 13px",
              fontSize: 12, fontWeight: 600,
              border: "1px solid rgba(255,177,238,0.3)",
              background: "rgba(255,177,238,0.08)",
              color: "#ffb1ee",
              textDecoration: "none",
            }}
          >
            <UserIcon />
            {accountLabel}
          </Link>
        ) : (
          <Link
            href={`/${locale}/login`}
            style={{
              ...btnBase,
              padding: "7px 14px",
              fontSize: 12, fontWeight: 600,
              border: "1px solid rgba(255,177,238,0.3)",
              background: "rgba(255,177,238,0.08)",
              color: "#ffb1ee",
              textDecoration: "none",
            }}
          >
            <UserIcon />
            {loginLabel}
          </Link>
        )
      )}
      </div>
    </div>
  );
}
