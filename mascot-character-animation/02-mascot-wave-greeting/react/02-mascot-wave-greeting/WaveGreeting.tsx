// WaveGreeting — vanilla 판(run/300/demo/02-mascot-wave-greeting/index.html) 의 React 포트.
// 이 데모는 CSS 만으로 성립해서 상태가 없다 — 훅 없이 그린다.
// duration·easing·color 는 props 로 받아 CSS 변수로 넘긴다(기본값은 vanilla 의 셋과 같다).
import type { CSSProperties } from "react";
import styles from "./WaveGreeting.module.scss";

export type WaveGreetingProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const HINT = "처음 방문한 사람에게 건네는 첫 인사입니다";
const SAY = "안녕하세요, 반갑습니다!";
const CHAR_LABEL = "손을 흔들어 인사하는 마스코트";

export default function WaveGreeting({
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#17141a",
}: WaveGreetingProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-hand" viewBox="0 0 256 256" fill="currentColor"><path d="M184 213.27A80 80 0 0 1 74.7 184l-40-69.32a20 20 0 0 1 34.64-20L55.08 70a20 20 0 0 1 34.65-20l6.92 12a20 20 0 0 1 34.64-20l30 52A20 20 0 0 1 196 74l17.31 30A80 80 0 0 1 184 213.27" opacity=".2" /><path d="m220.17 100l-17.31-30a28 28 0 0 0-38.24-10.25a27.7 27.7 0 0 0-9 8.34L138.2 38a28 28 0 0 0-48.48 0a28 28 0 0 0-41.57 36l1.59 2.76A27.7 27.7 0 0 0 38 80.41a28 28 0 0 0-10.24 38.25l40 69.32a87.47 87.47 0 0 0 53.43 41a88.6 88.6 0 0 0 22.92 3a88 88 0 0 0 76.06-132Zm-6.66 62.64A72 72 0 0 1 81.62 180l-40-69.32a12 12 0 0 1 20.78-12L81.63 132a8 8 0 1 0 13.85-8L62 66a12 12 0 1 1 20.78-12L114 108a8 8 0 1 0 13.85-8l-24.28-42a12 12 0 1 1 20.78-12l33.42 57.9a48 48 0 0 0-5.54 60.6a8 8 0 0 0 13.24-9a32 32 0 0 1 7.31-43.5a8 8 0 0 0 2.13-10.4L168.23 90A12 12 0 1 1 189 78l17.31 30a71.56 71.56 0 0 1 7.2 54.62ZM184.25 31.71A8 8 0 0 1 194 26a59.62 59.62 0 0 1 36.53 28l.33.57a8 8 0 1 1-13.85 8l-.33-.57a43.67 43.67 0 0 0-26.8-20.5a8 8 0 0 1-5.63-9.79M80.89 237a8 8 0 0 1-11.23 1.33A119.6 119.6 0 0 1 40.06 204a8 8 0 0 1 13.86-8a103.7 103.7 0 0 0 25.64 29.72A8 8 0 0 1 80.89 237" /></symbol>
        </defs>
      </svg>
      <div className={`${styles.root} ${styles.isDemo}`} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-hand" /></svg>
          <span>{HINT}</span>
        </p>

        <div className={styles.floor}>
          <div className={styles.char} aria-label={CHAR_LABEL} role="img">
            <div className={styles.riser}>
              <i className={styles.arm}></i>
              <span className={styles.body}>
                <i className={`${styles.eye} ${styles.eyeL}`}></i>
                <i className={`${styles.eye} ${styles.eyeR}`}></i>
                <i className={`${styles.cheek} ${styles.cheekL}`}></i>
                <i className={`${styles.cheek} ${styles.cheekR}`}></i>
                <i className={styles.mouth}></i>
              </span>
            </div>
            <span className={styles.shadow}></span>
          </div>
        </div>

        <p className={styles.say}>{SAY}</p>
      </div>
    </main>
  );
}
