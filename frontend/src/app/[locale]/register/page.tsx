"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "@/navigation";
import { useAuth } from "@/lib/useAuth";
import { useTranslations } from "next-intl";
import AuthShell from "../AuthShell";

export default function RegisterPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations("auth");
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, displayName || undefined);
      router.push("/account");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already registered") || msg.includes("already")) {
        setError(t("error_email_exists"));
      } else {
        setError(msg || t("error_invalid"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      locale={locale}
      mode="register"
      footer={(
        <Link href={`/${locale}/login`}>
          {t("have_account")} <span aria-hidden="true">→</span>
        </Link>
      )}
    >
        <form className="auth-form-v8" onSubmit={handleSubmit}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-2)" }}>
              {t("email")}
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" placeholder="you@example.com" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-2)" }}>
              {t("password")}
            </label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input" placeholder="••••••••" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-2)" }}>
              {t("display_name")}
            </label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" placeholder={locale === "zh" ? "如：张三" : "e.g. Jane"} />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--red)", background: "var(--red-soft)", padding: "8px 12px", borderRadius: "var(--r-md)", border: "1px solid rgba(185,28,28,0.15)" }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: "11px 0", width: "100%", border: "none", cursor: loading ? "default" : "pointer", marginTop: 4 }}>
            {loading ? "…" : t("register_btn")}
          </button>
        </form>
    </AuthShell>
  );
}
