import type { CSSProperties } from "react";
import styles from "./HeaderProgressBar.module.scss";

export type HeaderProgressBarProps = {
  logo: string;
  /** 바 두께 (기본 3px) */
  thickness?: number;
  color?: string;
  track?: string;
};

type Vars = CSSProperties & { "--thickness"?: string; "--color"?: string; "--track"?: string };

export default function HeaderProgressBar({
  logo,
  thickness = 3,
  color = "#2f6df6",
  track = "rgba(255,255,255,.14)",
}: HeaderProgressBarProps) {
  const vars: Vars = { "--thickness": `${thickness}px`, "--color": color, "--track": track };

  return (
    <header className={styles.head} style={vars}>
      <span className={styles.logo}>{logo}</span>
      {/* scroll() 타임라인만으로 채워진다 — JS 없이 */}
      <span className={styles.bar} aria-hidden="true" />
    </header>
  );
}
