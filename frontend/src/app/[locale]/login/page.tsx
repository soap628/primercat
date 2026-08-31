"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "@/navigation";
import { useAuth } from "@/lib/useAuth";
import { useTranslations } from "next-intl";
import AuthShell from "../AuthShell";

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
    <AuthShell
      locale={locale}
      mode="login"
      footer={(
        <Link href={`/${locale}/register`}>
          {t("no_account")} <span aria-hidden="true">→</span>
        </Link>
      )}
    >
        <form className="auth-form-v8" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email" style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-2)" }}>
              {t("email")}
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-2)" }}>
              {t("password")}
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
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
    </AuthShell>
  );
}
