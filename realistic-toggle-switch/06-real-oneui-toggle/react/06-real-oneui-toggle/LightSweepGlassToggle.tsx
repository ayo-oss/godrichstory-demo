// LightSweepGlassToggle — vanilla 판(run/076/demo/06-real-oneui-toggle/index.html) 의 React 포트.
// 켜질 때 트랙 안 빛이 차오르고 사선 반사광 덩어리(sweep)는 노브와 별개로 반대편으로 흘러 간다.
// 값·키프레임은 vanilla 와 같다(다시 타이핑하지 않는다). 누르면 미리보기 루프를 뗀다.
import { useState } from "react";
import styles from "./LightSweepGlassToggle.module.scss";

export type LightSweepGlassToggleProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = { [k: string]: any };

const ARIA_LABEL = "야간 모드";
const STATE_ON = "켜짐";
const STATE_OFF = "꺼짐";

export default function LightSweepGlassToggle({
  duration = 300,
  easing = "cubic-bezier(.2, 1.4, .4, 1)", // = $ease-pop
  color = "#2f6df6",
}: LightSweepGlassToggleProps) {
  const [on, setOn] = useState(false);
  const [demo, setDemo] = useState(true);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  const cls = [styles.root, demo ? styles.isDemo : "", on ? styles.isOn : ""].filter(Boolean).join(" ");

  function wake() {
    setDemo(false);
  }
  function toggle() {
    setDemo(false);
    setOn((prev) => !prev);
  }

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.col}>
          <button
            className={styles.track}
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={ARIA_LABEL}
            onPointerDown={wake}
            onClick={toggle}
          >
            <span className={styles.light} aria-hidden="true"></span>
            <span className={styles.sweep} aria-hidden="true"></span>
            <span className={[styles.star, styles.star1].join(" ")} aria-hidden="true"></span>
            <span className={[styles.star, styles.star2].join(" ")} aria-hidden="true"></span>
            <span className={[styles.star, styles.star3].join(" ")} aria-hidden="true"></span>
            <span className={[styles.star, styles.star4].join(" ")} aria-hidden="true"></span>
            <span className={[styles.star, styles.star5].join(" ")} aria-hidden="true"></span>
            <span className={styles.knob} aria-hidden="true"><span className={styles.grip} aria-hidden="true"></span></span>
          </button>
          <p className={styles.state} role="status">
            <span className={styles.wordOn}>{STATE_ON}</span>
            <span className={styles.wordOff}>{STATE_OFF}</span>
          </p>
        </div>
      </div>
    </main>
  );
}
