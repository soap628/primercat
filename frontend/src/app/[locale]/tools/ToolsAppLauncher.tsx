import { Link } from "@/navigation";
import type { CSSProperties } from "react";

export type ToolApp = {
  id: string;
  title: string;
  body: string;
  code: string;
  tone: string;
  href: string;
};

type ToolsAppLauncherProps = {
  title: string;
  apps: ToolApp[];
};

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
            <div className="tools-simple-app-top">
              <span>{app.code}</span>
              <i aria-hidden="true">↗</i>
            </div>
            <div>
              <h2>{app.title}</h2>
              <p>{app.body}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
