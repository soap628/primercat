"use client";

import { useId } from "react";
import styles from "./PrimerCatMascot.module.css";

type MascotProps = {
  locale: string;
  onActivate: () => void;
  expanded: boolean;
};

/** Vector artwork stays crisp on small screens and requires no animation runtime. */
export default function PrimerCatMascot({ locale, onActivate, expanded }: MascotProps) {
  const id = useId().replace(/:/g, "");
  const paint = (name: string) => `url(#${id}-${name})`;

  return (
    <button
      type="button"
      className={`home-mascot-trigger ${styles.trigger}`}
      onClick={onActivate}
      aria-label={locale === "zh" ? "点击 PrimerCat 猫咪" : "Click the PrimerCat mascot"}
      aria-haspopup="dialog"
      aria-expanded={expanded}
    >
      <svg className={styles.art} viewBox="0 0 240 224" fill="none" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={`${id}-coat`} cx=".32" cy=".22" r=".88">
            <stop stopColor="var(--cat-coat-light)" />
            <stop offset=".52" stopColor="var(--cat-coat)" />
            <stop offset="1" stopColor="var(--cat-coat-shade)" />
          </radialGradient>
          <radialGradient id={`${id}-body`} cx=".3" cy=".15" r=".92">
            <stop stopColor="var(--cat-coat)" />
            <stop offset="1" stopColor="var(--cat-coat-shade)" />
          </radialGradient>
          <linearGradient id={`${id}-cream`} x1="0" y1="0" x2=".6" y2="1">
            <stop stopColor="#fff8ed" />
            <stop offset="1" stopColor="#e9d5d2" />
          </linearGradient>
          <linearGradient id={`${id}-ear`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#dbadbb" />
            <stop offset="1" stopColor="#a96787" />
          </linearGradient>
          <radialGradient id={`${id}-eye`} cx=".35" cy=".25" r=".85">
            <stop stopColor="#f4deaa" />
            <stop offset=".65" stopColor="#cfa76a" />
            <stop offset="1" stopColor="#9b704a" />
          </radialGradient>
          <linearGradient id={`${id}-tail`} x1="165" y1="183" x2="221" y2="140" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--cat-coat-shade)" />
            <stop offset="1" stopColor="var(--cat-coat-light)" />
          </linearGradient>
          <linearGradient id={`${id}-tag`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fff0c3" />
            <stop offset="1" stopColor="#c99554" />
          </linearGradient>
          <radialGradient id={`${id}-shadow`}>
            <stop stopColor="var(--cat-shadow)" stopOpacity=".24" />
            <stop offset="1" stopColor="var(--cat-shadow)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="125" cy="209" rx="82" ry="11" fill={paint("shadow")} />
        <g className={styles.character}>
          <g className={styles.tail}>
            <path d="M162 183c26 22 54 9 53-14-.5-11-7-19-17-18" stroke="var(--cat-outline)" strokeWidth="19" strokeLinecap="round" />
            <path d="M162 183c26 22 54 9 53-14-.5-11-7-19-17-18" stroke={paint("tail")} strokeWidth="17" strokeLinecap="round" />
            <path d="M214 164c-2-8-8-14-16-13" stroke={paint("cream")} strokeWidth="16" strokeLinecap="round" />
          </g>

          <g className={styles.body}>
            <path className={styles.outline} d="M83 107c-13 14-24 41-24 62 0 24 17 38 49 38h37c26 0 39-10 35-28-2-13-11-24-24-29-2-19-8-32-18-43Z" fill={paint("body")} />
            <path d="M92 116c-10 20-11 50-7 71 8 8 28 10 40 2 4-20 7-43 16-69-15 7-33 6-49-4Z" fill={paint("cream")} />
            <path d="M151 153c19 7 26 22 23 34-3 10-14 15-30 15h-12c14-11 18-29 19-49Z" fill="var(--cat-coat-shade)" opacity=".48" />
            <path d="M70 150c-6 14-6 24-3 32" className={styles.rimLight} />
            <path className={styles.outline} d="M86 147c-3 15-3 32-3 42-7 1-12 5-12 10 0 7 9 9 20 9 12 0 16-4 16-11l-1-43" fill={paint("body")} />
            <path className={styles.outline} d="M121 151c-1 16-2 28-1 39-7 1-11 5-11 10 0 6 9 9 20 9 12 0 17-3 17-10l-1-54" fill={paint("body")} />
            <path d="M83 186c7 3 15 3 23 1l1 10c0 7-4 11-16 11-11 0-20-2-20-9 0-5 5-9 12-10Z" fill={paint("cream")} />
            <path d="M120 187c8 3 17 3 26 0v12c0 7-5 10-17 10-11 0-20-3-20-9 0-5 4-9 11-10Z" fill={paint("cream")} />
            <path d="M84 200v4m8-4v5m31-4v4m8-4v5" className={styles.toes} />
            <path d="M92 144c-2 12-3 27-2 35m37-32-1 31" className={styles.rimLight} />
          </g>

          <g className={styles.head}>
            <g className={styles.leftEar}>
              <path className={styles.outline} d="M63 64c-6-15-9-32-6-47 1-5 4-6 8-3 13 6 25 18 31 30Z" fill={paint("coat")} />
              <path d="M65 25c-1 9 1 20 4 28l16-11c-5-6-12-13-20-17Z" fill={paint("ear")} />
              <path d="m64 21 2 17" className={styles.rimLight} />
            </g>
            <g className={styles.rightEar}>
              <path className={styles.outline} d="M135 42c10-13 22-24 35-28 4-2 6 0 6 4 2 15-2 33-8 47Z" fill={paint("coat")} />
              <path d="M168 26c-8 4-15 10-21 17l15 10c4-9 6-17 6-27Z" fill={paint("ear")} />
            </g>
            <path className={styles.outline} d="M116 33c-30 0-52 10-61 32-4 10-6 19-4 29-2 4-5 7-9 9l12 2-5 7 14-2c11 16 28 25 53 25s43-9 54-25l14 2-5-7 11-2c-5-3-8-6-10-10 2-10 0-20-5-29-10-21-30-31-59-31Z" fill={paint("coat")} />
            <path d="M66 61c9-15 26-23 44-23" className={styles.faceLight} />
            <path d="M75 87c13 0 21 9 29 14 7 4 17 4 24 0 9-6 17-14 28-14 9 0 15 6 17 13-8 20-28 31-57 31-27 0-47-11-56-29 1-9 7-15 15-15Z" fill={paint("cream")} />
            <path d="m107 40 3 10m8-12-1 13m11-10-4 10" className={styles.markings} />

            <g className={styles.eyes}>
              <ellipse cx="85" cy="80" rx="13.5" ry="15" fill="var(--cat-ink)" />
              <ellipse cx="147" cy="80" rx="13.5" ry="15" fill="var(--cat-ink)" />
              <ellipse cx="85" cy="81" rx="11.2" ry="12.2" fill={paint("eye")} />
              <ellipse cx="147" cy="81" rx="11.2" ry="12.2" fill={paint("eye")} />
              <g className={styles.pupils}>
                <ellipse cx="87" cy="80" rx="5.8" ry="10.5" fill="var(--cat-ink)" />
                <ellipse cx="145" cy="80" rx="5.8" ry="10.5" fill="var(--cat-ink)" />
                <circle cx="83" cy="75" r="3.4" fill="#fffdf5" />
                <circle cx="141" cy="75" r="3.4" fill="#fffdf5" />
                <circle cx="91" cy="85" r="1.3" fill="#fffdf5" opacity=".7" />
                <circle cx="149" cy="85" r="1.3" fill="#fffdf5" opacity=".7" />
              </g>
            </g>
            <path d="M76 61c5-3 11-3 15-1m49 0c5-2 11-2 15 1" className={styles.brows} />
            <ellipse cx="77" cy="100" rx="8" ry="3.5" fill="#cc8193" opacity=".16" />
            <ellipse cx="155" cy="100" rx="8" ry="3.5" fill="#cc8193" opacity=".16" />
            <path d="M110 102c2-2 10-2 12 0 1 2-4 6-6 6s-7-4-6-6Z" fill="#976276" />
            <path d="M113 102h5" stroke="#efc5c6" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M116 108v4m0 0c-4 5-8 5-11 2m11-2c4 5 8 5 11 2" className={styles.mouth} />
            <g className={styles.whiskers}>
              <path d="m74 101-27-3m26 9-30 3m115-9 27-3m-26 9 30 3" />
            </g>

            <g className={styles.collar}>
              <path d="M86 128c17 7 42 7 59-1" stroke="#426b70" strokeWidth="5" strokeLinecap="round" />
              <path d="M89 127c16 5 37 5 52-1" stroke="#9bb7b4" strokeWidth="1.3" strokeLinecap="round" />
              <circle cx="116" cy="137" r="8" fill={paint("tag")} stroke="#a17c58" strokeWidth=".9" />
              <path d="M113 132c0 5 6 5 6 10m0-10c0 5-6 5-6 10m.5-8h5m-5 6h5" stroke="#6f5254" strokeWidth="1.1" strokeLinecap="round" />
            </g>
          </g>
        </g>
      </svg>
    </button>
  );
}
