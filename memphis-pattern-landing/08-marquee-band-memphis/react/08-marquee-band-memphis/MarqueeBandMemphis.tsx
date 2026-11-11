import type { CSSProperties } from "react";
import styles from "./MarqueeBandMemphis.module.scss";

export type MarqueeBandMemphisProps = {
  hint?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 점 조각의 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/* 같은 다섯 조각(점·물결·십자·반원·삼각)을 두 벌 깐다 */
const TOKS = [styles.tokDot, styles.tokSquig, styles.tokCross, styles.tokHalf, styles.tokTri];

export default function MarqueeBandMemphis({
  hint = "다음 섹션으로 이어지는 띠",
  duration = 2000,
  easing = "linear",
  color = "#ff5c47",
}: MarqueeBandMemphisProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const track = [...TOKS, ...TOKS];

  return (
    <section className={styles.marqm} style={vars} aria-label="패턴 마퀴 띠">
      <div className={styles.viewport}>
        <div className={styles.track}>
          {track.map((t, i) => (
            <span key={i} className={`${styles.tok} ${t}`} />
          ))}
        </div>
      </div>
      <p className={styles.hint}>{hint}</p>
    </section>
  );
}
