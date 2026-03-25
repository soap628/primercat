"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "@/navigation";
import { useAuth } from "@/lib/useAuth";
import { useTranslations } from "next-intl";

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations("auth");
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/account");
    } catch {
      setError(t("error_invalid"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "64px auto", padding: "0 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13, margin: "0 auto 14px",
          background: "linear-gradient(135deg, #7f1d1d 0%, #A31F34 50%, #1e3a8a 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 0 1px rgba(163,31,52,0.2), 0 6px 20px rgba(163,31,52,0.25)",
        }}>
          <svg width="26" height="26" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <ellipse cx="11" cy="13.5" rx="7.5" ry="6.8" fill="white" opacity="0.96" />
            <polygon points="4.2,10 6.5,3.5 9.8,8.8" fill="white" opacity="0.96" />
            <polygon points="17.8,10 15.5,3.5 12.2,8.8" fill="white" opacity="0.96" />
            <polygon points="5.4,9.6 7,5.2 9.2,8.8" fill="#fca5a5" opacity="0.65" />
            <polygon points="16.6,9.6 15,5.2 12.8,8.8" fill="#fca5a5" opacity="0.65" />
            <circle cx="8.2" cy="13" r="1.4" fill="#1e3a8a" />
            <circle cx="13.8" cy="13" r="1.4" fill="#1e3a8a" />
            <circle cx="8.7" cy="12.5" r="0.45" fill="white" />
            <circle cx="14.3" cy="12.5" r="0.45" fill="white" />
            <ellipse cx="11" cy="16.2" rx="0.9" ry="0.65" fill="#fca5a5" opacity="0.9" />
          </svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-1)" }}>
          Primer<span style={{ color: "var(--accent)" }}>Cat</span>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-2)" }}>{t("login")}</p>
      </div>

      <div className="card" style={{ padding: "32px 28px", boxShadow: "var(--shadow-md)" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-2)" }}>
              {t("email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-2)" }}>
              {t("password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--red)", background: "var(--red-soft)", padding: "8px 12px", borderRadius: "var(--r-md)", border: "1px solid rgba(185,28,28,0.15)" }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: "11px 0", width: "100%", border: "none", cursor: loading ? "default" : "pointer", marginTop: 4 }}>
            {loading ? "…" : t("login_btn")}
          </button>
        </form>
      </div>

      <p style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>
        <Link href={`/${locale}/register`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
          {t("no_account")}
        </Link>
      </p>
    </div>
  );
}
