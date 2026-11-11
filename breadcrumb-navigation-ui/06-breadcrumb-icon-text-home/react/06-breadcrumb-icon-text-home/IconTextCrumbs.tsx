import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./IconTextCrumbs.module.scss";

export type IconTextCrumbsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type ClickEvt = { preventDefault(): void };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const House = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M216 120v96h-64v-64h-48v64H40v-96a8 8 0 0 1 2.34-5.66l80-80a8 8 0 0 1 11.32 0l80 80A8 8 0 0 1 216 120" opacity=".2"/><path d="m219.31 108.68l-80-80a16 16 0 0 0-22.62 0l-80 80A15.87 15.87 0 0 0 32 120v96a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-56h32v56a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-96a15.87 15.87 0 0 0-4.69-11.32M208 208h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48v-88l80-80l80 80Z"/></g></svg>
);
const Folder = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M128 80H32V56a8 8 0 0 1 8-8h52.69a8 8 0 0 1 5.65 2.34Z" opacity=".2"/><path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16M92.69 56l16 16H40V56ZM216 200H40V88h176Z"/></g></svg>
);
const Tag = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M237.66 153L153 237.66a8 8 0 0 1-11.31 0l-99.35-99.32a8 8 0 0 1-2.34-5.65V40h92.69a8 8 0 0 1 5.65 2.34l99.32 99.32a8 8 0 0 1 0 11.34" opacity=".2"/><path d="M243.31 136L144 36.69A15.86 15.86 0 0 0 132.69 32H40a8 8 0 0 0-8 8v92.69A15.86 15.86 0 0 0 36.69 144L136 243.31a16 16 0 0 0 22.63 0l84.68-84.68a16 16 0 0 0 0-22.63m-96 96L48 132.69V48h84.69L232 147.31ZM96 84a12 12 0 1 1-12-12a12 12 0 0 1 12 12"/></g></svg>
);
const CaretRight = () => (
  <span className={styles.sep} aria-hidden="true"><svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true"><g fill="currentColor"><path d="m176 128l-80 80V48Z" opacity=".2"/><path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z"/></g></svg></span>
);

const CRUMBS = [
  { label: "Home", icon: "house" },
  { label: "Electronics", icon: "folder" },
  { label: "Laptops", icon: "folder" },
  { label: "13-inch gaming", icon: "tag" },
];

export default function IconTextCrumbs({
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: IconTextCrumbsProps) {
  const [compact, setCompact] = useState(false);
  const [now, setNow] = useState(CRUMBS.length - 1);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function pick(e: ClickEvt, i: number): void {
    e.preventDefault();
    setNow(i);
  }

  return (
    <nav className={compact ? `${styles.ic} ${styles.isCompact}` : styles.ic} style={vars} aria-label="Breadcrumb">
      <ol className={styles.list}>
        {CRUMBS.map((c: { label: string; icon: string }, i: number) => (
          <li className={styles.item} key={c.label}>
            <a
              className={i === now ? `${styles.crumb} ${styles.now}` : styles.crumb}
              href="#"
              aria-label={i === 0 ? c.label : undefined}
              aria-current={i === now ? "page" : undefined}
              onClick={(e: ClickEvt): void => pick(e, i)}
            >
              {c.icon === "house" && <House />}
              {c.icon === "folder" && <Folder />}
              {c.icon === "tag" && <Tag />}
              {i > 0 && <span className={styles.label}>{c.label}</span>}
            </a>
            {i < CRUMBS.length - 1 && <CaretRight />}
          </li>
        ))}
      </ol>
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={compact}
        onClick={(): void => setCompact(!compact)}
      >
        {compact ? "Icon and label" : "Icons only"}
      </button>
    </nav>
  );
}
