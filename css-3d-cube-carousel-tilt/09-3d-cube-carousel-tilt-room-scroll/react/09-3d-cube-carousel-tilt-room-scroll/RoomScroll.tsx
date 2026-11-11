import type { CSSProperties } from "react";
import styles from "./RoomScroll.module.scss";

export type RoomScrollProps = {
  /** 방을 한 바퀴 둘러보는 시간 (기본 9000ms) — 큐브 회전보다 느리게 */
  duration?: number;
  easing?: string;
  /** 벽 색 */
  color?: string;
  walls?: [string, string, string];
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function RoomScroll({
  duration = 9000,
  easing = "linear",
  color = "#fff7e6",
  walls = ["포트폴리오", "소개", "작업"],
}: RoomScrollProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.scene}>
      <div className={styles.room} style={vars}>
        <div className={`${styles.wall} ${styles.back}`}>{walls[0]}</div>
        <div className={`${styles.wall} ${styles.left}`}>{walls[1]}</div>
        <div className={`${styles.wall} ${styles.right}`}>{walls[2]}</div>
        <div className={styles.floor} aria-hidden="true" />
      </div>
    </div>
  );
}
