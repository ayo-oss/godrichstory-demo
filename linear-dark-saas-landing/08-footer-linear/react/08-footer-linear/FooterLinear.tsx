import type { CSSProperties } from "react";
import styles from "./FooterLinear.module.scss";

export type FooterLinearProps = {
  columns?: { head: string; link: string }[];
  /** 열 하나가 떠오르는 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_COLUMNS = [
  { head: "제품", link: "기능" },
  { head: "회사", link: "소개" },
  { head: "리소스", link: "문서" },
  { head: "고객지원", link: "문의" },
];

export default function FooterLinear({
  columns = DEFAULT_COLUMNS,
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: FooterLinearProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const delays = columns.map((_, i) => `${-duration * (0.75 - i * 0.25)}ms`);

  return (
    <footer className={styles.footer} style={vars}>
      {columns.map((col, i) => (
        <div key={col.head} className={styles.col} style={{ animationDelay: i === 0 ? "0s" : delays[i] }}>
          <p className={styles.head}>{col.head}</p>
          <p className={styles.link}>{col.link}</p>
        </div>
      ))}
    </footer>
  );
}
