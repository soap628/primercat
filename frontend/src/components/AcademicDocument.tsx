import type { ReactNode } from "react";

export type AcademicReference = {
  id: number;
  authors: string;
  year: string;
  title: string;
  journal: string;
  detail: string;
  href: string;
  doi?: string;
};

export function Cite({ ids }: { ids: number[] }) {
  return (
    <sup className="academic-cite" aria-label={`References ${ids.join(", ")}`}>
      {ids.map((id, index) => (
        <span key={id}>
          {index > 0 ? "," : ""}
          <a href={`#ref-${id}`}>{id}</a>
        </span>
      ))}
    </sup>
  );
}

export function AcademicHeader({
  eyebrow,
  title,
  abstractLabel,
  abstract,
  meta,
  asideTitle,
  aside,
}: {
  eyebrow: string;
  title: string;
  abstractLabel: string;
  abstract: ReactNode;
  meta: string[];
  asideTitle: string;
  aside: ReactNode;
}) {
  return (
    <header className="academic-hero">
      <div className="academic-hero-main">
        <p className="academic-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <div className="academic-abstract">
          <span>{abstractLabel}</span>
          <p>{abstract}</p>
        </div>
        <div className="academic-meta" aria-label="Document metadata">
          {meta.map((item) => <span key={item}>{item}</span>)}
        </div>
        <aside className="academic-hero-note">
          <span>{asideTitle}</span>
          <p>{aside}</p>
        </aside>
      </div>
    </header>
  );
}

export function AcademicSection({
  number,
  id,
  title,
  lead,
  children,
}: {
  number: string;
  id: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="academic-section" id={id}>
      <div className="academic-section-heading">
        <span>{number}</span>
        <div>
          <h2>{title}</h2>
          {lead ? <p>{lead}</p> : null}
        </div>
      </div>
      <div className="academic-section-body">{children}</div>
    </section>
  );
}

export function ReferenceList({
  title,
  intro,
  references,
}: {
  title: string;
  intro: string;
  references: AcademicReference[];
}) {
  return (
    <section className="academic-references" id="references">
      <div className="academic-section-heading">
        <span>REF</span>
        <div>
          <h2>{title}</h2>
          <p>{intro}</p>
        </div>
      </div>
      <ol>
        {references.map((reference) => (
          <li key={reference.id} id={`ref-${reference.id}`}>
            <span className="academic-reference-number">[{reference.id}]</span>
            <p>
              {reference.authors} ({reference.year}). “{reference.title}” <em>{reference.journal}</em>. {reference.detail}
              {" "}
              <a href={reference.href} target="_blank" rel="noreferrer">
                {reference.doi ? `doi:${reference.doi}` : "Source"} ↗
              </a>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
