import type { CSSProperties } from "react";
import styles from "./NavLinear.module.scss";

export type NavLinearProps = {
  brand?: string;
  items?: [string, string, string];
  cta?: string;
  /** 필이 두 항목 사이를 오가는 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NavLinear({
  brand = "Vantage",
  items = ["홈", "기능", "요금제"],
  cta = "시작",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#0a4fe8",
}: NavLinearProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <nav className={styles.navbar} style={vars}>
      <span className={styles.brand}>{brand}</span>
      <div className={styles.items}>
        <span className={styles.pill} aria-hidden="true" />
        {items.map((label) => (
          <span key={label} className={styles.item}>{label}</span>
        ))}
      </div>
      <button type="button" className={styles.cta}>{cta}</button>
    </nav>
  );
}
