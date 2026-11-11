import type { CSSProperties } from "react";
import { useState } from "react";
import styles from "./ProductImageSwap.module.scss";

export type ProductImageSwapProps = {
  /** 장면 이름 순서 — 썸네일 라벨과 같다 */
  scenes: string[];
  /** 장면 배경색 순서 (장면 수와 같게) */
  colors?: string[];
  /** 이미지가 자리를 바꾸는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

export default function ProductImageSwap({
  scenes,
  colors = ["#2f6df6", "#ff4d1f", "#17141a"],
  duration = 300,
  easing = "ease-out",
}: ProductImageSwapProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  return (
    <section className={styles.gal} style={vars} aria-label="상품 이미지 갤러리">
      <div className={styles.frame}>
        {scenes.map((name, i) => (
          <div
            key={name}
            className={styles.scene}
            data-active={i === active}
            style={{ background: `linear-gradient(150deg, ${colors[i % colors.length]}, rgba(0,0,0,.25))` }}
          >
            <span className={styles.tag}>{name}</span>
          </div>
        ))}
      </div>
      <div className={styles.thumbs}>
        {scenes.map((name, i) => (
          <button
            key={name}
            type="button"
            className={`${styles.thumb} ${i === active ? styles.thumbOn : ""}`}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
          >
            {name}
          </button>
        ))}
        <span className={styles.indicator} data-index={Math.min(active, 2)} aria-hidden="true" />
      </div>
    </section>
  );
}
