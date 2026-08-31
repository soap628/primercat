import { Link } from "@/navigation";
import type { CSSProperties } from "react";

export type ToolApp = {
  id: string;
  title: string;
  icon: "molecule" | "flask" | "fund" | "safety" | "protocol";
  tone: string;
  href: string;
};

type ToolsAppLauncherProps = {
  title: string;
  apps: ToolApp[];
};

function AppGlyph({ icon }: { icon: ToolApp["icon"] }) {
  if (icon === "molecule") {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path d="M18 36 29 17m6 1 12 17M22 41h20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <circle cx="16" cy="41" r="8" fill="currentColor" />
        <circle cx="32" cy="13" r="8" fill="currentColor" />
        <circle cx="48" cy="41" r="8" fill="currentColor" />
      </svg>
    );
  }
  if (icon === "flask") {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path d="M25 10h14M28 11v15L16 47a5 5 0 0 0 4 7h24a5 5 0 0 0 4-7L36 26V11" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 43c7-4 14 4 22 0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <circle cx="30" cy="37" r="2.5" fill="currentColor" />
      </svg>
    );
  }
  if (icon === "fund") {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path d="M15 47V35m11 12V27m11 20V20m11 27V13" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="m13 22 12-7 11 2 13-8" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon === "safety") return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M32 8 53 17v13c0 13-8.6 22.5-21 27-12.4-4.5-21-14-21-27V17L32 8Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M32 20v17" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="46" r="3" fill="currentColor" />
    </svg>
  );
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M18 9h22l8 8v38H18V9Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M40 9v10h9M25 29l3 3 6-7M38 29h5M25 43l3 3 6-7M38 43h5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ToolsAppLauncher({ title, apps }: ToolsAppLauncherProps) {
  return (
    <div className="tools-simple-page">
      <header className="tools-simple-head">
        <div>
          <span>PRIMERCAT · LAB UTILITIES</span>
          <h1>{title}</h1>
        </div>
      </header>

      <div className="tools-simple-grid">
        {apps.map((app) => (
          <Link
            key={app.id}
            href={app.href}
            className="tools-simple-app"
            style={{ "--app-tone": app.tone } as CSSProperties}
          >
            <div className="tools-simple-icon">
              <AppGlyph icon={app.icon} />
              <i aria-hidden="true" />
            </div>
            <h2>{app.title}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
