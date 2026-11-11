import type { CSSProperties } from "react";
import styles from "./KineticFooter.module.scss";

export type KineticFooterProps = {
  link1?: string;
  link2?: string;
  wordmark?: string;
  /** 빛 띠가 한 번 훑고 돌아오는 시간(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function KineticFooter({
  link1 = "Terms",
  link2 = "Privacy",
  wordmark = "KINETIC",
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: KineticFooterProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <footer className={styles.stage} style={vars}>
      <nav className={styles.links}>
        <span className={styles.link}>{link1}</span>
        <span className={styles.link}>{link2}</span>
      </nav>
      <p className={styles.wordmark}>{wordmark}</p>
    </footer>
  );
}
