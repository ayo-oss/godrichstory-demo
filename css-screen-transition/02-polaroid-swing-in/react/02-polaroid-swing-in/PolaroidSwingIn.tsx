import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import styles from "./PolaroidSwingIn.module.scss";

export type PolaroidSwingInProps = {
  caption: string;
  /** 흔들림이 잦아들 때까지의 시간 (기본 1100ms) */
  duration?: number;
  easing?: string;
  /** 사진 그라데이션 색 */
  color?: string;
  /** 다시 흔들려면 이 값을 바꾼다 */
  replayKey?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PolaroidSwingIn({
  caption,
  duration = 1100,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#2f6df6",
  replayKey = 0,
}: PolaroidSwingInProps) {
  const [run, setRun] = useState(0);
  useEffect(() => { setRun(replayKey); }, [replayKey]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <figure key={run} className={styles.swing} style={vars} aria-label={caption}>
      <span className={styles.pin} aria-hidden="true" />
      <span className={styles.string} aria-hidden="true" />
      <div className={styles.photo}>
        <span className={styles.shot} aria-hidden="true" />
        <figcaption className={styles.caption}>{caption}</figcaption>
      </div>
    </figure>
  );
}
