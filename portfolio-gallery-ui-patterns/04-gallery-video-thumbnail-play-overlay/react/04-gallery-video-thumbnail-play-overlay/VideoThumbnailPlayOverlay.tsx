import type { CSSProperties } from "react";
import styles from "./VideoThumbnailPlayOverlay.module.scss";

export type VideoThumbnailPlayOverlayProps = {
  /** 재생버튼·파동 한 주기 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 썸네일 그러데이션 포인트 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const CLIPS = [
  { tone: "a", time: "0:32" },
  { tone: "b", time: "1:05" },
  { tone: "c", time: "0:48" },
];

/** 재생 버튼이 커지면서 둘레로 파동 링이 한 번 퍼져 나가 재생 가능한 영상임을 알려준다 */
export default function VideoThumbnailPlayOverlay({
  duration = 2000,
  easing = "ease-out",
  color = "#6ec8ff",
}: VideoThumbnailPlayOverlayProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <ul className={styles.gallery} style={vars} aria-label="Video gallery">
      {CLIPS.map((c, i) => (
        <li key={i} className={styles.card}>
          <span className={`${styles.thumb} ${styles["thumb-" + c.tone]}`} />
          <span className={styles.ring} aria-hidden="true" style={{ animationDelay: `-${i * (duration / 3)}ms` }} />
          <button type="button" className={styles.play} aria-label="Play video" style={{ animationDelay: `-${i * (duration / 3)}ms` }}>▶</button>
          <span className={styles.time}>{c.time}</span>
        </li>
      ))}
    </ul>
  );
}
