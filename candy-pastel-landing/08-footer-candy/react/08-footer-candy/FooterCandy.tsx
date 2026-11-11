import type { CSSProperties } from "react";
import styles from "./FooterCandy.module.scss";

export type FooterCandyProps = {
  columns?: { head: string; links: string[] }[];
  copy?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const TONE = ["lav", "bub", "min"] as const;

export default function FooterCandy({
  columns = [
    { head: "제품", links: ["기능", "요금제"] },
    { head: "회사", links: ["소개", "문의"] },
    { head: "도움말", links: ["자주 묻는 질문", "가이드"] },
  ],
  copy = "푸딩 · 달콤한 하루",
  duration = 2000,
  easing = "ease-out",
  color = "#ffb9cf",
}: FooterCandyProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <footer className={styles.footercandy} style={vars}>
      <span className={styles.scallop} aria-hidden="true" />
      <div className={styles.cols}>
        {columns.map((c, i) => (
          <div key={c.head} className={`${styles.col} ${styles[TONE[i % 3]]}`}>
            <p className={styles.head}>{c.head}</p>
            {c.links.map((l) => (
              <p key={l} className={styles.link}>{l}</p>
            ))}
          </div>
        ))}
      </div>
      <p className={styles.copy}>
        <span className={styles.spark} aria-hidden="true">✦</span> {copy} <span className={`${styles.spark} ${styles.sparkB}`} aria-hidden="true">✦</span>
      </p>
    </footer>
  );
}
