import type { CSSProperties } from "react";
import styles from "./PolaroidStack.module.scss";

export type PolaroidStackProps = {
  /** 한 장이 물러났다 돌아오는 주기 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 사진 색 포인트 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 네 장이 차례로 살짝씩 밀려났다 제자리로 돌아와, 스택이 계속 넘겨지는 것처럼 보인다 */
export default function PolaroidStack({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#b9a0ff",
}: PolaroidStackProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.stack} style={vars} tabIndex={0} aria-label="A stack of polaroid photos you flip through">
      <div className={`${styles.polaroid} ${styles.p1}`}><span className={`${styles.photo} ${styles.photoA}`} /></div>
      <div className={`${styles.polaroid} ${styles.p2}`}><span className={`${styles.photo} ${styles.photoB}`} /></div>
      <div className={`${styles.polaroid} ${styles.p3}`}><span className={`${styles.photo} ${styles.photoC}`} /></div>
      <div className={`${styles.polaroid} ${styles.p4}`}><span className={`${styles.photo} ${styles.photoD}`} /></div>
    </div>
  );
}
