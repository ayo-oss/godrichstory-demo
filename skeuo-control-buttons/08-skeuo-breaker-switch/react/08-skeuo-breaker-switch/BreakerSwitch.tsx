// BreakerSwitch — vanilla 판(run/013/demo/08-skeuo-breaker-switch) 의 React 포트.
// 손잡이·표시등·글월은 전부 on 상태 하나로 갈린다. 값·키프레임은 vanilla 와 같다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BreakerSwitch.module.scss";

export type BreakerSwitchProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const BRAND = "배전 차단기";
const MARK_ON = "켜짐";
const MARK_OFF = "꺼짐";
const STATE_ON = "전원이 켜졌습니다";
const STATE_OFF = "전원이 꺼졌습니다";
const ARIA_LABEL = "전원 차단기";

export default function BreakerSwitch({
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffffff",
}: BreakerSwitchProps) {
  const [on, setOn] = useState(true);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle() {
    setDemo(false);
    setOn(!on);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <div className={cls} data-on={on ? "true" : "false"} style={vars}>
        <button
          className={styles.switch}
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={ARIA_LABEL}
          onClick={toggle}
        >
          <span className={styles.plate}>
            <span className={styles.brand}>
              <svg className={styles.spark} viewBox="0 0 256 256" aria-hidden="true" fill="currentColor"><g><path d="m96 240l16-80l-64-24L160 16l-16 80l64 24Z" opacity=".2"/><path d="M215.79 118.17a8 8 0 0 0-5-5.66L153.18 90.9l14.66-73.33a8 8 0 0 0-13.69-7l-112 120a8 8 0 0 0 3 13l57.63 21.61l-14.62 73.25a8 8 0 0 0 13.69 7l112-120a8 8 0 0 0 1.94-7.26M109.37 214l10.47-52.38a8 8 0 0 0-5-9.06L62 132.71l84.62-90.66l-10.46 52.38a8 8 0 0 0 5 9.06l52.8 19.8Z"/></g></svg>
              <span>{BRAND}</span>
            </span>
            <span className={styles.slot}>
              <span className={`${styles.mark} ${styles.markOn}`}><i className={styles.led}></i>{MARK_ON}</span>
              <span className={`${styles.mark} ${styles.markOff}`}><i className={styles.led}></i>{MARK_OFF}</span>
              <span className={styles.lever}><span className={styles.grip} aria-hidden="true"></span></span>
            </span>
            <span className={styles.hazard} aria-hidden="true"></span>
          </span>
          <span className={styles.hand} aria-hidden="true">
            <svg className={styles.handIco} viewBox="0 0 256 256" fill="currentColor"><g><path d="M216 116v36a80 80 0 0 1-80 80c-44.18 0-55.81-24-93.32-90a20 20 0 0 1 34.64-20L96 152V44a20 20 0 0 1 40 0v56a20 20 0 0 1 40 0v16a20 20 0 0 1 40 0" opacity=".2"/><path d="M196 88a27.86 27.86 0 0 0-13.35 3.39A28 28 0 0 0 144 74.7V44a28 28 0 0 0-56 0v80l-3.82-6.13A28 28 0 0 0 35.73 146l4.67 8.23C74.81 214.89 89.05 240 136 240a88.1 88.1 0 0 0 88-88v-36a28 28 0 0 0-28-28m12 64a72.08 72.08 0 0 1-72 72c-37.63 0-47.84-18-81.68-77.68l-4.69-8.27V138A12 12 0 0 1 54 121.61a11.9 11.9 0 0 1 6-1.6a12 12 0 0 1 10.41 6a2 2 0 0 0 .14.23l18.67 30A8 8 0 0 0 104 152V44a12 12 0 0 1 24 0v68a8 8 0 0 0 16 0v-12a12 12 0 0 1 24 0v20a8 8 0 0 0 16 0v-4a12 12 0 0 1 24 0Z"/></g></svg>
          </span>
        </button>
        <p className={styles.status}>
          <span className={`${styles.state} ${styles.stateOn}`}>{STATE_ON}</span>
          <span className={`${styles.state} ${styles.stateOff}`}>{STATE_OFF}</span>
        </p>
      </div>
    </main>
  );
}
