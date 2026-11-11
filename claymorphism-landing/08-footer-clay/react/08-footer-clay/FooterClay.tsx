import type { CSSProperties } from "react";
import styles from "./FooterClay.module.scss";

export type FooterClayCol = { h: string; link: string };

export type FooterClayProps = {
  cols?: FooterClayCol[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DELAYS = ["0s", "-0.6s", "-1.2s"];

export default function FooterClay({
  cols = [
    { h: "제품", link: "기능" },
    { h: "회사", link: "소개" },
    { h: "고객지원", link: "도움말" },
  ],
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: FooterClayProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <footer className={styles.footer} style={vars}>
      {cols.map((col, i) => (
        <div key={col.h} className={styles.col} style={{ animationDelay: DELAYS[i % DELAYS.length] }}>
          <p className={styles.h}>{col.h}</p>
          <p className={styles.link}>{col.link}</p>
        </div>
      ))}
    </footer>
  );
}
