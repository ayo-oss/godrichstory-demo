import type { CSSProperties } from "react";
import styles from "./Carousel3D.module.scss";

export type Carousel3DProps = {
  /** 링이 한 바퀴 도는 시간 (기본 8000ms). 카드가 늘면 느리게 */
  duration?: number;
  easing?: string;
  /** 카드 배경 */
  color?: string;
  cards?: string[];
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--i"?: number };

export default function Carousel3D({
  duration = 8000,
  easing = "linear",
  color = "#fff7e6",
  cards = ["신상품", "베스트", "할인", "리뷰", "추천"],
}: Carousel3DProps) {
  const step = 360 / cards.length;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.scene}>
      <ul className={styles.ring} style={vars}>
        {cards.map((c, i) => (
          <li key={c} className={styles.card} style={{ transform: `rotateY(${i * step}deg) translateZ(118px)` }}>
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}
