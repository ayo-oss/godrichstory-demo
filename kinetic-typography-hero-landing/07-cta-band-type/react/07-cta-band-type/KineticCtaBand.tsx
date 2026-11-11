import type { CSSProperties } from "react";
import styles from "./KineticCtaBand.module.scss";

export type KineticCtaBandProps = {
  phrase?: string;
  /** 한 바퀴 도는 시간(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function KineticCtaBand({
  phrase = "Get started now —",
  duration = 2000,
  easing = "linear",
  color = "#fff7e6",
}: KineticCtaBandProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  // 6개를 그대로 한 번 더 복제해 트랙 하나에 12개 — margin-right 간격, gap 은 쓰지 않는다 (이음새 점프 방지)
  const items = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className={styles.stage} style={vars}>
      <div className={styles.band}>
        <div className={styles.track}>
          {items.map((i) => (
            <span key={i} className={styles.item} aria-hidden={i >= 6 ? true : undefined}>{phrase}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
