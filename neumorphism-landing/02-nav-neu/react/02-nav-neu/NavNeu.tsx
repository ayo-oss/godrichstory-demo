import type { CSSProperties } from "react";
import styles from "./NavNeu.module.scss";

export type NavNeuProps = {
  brand?: string;
  items?: string[];
  cta?: string;
  /** 인디케이터가 항목 전부를 한 바퀴 도는 시간(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NavNeu({
  brand = "Neumo",
  items = ["홈", "기능", "요금제", "문의"],
  cta = "시작하기",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: NavNeuProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <nav className={styles.nav} style={vars}>
      <span className={styles.brand}>{brand}</span>
      <div className={styles.track}>
        <span className={styles.indicator} aria-hidden="true" style={{ width: `calc((100% - 8px) / ${items.length})` }} />
        {items.map((label) => (
          <span key={label} className={styles.item}>{label}</span>
        ))}
      </div>
      <button type="button" className={styles.cta}>{cta}</button>
    </nav>
  );
}
