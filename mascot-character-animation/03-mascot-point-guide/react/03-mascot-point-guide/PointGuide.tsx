// PointGuide — vanilla 판(run/300/demo/03-mascot-point-guide/index.html) 의 React 포트.
// 버튼을 누르면 미리보기(.isDemo)를 떼고 data-step 로 세 단계를 순환한다.
// 팔 내렸다 올리기는 key 리마운트로 다시 시작한다(애니메이션 재발동). 훅은 useState 세 개뿐.
// 이벤트 핸들러 파라미터는 ambient 타입이 없어 쓰지 않는다 — () => advance() 로 인자를 받지 않는다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PointGuide.module.scss";

export type PointGuideProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const HINT = "무엇을 눌러야 하는지 팔이 가리켜 줍니다";
const NEXT = "다음 단계";
const CHAR_LABEL = "버튼을 가리키는 마스코트";
const STEPS = ["먼저 프로필을 채워 봐요", "다음으로 알림을 골라요", "마지막으로 시작을 눌러요"];

export default function PointGuide({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: PointGuideProps) {
  const [step, setStep] = useState(0);
  const [demo, setDemo] = useState(true);
  const [bump, setBump] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function advance() {
    setDemo(false);
    setStep((s) => (s + 1) % 3);
    setBump((b) => b + 1);
  }

  const armClass = [styles.arm, demo ? "" : styles.nod].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-arrow" viewBox="0 0 256 256" fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2" /><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z" /></symbol>
        </defs>
      </svg>
      <div className={`${styles.root} ${demo ? styles.isDemo : ""}`.trim()} style={vars} data-step={String(step)}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-arrow" /></svg>
          <span>{HINT}</span>
        </p>

        <div className={styles.row}>
          <div className={styles.char} aria-label={CHAR_LABEL} role="img">
            <i className={armClass} key={demo ? "demo" : `nod-${bump}`}></i>
            <span className={styles.body}>
              <i className={`${styles.eye} ${styles.eyeL}`}><span className={styles.pupil}></span></i>
              <i className={`${styles.eye} ${styles.eyeR}`}><span className={styles.pupil}></span></i>
              <i className={`${styles.cheek} ${styles.cheekL}`}></i>
              <i className={`${styles.cheek} ${styles.cheekR}`}></i>
              <i className={styles.mouth}></i>
            </span>
          </div>

          <div className={styles.side}>
            <button className={styles.btn} type="button" onClick={() => advance()}>
              <span>{NEXT}</span>
              <svg className={styles.btnIco} aria-hidden="true"><use href="#ico-arrow" /></svg>
            </button>
            <p className={styles.say} aria-live="polite">
              <span className={`${styles.msg} ${styles.msg0}`}>{STEPS[0]}</span>
              <span className={`${styles.msg} ${styles.msg1}`}>{STEPS[1]}</span>
              <span className={`${styles.msg} ${styles.msg2}`}>{STEPS[2]}</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
