import type { CSSProperties } from "react";
import styles from "./NavTrust.module.scss";

export type NavTrustProps = {
  tabs?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NavTrust({
  tabs = ["홈", "기능", "요금제"],
  duration = 3000,
  easing = "ease-out",
  color = "#2f6df6",
}: NavTrustProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <nav className={styles.navtrust} style={vars}>
      <span className={styles.highlight} aria-hidden="true" />
      {tabs.map((t) => (
        <span key={t} className={styles.tab}>{t}</span>
      ))}
      <span className={styles.underline} aria-hidden="true" />
    </nav>
  );
}
