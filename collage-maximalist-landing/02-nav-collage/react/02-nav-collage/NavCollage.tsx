import type { CSSProperties } from "react";
import styles from "./NavCollage.module.scss";

export type NavCollageItem = { no: string; label: string };
export type NavCollageProps = {
  mark?: string;
  items?: NavCollageItem[];
  /** 탭 한 칸의 고정 폭(px). 이동량이 고정 px 이라 탭도 고정 폭이어야 한다 */
  tab?: number;
  /** 탭 사이 간격(px) */
  gap?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string; "--easing"?: string; "--color"?: string;
  "--tab"?: string; "--step"?: string;
};

const defaultItems: NavCollageItem[] = [
  { no: "01", label: "표지" },
  { no: "02", label: "특집" },
  { no: "03", label: "화보" },
  { no: "04", label: "후기" },
];

export default function NavCollage({
  mark = "COLLAGE",
  items = defaultItems,
  tab = 68,
  gap = 4,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffd93d",
}: NavCollageProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--tab": `${tab}px`,
    "--step": `${tab + gap}px`,
  };

  return (
    <nav className={styles.ncol} style={vars} aria-label={mark}>
      <p className={styles.mark}>{mark}</p>
      <div className={styles.bar}>
        <span className={styles.chip} aria-hidden="true" />
        <ul className={styles.tabs}>
          {items.map((x) => (
            <li key={x.no} className={styles.tab}>
              <span className={styles.no}>{x.no}</span>
              <span className={styles.label}>{x.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className={styles.rule} aria-hidden="true" />
    </nav>
  );
}
