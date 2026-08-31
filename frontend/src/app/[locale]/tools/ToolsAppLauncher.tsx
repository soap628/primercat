"use client";

import { Link } from "@/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

export type ToolCategory = "design" | "lab" | "knowledge";

export type ToolApp = {
  id: string;
  category: ToolCategory;
  eyebrow: string;
  title: string;
  body: string;
  code: string;
  tone: string;
  system: string;
  status: string;
  featured?: boolean;
  actions: Array<{ href: string; label: string }>;
};

type ToolsAppLauncherProps = {
  locale: string;
  title: string;
  intro: string;
  note: string;
  apps: ToolApp[];
};

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

export default function ToolsAppLauncher({ locale, title, intro, note, apps }: ToolsAppLauncherProps) {
  const isZh = locale === "zh";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ToolCategory>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  const categories: Array<{ id: "all" | ToolCategory; label: string; short: string }> = [
    { id: "all", label: isZh ? "全部应用" : "All apps", short: isZh ? "全部" : "All" },
    { id: "design", label: isZh ? "序列设计" : "Sequence design", short: isZh ? "设计" : "Design" },
    { id: "lab", label: isZh ? "实验工作台" : "Lab bench", short: isZh ? "实验" : "Lab" },
    { id: "knowledge", label: isZh ? "方法与可信度" : "Methods & trust", short: isZh ? "知识" : "Trust" },
  ];

  const visibleApps = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return apps.filter((app) => {
      const inCategory = category === "all" || app.category === category;
      const searchable = [app.title, app.body, app.eyebrow, app.system, app.code].join(" ").toLocaleLowerCase();
      return inCategory && (!normalized || searchable.includes(normalized));
    });
  }, [apps, category, query]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (!typing && event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  const countFor = (id: "all" | ToolCategory) => id === "all" ? apps.length : apps.filter((app) => app.category === id).length;

  return (
    <div className="tools-launcher-v5">
      <section className="tools-launcher-head">
        <div className="tools-launcher-heading">
          <span className="tools-launcher-kicker">PRIMERCAT · APP LIBRARY</span>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>

        <div className="tools-launcher-command">
          <label htmlFor="tool-launcher-search">{isZh ? "快速查找" : "Quick find"}</label>
          <div className="tools-launcher-search-wrap">
            <SearchIcon />
            <input
              ref={searchRef}
              id="tool-launcher-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isZh ? "搜索工具、任务或数据源…" : "Search tools, tasks, or data sources…"}
              autoComplete="off"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label={isZh ? "清空搜索" : "Clear search"}>×</button>
            ) : (
              <kbd>⌘ K</kbd>
            )}
          </div>
          <p>{note}</p>
        </div>
      </section>

      <section className="tools-launcher-workspace">
        <aside className="tools-launcher-sidebar" aria-label={isZh ? "应用分类" : "App categories"}>
          <div className="tools-launcher-sidebar-head">
            <span>{isZh ? "应用空间" : "Spaces"}</span>
            <strong>{String(apps.length).padStart(2, "0")}</strong>
          </div>
          <div className="tools-launcher-categories">
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                className={category === item.id ? "is-active" : ""}
                onClick={() => setCategory(item.id)}
                aria-pressed={category === item.id}
              >
                <span>{item.label}</span>
                <b>{String(countFor(item.id)).padStart(2, "0")}</b>
              </button>
            ))}
          </div>
          <div className="tools-launcher-sidebar-note">
            <i />
            <span>{isZh ? "所有入口均可实际使用" : "Every listed app is live"}</span>
          </div>
        </aside>

        <div className="tools-launcher-main">
          <header className="tools-launcher-results-head">
            <div>
              <span>{categories.find((item) => item.id === category)?.short}</span>
              <strong>{isZh ? `${visibleApps.length} 个应用` : `${visibleApps.length} apps`}</strong>
            </div>
            <p>{isZh ? "选择一个应用开始工作" : "Choose an app to begin"}</p>
          </header>

          {visibleApps.length > 0 ? (
            <div className="tools-launcher-grid">
              {visibleApps.map((app) => (
                <article
                  key={app.id}
                  className={`tools-launcher-app${app.featured ? " is-featured" : ""}`}
                  style={{ "--app-tone": app.tone } as CSSProperties}
                >
                  <div className="tools-launcher-app-top">
                    <div className="tools-launcher-app-icon" aria-hidden="true"><span>{app.code}</span><i /></div>
                    <span className="tools-launcher-status"><i />{app.status}</span>
                  </div>
                  <div className="tools-launcher-app-copy">
                    <span>{app.eyebrow}</span>
                    <h2>{app.title}</h2>
                    <p>{app.body}</p>
                  </div>
                  <div className="tools-launcher-app-system">{app.system}</div>
                  <div className="tools-launcher-app-actions">
                    {app.actions.map((action, index) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        className={index === 0 ? "is-primary" : ""}
                      >
                        {action.label}<span aria-hidden="true">{index === 0 ? "→" : "↗"}</span>
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="tools-launcher-empty">
              <span>00</span>
              <h2>{isZh ? "没有找到匹配的应用" : "No matching apps"}</h2>
              <p>{isZh ? "换一个关键词，或返回全部应用。" : "Try another keyword or return to all apps."}</p>
              <button type="button" onClick={() => { setQuery(""); setCategory("all"); }}>
                {isZh ? "查看全部应用" : "Show all apps"}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
