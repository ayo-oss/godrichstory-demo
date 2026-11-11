import type { CSSProperties } from "react";
import { useState } from "react";
import styles from "./SplitDiagonalSwap.module.scss";

export type SplitDiagonalSwapProps = {
  sceneA: string;
  sceneB: string;
  swapLabel: string;
  /** 판이 프레임을 통과하는 시간 (기본 1000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SplitDiagonalSwap({
  sceneA,
  sceneB,
  swapLabel,
  duration = 1000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SplitDiagonalSwapProps) {
  const [atB, setAtB] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.scene} style={vars} aria-label={`${sceneA} / ${sceneB}`}>
      <div className={styles.frame}>
        <div className={`${styles.inner} ${styles.innerA} ${atB ? styles.innerHide : ""}`}>
          <p className={styles.name}>{sceneA}</p>
        </div>
        <div className={`${styles.inner} ${styles.innerB} ${atB ? styles.innerShow : ""}`}>
          <p className={styles.name}>{sceneB}</p>
        </div>
        <div className={styles.wipes} aria-hidden="true">
          <span className={`${styles.wipe} ${styles.wipe1} ${atB ? styles.wipeGo : ""}`} />
          <span className={`${styles.wipe} ${styles.wipe2} ${atB ? styles.wipeGo : ""}`} />
        </div>
      </div>
      <button type="button" className={styles.btn} onClick={() => setAtB((v) => !v)}>{swapLabel}</button>
    </section>
  );
}
