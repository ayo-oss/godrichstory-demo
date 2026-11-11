import type { CSSProperties } from "react";
import styles from "./MarqueeBandCollage.module.scss";

export type MarqueeBandCollageProps = {
  /** 위 띠의 낱말 한 벌. 화면에는 두 벌이 깔린다 */
  top?: string[];
  /** 아래 띠의 낱말 한 벌 */
  bottom?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const defaultTop = ["COLLAGE", "MAXIMAL", "PASTE", "CUT"];
const defaultBottom = ["겹치기", "기울이기", "오리기"];

export default function MarqueeBandCollage({
  top = defaultTop,
  bottom = defaultBottom,
  duration = 2000,
  easing = "linear",
  color = "#d93a1e",
}: MarqueeBandCollageProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  // 한 벌을 그대로 복제해 두 벌을 깐다. 복제본은 스크린리더에서 숨긴다
  const doubled = (xs: string[]) => [...xs, ...xs];

  return (
    <section className={styles.mcol} style={vars}>
      <div className={`${styles.band} ${styles.bandCoral}`}>
        <div className={styles.track}>
          {doubled(top).map((w, i) => (
            <span key={`t${i}`} className={styles.bit} aria-hidden={i >= top.length}>{w}</span>
          ))}
        </div>
      </div>
      <div className={`${styles.band} ${styles.bandLemon}`}>
        <div className={`${styles.track} ${styles.trackBack}`}>
          {doubled(bottom).map((w, i) => (
            <span key={`b${i}`} className={styles.bit} aria-hidden={i >= bottom.length}>{w}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
