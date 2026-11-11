import type { CSSProperties } from "react";
import styles from "./GlassLoginCard.module.scss";

export type GlassLoginCardProps = {
  /** 카드 등장 전환 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 카드 뒤 블롭 색 1 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 반투명 카드가 backdrop-filter 로 뒤 블롭을 흐리게 비춘다. 블롭은 항상 천천히 움직인다 */
export default function GlassLoginCard({
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: GlassLoginCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.scene} style={vars}>
      <span className={`${styles.blob} ${styles.blobA}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.blobB}`} aria-hidden="true" />
      <form className={styles.card} onSubmit={(e: { preventDefault(): void }) => e.preventDefault()}>
        <h2 className={styles.title}>Welcome back</h2>
        <input className={styles.input} type="email" placeholder="Email" />
        <input className={styles.input} type="password" placeholder="Password" />
        <button className={styles.btn} type="submit">Log in</button>
      </form>
    </div>
  );
}
