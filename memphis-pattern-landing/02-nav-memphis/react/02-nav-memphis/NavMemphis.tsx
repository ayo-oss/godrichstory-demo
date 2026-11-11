import type { CSSProperties } from "react";
import styles from "./NavMemphis.module.scss";

export type NavMemphisProps = {
  /** 탭 이름 3개 */
  tabs?: string[];
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 데모 무대 색(참고용 — 칸마다 색은 고정) */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NavMemphis({
  tabs = ["홈", "재료", "요금"],
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ffcf33",
}: NavMemphisProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  /* 배지 모양은 칸 순서대로 고정 — 반원 · 원 · 삼각 */
  const badges = [styles.badgeHalf, styles.badgeCircle, styles.badgeTri];

  return (
    <nav className={styles.navm} style={vars} aria-label="데모 내비게이션">
      {tabs.map((t, i) => (
        <a key={t} className={styles.tab} href="#">
          <span className={`${styles.badge} ${badges[i % badges.length]}`} aria-hidden="true" />
          <span className={styles.label}>{t}</span>
        </a>
      ))}
    </nav>
  );
}
