import type { CSSProperties } from "react";
import styles from "./NavClay.module.scss";

export type NavClayProps = {
  brand?: string;
  items?: string[];
  cta?: string;
  activeIndex?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NavClay({
  brand = "Claymolt",
  items = ["홈", "기능", "요금제", "문의"],
  cta = "시작하기",
  activeIndex,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: NavClayProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const indicatorStyle: CSSProperties | undefined =
    activeIndex !== undefined
      ? { animation: "none", transform: `translateX(${activeIndex * 100}%)` }
      : undefined;

  return (
    <nav className={styles.nav} style={vars}>
      <span className={styles.brand}>{brand}</span>
      <div className={styles.menu}>
        <span className={styles.indicator} style={indicatorStyle} aria-hidden="true" />
        {items.map((label) => (
          <span key={label} className={styles.item}>{label}</span>
        ))}
      </div>
      <button type="button" className={styles.cta}>{cta}</button>
    </nav>
  );
}
