// CheckMorphSwitch — vanilla 판(run/076/demo/08-real-check-morph-switch/index.html) 의 React 포트.
// 노브가 도착한 다음에야 체크 선이 그려진다 — 이동과 확인 신호를 animation-delay 하나로 뗀다.
// 값·키프레임은 vanilla 와 같다(다시 타이핑하지 않는다). 클릭하면 미리보기 루프를 뗀다.
import { useState } from "react";
import styles from "./CheckMorphSwitch.module.scss";

export type CheckMorphSwitchProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = { [k: string]: any };

const LABEL_TEXT = "약관에 동의";
const SWITCH_LABEL = "약관 동의";
const STATE_OFF = "아직 동의 전";
const STATE_ON = "동의함";

export default function CheckMorphSwitch({
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)", // = $ease-spring
  color = "#0a4fe8",
}: CheckMorphSwitchProps) {
  const [agreed, setAgreed] = useState(false);
  const [demo, setDemo] = useState(true);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  const cls = [styles.root, demo ? styles.isDemo : "", agreed ? styles.isAgreed : ""].filter(Boolean).join(" ");

  function toggle() {
    setDemo(false);
    setAgreed((prev) => !prev);
  }
  function wake() {
    setDemo(false);
  }

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <section className={styles.panel}>
          <p className={styles.label}>{LABEL_TEXT}</p>
          <button
            className={styles.switch}
            type="button"
            role="switch"
            aria-checked={agreed}
            aria-label={SWITCH_LABEL}
            onPointerDown={wake}
            onClick={toggle}
          >
            <span className={styles.knob} aria-hidden="true">
              <svg className={styles.check} viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="5,12.5 10,17.5 19,7.5"></polyline>
              </svg>
            </span>
          </button>
          <p className={styles.state} role="status">
            <span className={styles.wordOff}>{STATE_OFF}</span>
            <span className={styles.wordOn}>{STATE_ON}</span>
          </p>
        </section>
      </div>
    </main>
  );
}
