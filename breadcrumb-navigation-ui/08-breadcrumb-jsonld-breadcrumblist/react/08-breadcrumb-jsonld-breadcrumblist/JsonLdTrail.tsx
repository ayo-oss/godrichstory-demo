import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./JsonLdTrail.module.scss";

export type TrailStep = { name: string; seg: string };

export type JsonLdTrailProps = {
  steps?: TrailStep[];
  title?: string;
  origin?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

// 도구/demo.py 의 ambient.d.ts 는 React 이벤트 제네릭을 안 준다 — 로컬 타입으로 TS7006 을 막는다
type ClickEvt = { preventDefault(): void };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconGlass = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2"/><path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72"/></g></svg>
);
const IconCaretRight = () => (
  <svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true"><g fill="currentColor"><path d="m176 128l-80 80V48Z" opacity=".2"/><path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z"/></g></svg>
);
const IconCode = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="m240 128l-48 40H64l-48-40l48-40h128Z" opacity=".2"/><path d="M69.12 94.15L28.5 128l40.62 33.85a8 8 0 1 1-10.24 12.29l-48-40a8 8 0 0 1 0-12.29l48-40a8 8 0 0 1 10.24 12.3m176 27.7l-48-40a8 8 0 1 0-10.24 12.3L227.5 128l-40.62 33.85a8 8 0 1 0 10.24 12.29l48-40a8 8 0 0 0 0-12.29m-82.39-89.37a8 8 0 0 0-10.25 4.79l-64 176a8 8 0 0 0 4.79 10.26A8.1 8.1 0 0 0 96 224a8 8 0 0 0 7.52-5.27l64-176a8 8 0 0 0-4.79-10.25"/></g></svg>
);

const DEFAULT_STEPS: TrailStep[] = [
  { name: "godrichstory.com", seg: "" },
  { name: "Electronics", seg: "electronics" },
  { name: "Laptops", seg: "electronics/laptops" },
];

export default function JsonLdTrail({
  steps = DEFAULT_STEPS,
  title = "13-inch gaming laptop",
  origin = "https://godrichstory.com/",
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffd23f",
}: JsonLdTrailProps) {
  const [shown, setShown] = useState(steps.length);
  const [live, setLive] = useState(false);   // 사람이 만지면 자동 루프를 뗀다
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const visible = steps.slice(0, shown);
  const itemListElement = visible.map((s: TrailStep, i: number) => ({
    "@type": "ListItem",
    position: i + 1,
    name: s.name,
    item: origin + s.seg,
  }));
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
  const lines = ['"itemListElement": ['].concat(
    itemListElement.map((o, i) =>
      ` { "position": ${o.position}, "name": "${o.name}" }` + (i < itemListElement.length - 1 ? "," : " ]")
    )
  );

  return (
    <div className={`${styles.jl} ${live ? "" : styles.demo}`} style={vars}>
      <div className={styles.serp}>
        <div className={styles.url}>
          <span className={styles.glass} aria-hidden="true"><IconGlass /></span>
          <nav className={styles.nav} aria-label="Breadcrumb">
            <ol className={styles.trail}>
              {visible.map((s: TrailStep, i: number) => (
                <li key={s.name} className={styles.li}>
                  {i > 0 && <span className={styles.sep} aria-hidden="true"><IconCaretRight /></span>}
                  <a
                    className={styles.crumb}
                    href={origin + s.seg}
                    aria-current={i === visible.length - 1 ? "page" : undefined}
                    onClick={(e: ClickEvt): void => { e.preventDefault(); setLive(true); setShown(i + 1); }}
                  >
                    {s.name}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
        <p className={styles.title}>{title}</p>
      </div>

      <div className={styles.panel}>
        <p className={styles.head}><IconCode />application/ld+json</p>
        <div className={styles.codewrap}>
          <span className={styles.bar} aria-hidden="true" />
          <pre className={styles.code}>
            {lines.map((l: string) => <span key={l} className={styles.ln}>{l}</span>)}
          </pre>
        </div>
      </div>

      <button type="button" className={styles.btn} onClick={(): void => { setLive(true); setShown(steps.length); }}>
        Build JSON-LD
      </button>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonld) }} />
    </div>
  );
}
