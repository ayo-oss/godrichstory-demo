import type { CSSProperties } from "react";
import styles from "./ZigzagDividerMemphis.module.scss";

export type ZigzagDividerMemphisProps = {
  topKicker?: string;
  topHead?: string;
  bottomHead?: string;
  bottomKicker?: string;
  chip?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 윗 섹션 색(데모 기준값 — 톱니 색은 고정) */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ZigzagDividerMemphis({
  topKicker = "윗 섹션",
  topHead = "레몬 배경이 끝나는 자리",
  bottomHead = "민트 배경이 시작되는 자리",
  bottomKicker = "아래 섹션",
  chip = "경계",
  duration = 2000,
  easing = "linear",
  color = "#ffcf33",
}: ZigzagDividerMemphisProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.zzm} style={vars}>
      <header className={`${styles.sec} ${styles.secTop}`}>
        <p className={styles.kicker}>{topKicker}</p>
        <h2 className={styles.head}>{topHead}</h2>
      </header>
      <div className={styles.zip} aria-hidden="true">
        <span className={`${styles.teeth} ${styles.teethDown}`} />
        <span className={`${styles.teeth} ${styles.teethUp}`} />
        <span className={styles.chip}>{chip}</span>
      </div>
      <footer className={`${styles.sec} ${styles.secBottom}`}>
        <h2 className={styles.head}>{bottomHead}</h2>
        <p className={styles.kicker}>{bottomKicker}</p>
      </footer>
    </section>
  );
}
