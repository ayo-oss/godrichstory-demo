import type { CSSProperties } from "react";
import styles from "./FooterNeu.module.scss";

export type FooterNeuCol = { label: string; link: string };
export type FooterNeuProps = {
  cols?: FooterNeuCol[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FooterNeu({
  cols = [
    { label: "제품", link: "기능" },
    { label: "회사", link: "소개" },
    { label: "고객지원", link: "도움말" },
  ],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: FooterNeuProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <footer className={styles.footer} style={vars}>
      {cols.map((c, i) => (
        <div key={c.label} className={styles.col} style={{ animationDelay: `${-i * 0.5}s` }}>
          <p className={styles.label}>{c.label}</p>
          <p className={styles.link}>{c.link}</p>
        </div>
      ))}
    </footer>
  );
}
