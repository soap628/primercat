"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "@/navigation";
import { useAuth } from "@/lib/useAuth";

const COPY = {
  zh: {
    primer: "qPCR",
    methods: "方法",
    validation: "可信度",
    tools: "更多工具",
    otherLabel: "EN",
    login: "登录",
    history: "历史记录",
    logout: "退出登录",
  },
  en: {
    primer: "qPCR",
    methods: "Methods",
    validation: "Trust",
    tools: "More Tools",
    otherLabel: "中文",
    login: "Login",
    history: "History",
    logout: "Logout",
  },
} as const;

export default function NavLinks({ locale }: { locale: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const copy = locale === "zh" ? COPY.zh : COPY.en;
  const otherLocale = locale === "zh" ? "en" : "zh";
  const { user, loading, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const links = [
    { href: "/primer", label: copy.primer, icon: "Q", matchPrefixes: ["/primer"] },
    { href: "/methods", label: copy.methods, icon: "M", matchPrefixes: ["/methods"] },
    { href: "/validation", label: copy.validation, icon: "V", matchPrefixes: ["/validation"] },
    { href: "/tools", label: copy.tools, icon: "+", matchPrefixes: ["/tools", "/grna", "/blast"] },
  ];

  function switchLocale() {
    if (pathname.startsWith(`/${locale}`)) {
      router.push(pathname.replace(`/${locale}`, `/${otherLocale}`));
      return;
    }
    router.push(`/${otherLocale}${pathname}`);
  }

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
      {links.map((item) => {
        const href = `/${locale}${item.href}`;
        const active = item.matchPrefixes.some((prefix) => pathname === `/${locale}${prefix}` || pathname.startsWith(`/${locale}${prefix}/`));
        return (
          <Link key={item.href} href={href} className={`nav-link${active ? " nav-link-active" : ""}`}>
            <span style={{ fontSize: 11, lineHeight: 1, fontWeight: 700 }}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      <button
        onClick={switchLocale}
        className="nav-link"
        style={{
          marginLeft: 8,
          cursor: "pointer",
          border: "1px solid rgba(148,163,184,0.3)",
          borderRadius: 8,
          padding: "5px 12px",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          background: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(241,245,249,0.85))",
          boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
          color: "#475569",
        }}
      >
        {copy.otherLabel}
      </button>

      {!loading && (
        <>
          {user ? (
            <div ref={dropdownRef} style={{ position: "relative", marginLeft: 6 }}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="nav-link"
                style={{
                  cursor: "pointer",
                  border: "1px solid rgba(163,31,52,0.2)",
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: "linear-gradient(135deg, rgba(163,31,52,0.07), rgba(255,255,255,0.9))",
                  color: "var(--accent)",
                  maxWidth: 130,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.display_name || user.email.split("@")[0]} ▾
              </button>
              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 6px)",
                    background: "#fff",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-lg)",
                    boxShadow: "var(--shadow-lg)",
                    minWidth: 148,
                    zIndex: 100,
                    overflow: "hidden",
                  }}
                >
                  <Link
                    href={`/${locale}/account`}
                    onClick={() => setDropdownOpen(false)}
                    style={{ display: "block", padding: "10px 16px", fontSize: 13, color: "var(--text-1)", textDecoration: "none" }}
                  >
                    {copy.history}
                  </Link>
                  <button
                    onClick={() => { logout(); setDropdownOpen(false); }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 16px",
                      fontSize: 13,
                      color: "var(--red)",
                      background: "none",
                      border: "none",
                      borderTop: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                  >
                    {copy.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="nav-link"
              style={{
                marginLeft: 6,
                border: "1px solid rgba(163,31,52,0.3)",
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                background: "linear-gradient(135deg, rgba(163,31,52,0.08), rgba(255,255,255,0.9))",
                color: "var(--accent)",
              }}
            >
              {copy.login}
            </Link>
          )}
        </>
      )}
    </nav>
  );
}
