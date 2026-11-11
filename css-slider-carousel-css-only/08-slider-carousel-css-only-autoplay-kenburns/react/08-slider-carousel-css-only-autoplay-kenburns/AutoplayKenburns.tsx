import type { CSSProperties } from "react";
import styles from "./AutoplayKenburns.module.scss";

export type AutoplayKenburnsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AutoplayKenburns({ duration = 6000, easing = "ease-out", color = "#ff4d1f" }: AutoplayKenburnsProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.kb} style={vars}>
      {/* 카드가 같은 자리에서 오파시티로 교차되고, 보이는 카드의 배경만 계속 확대된다 — 0줄 JS */}
      <div className={styles.stageBox}>
        {[1, 2, 3].map((n) => (
          <div key={n} className={`${styles.card} ${styles["card" + n]}`}>
            <div className={`${styles.img} ${styles["img" + n]}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
