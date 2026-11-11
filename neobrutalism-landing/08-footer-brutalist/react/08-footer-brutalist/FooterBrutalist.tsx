import React, { type CSSProperties } from "react";
import styles from "./FooterBrutalist.module.scss";

export type FooterCol = { heading: string; link: string };

export type FooterBrutalistProps = {
  cols?: FooterCol[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--delay"?: string };

export default function FooterBrutalist({
  cols = [
    { heading: "제품", link: "기능" },
    { heading: "회사", link: "소개" },
    { heading: "고객지원", link: "도움말" },
  ],
  duration = 2000,
  easing = "ease-out",
  color = "#0a4fe8",
}: FooterBrutalistProps) {
  const base: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <footer className={styles.footer} style={base}>
      {cols.map((c, i) => (
        <React.Fragment key={c.heading}>
          {i > 0 && (
            <span
              className={styles.rule}
              style={{ ...base, "--delay": i === 1 ? "0s" : "-.6s" } as Vars}
              aria-hidden="true"
            />
          )}
          <div className={styles.col}>
            <p className={styles.heading}>{c.heading}</p>
            <p className={styles.link}>{c.link}</p>
          </div>
        </React.Fragment>
      ))}
    </footer>
  );
}
