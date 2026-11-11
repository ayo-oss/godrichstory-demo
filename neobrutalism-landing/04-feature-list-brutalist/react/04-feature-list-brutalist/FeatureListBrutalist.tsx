import type { CSSProperties } from "react";
import styles from "./FeatureListBrutalist.module.scss";

export type FeatureItem = { number: string; label: string };

export type FeatureListBrutalistProps = {
  items?: FeatureItem[];
  duration?: number;
  easing?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--rest-rotate"?: string;
  "--delay"?: string;
};

const BADGES = [
  { bg: "#0a4fe8", fg: "#fff7e6", rotate: "-6deg", delay: "0s" },
  { bg: "#ffd23f", fg: "#17141a", rotate: "5deg", delay: "-.7s" },
  { bg: "#ff4d1f", fg: "#17141a", rotate: "-4deg", delay: "-1.4s" },
];

export default function FeatureListBrutalist({
  items = [
    { number: "01", label: "빠른 시작" },
    { number: "02", label: "자동 백업" },
    { number: "03", label: "실시간 공유" },
  ],
  duration = 2000,
  easing = "ease-out",
}: FeatureListBrutalistProps) {
  return (
    <ul className={styles.list}>
      {items.map((it, i) => {
        const b = BADGES[i % BADGES.length];
        const vars: Vars = {
          "--duration": `${duration}ms`,
          "--easing": easing,
          "--rest-rotate": b.rotate,
          "--delay": b.delay,
          background: b.bg,
          color: b.fg,
        };
        return (
          <li key={it.number} className={styles.item}>
            <span className={styles.badge} style={vars} aria-hidden="true">{it.number}</span>
            <span className={styles.label}>{it.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
