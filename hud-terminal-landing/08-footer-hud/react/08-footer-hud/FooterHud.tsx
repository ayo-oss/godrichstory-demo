import type { CSSProperties } from "react";
import styles from "./FooterHud.module.scss";

export type FooterHudColumn = { head: string; links: string[] };

export type FooterHudProps = {
  columns?: FooterHudColumn[];
  copy?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const defaultColumns: FooterHudColumn[] = [
  { head: "SYSTEM", links: ["대시보드", "알림 설정"] },
  { head: "SUPPORT", links: ["문의하기", "이용 가이드"] },
  { head: "LEGAL", links: ["이용약관", "개인정보처리방침"] },
];

export default function FooterHud({
  columns = defaultColumns,
  copy = "SENTRY © 2026",
  duration = 2000,
  easing = "ease-out",
  color = "#ffd23f",
}: FooterHudProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <footer className={styles.footer} style={vars}>
      <span className={`${styles.corner} ${styles.cornerTl}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerTr}`} aria-hidden="true" />
      <div className={styles.noise} aria-hidden="true" />
      <div className={styles.cols}>
        {columns.map((col) => (
          <div key={col.head} className={styles.col}>
            <p className={styles.head}>{col.head}</p>
            <ul>
              {col.links.map((link) => <li key={link}>{link}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className={styles.copy}>{copy}</p>
    </footer>
  );
}
