// JumpSuccess — 뛰어오르는 성공. vanilla 판과 같은 마크업·타이밍.
// 완료를 누르면 점프가 한 번 재생되고, 마지막 별의 animationend 로 상태를 원위치로 돌린다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./JumpSuccess.module.scss";

export type JumpSuccessProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const HINT_TEXT = "완료 버튼을 누르면 한 번 뛰어오릅니다";
const CHAR_LABEL = "뛰어오르는 마스코트";
const GO_TEXT = "완료";
const CHEER_TEXT = "완료를 축하합니다";

export default function JumpSuccess({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: JumpSuccessProps) {
  const [demo, setDemo] = useState(true);
  const [jump, setJump] = useState(false);
  const [say, setSay] = useState("");
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  function leap() {
    setDemo(false);
    setJump(false);
    // 두 프레임을 건너 뛰어 점프를 처음부터 다시 튀긴다 (vanilla 의 void offsetWidth 와 같은 역할)
    requestAnimationFrame(() => { requestAnimationFrame(() => setJump(true)); });
    setSay(CHEER_TEXT);
  }

  const cls = [styles.root, demo ? styles.isDemo : "", jump ? styles.jump : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-smiley" viewBox="0 0 256 256" fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88M80 108a12 12 0 1 1 12 12a12 12 0 0 1-12-12m96 0a12 12 0 1 1-12-12a12 12 0 0 1 12 12m-1.08 48c-10.29 17.79-27.39 28-46.92 28s-36.63-10.2-46.92-28a8 8 0 1 1 13.84-8c7.47 12.91 19.21 20 33.08 20s25.61-7.1 33.08-20a8 8 0 1 1 13.84 8"/></symbol>
          <symbol id="ico-star" viewBox="0 0 256 256" fill="currentColor"><path d="m229.06 108.79l-48.7 42l14.88 62.79a8.4 8.4 0 0 1-12.52 9.17L128 189.09l-54.72 33.65a8.4 8.4 0 0 1-12.52-9.17l14.88-62.79l-48.7-42A8.46 8.46 0 0 1 31.73 94l63.91-5.2l24.62-59.6a8.36 8.36 0 0 1 15.48 0l24.62 59.6l63.91 5.2a8.46 8.46 0 0 1 4.79 14.79" opacity=".2"/><path d="M239.18 97.26A16.38 16.38 0 0 0 224.92 86l-59-4.76l-22.78-55.09a16.36 16.36 0 0 0-30.27 0L90.11 81.23L31.08 86a16.46 16.46 0 0 0-9.37 28.86l45 38.83L53 211.75a16.38 16.38 0 0 0 24.5 17.82l50.5-31.08l50.53 31.08A16.4 16.4 0 0 0 203 211.75l-13.76-58.07l45-38.83a16.43 16.43 0 0 0 4.94-17.59m-15.34 5.47l-48.7 42a8 8 0 0 0-2.56 7.91l14.88 62.8a.37.37 0 0 1-.17.48c-.18.14-.23.11-.38 0l-54.72-33.65a8 8 0 0 0-8.38 0l-54.72 33.67c-.15.09-.19.12-.38 0a.37.37 0 0 1-.17-.48l14.88-62.8a8 8 0 0 0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16a8 8 0 0 0 6.72-4.94l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153 91.86a8 8 0 0 0 6.75 4.92l63.92 5.16c.15 0 .24 0 .33.29s0 .4-.16.5"/></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-smiley" /></svg>
          <span>{HINT_TEXT}</span>
        </p>
        <div className={styles.floor}>
          <div className={styles.char} aria-label={CHAR_LABEL} role="img">
            <span className={`${styles.star} ${styles.starL}`} aria-hidden="true">
              <svg className={styles.starIco}><use href="#ico-star" /></svg>
            </span>
            <span className={`${styles.star} ${styles.starC}`} aria-hidden="true">
              <svg className={styles.starIco}><use href="#ico-star" /></svg>
            </span>
            <span
              className={`${styles.star} ${styles.starR}`}
              aria-hidden="true"
              onAnimationEnd={() => setJump(false)}
            >
              <svg className={styles.starIco}><use href="#ico-star" /></svg>
            </span>
            <span className={styles.body}>
              <i className={`${styles.eye} ${styles.eyeL}`}></i>
              <i className={`${styles.eye} ${styles.eyeR}`}></i>
              <i className={`${styles.cheek} ${styles.cheekL}`}></i>
              <i className={`${styles.cheek} ${styles.cheekR}`}></i>
              <i className={styles.mouth}></i>
            </span>
            <span className={styles.shadow}></span>
          </div>
        </div>
        <button className={styles.go} type="button" onClick={leap}>{GO_TEXT}</button>
        <p className={styles.sr} aria-live="polite">{say}</p>
      </div>
    </main>
  );
}
