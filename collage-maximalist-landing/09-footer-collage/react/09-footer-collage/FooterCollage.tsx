import type { CSSProperties, ReactNode } from "react";
import styles from "./FooterCollage.module.scss";

export type FooterCollageProps = {
  word?: string;
  brand?: string;
  columns?: string[][];
  /** 조각끼리 어긋나는 간격(ms) */
  stagger?: number;
  planeIcon?: ReactNode;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ChipVars = CSSProperties & { "--rot"?: string; background?: string; animationDelay?: string };

const defaultColumns: string[][] = [
  ["부품", "원페이지"],
  ["토큰", "프롬프트"],
  ["zip", "문의"],
];
const pieces = [
  { bg: "#d93a1e", rot: "-8deg" },
  { bg: "#ffd93d", rot: "6deg" },
  { bg: "#b6e34f", rot: "-4deg" },
  { bg: "#2d6fb5", rot: "9deg" },
];

export default function FooterCollage({
  word = "COLLAGE",
  brand = "오려 붙이는 랜딩 키트",
  columns = defaultColumns,
  stagger = 500,
  planeIcon,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#d93a1e",
}: FooterCollageProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <footer className={styles.fcol} style={vars}>
      <span className={styles.word} aria-hidden="true">{word}</span>
      <p className={styles.brand}>{brand}</p>
      <span className={styles.rule} aria-hidden="true" />
      <div className={styles.cols}>
        {columns.map((col, i) => (
          <ul key={i} className={styles.list}>
            {col.map((x) => <li key={x}>{x}</li>)}
          </ul>
        ))}
      </div>
      <div className={styles.chips} aria-hidden="true">
        {pieces.map((c, i) => {
          const cv: ChipVars = { "--rot": c.rot, background: c.bg, animationDelay: `${-stagger * i}ms` };
          return (
            <span key={c.bg} className={styles.chip} style={cv}>
              {i === pieces.length - 1 ? planeIcon : null}
            </span>
          );
        })}
      </div>
    </footer>
  );
}
