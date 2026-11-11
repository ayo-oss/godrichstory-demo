// PowerLedButton — vanilla 판(run/076/demo/01-real-power-led-button/index.html) 의 React 포트.
// 누르면 캡이 안으로 들어가고, 놓으면 캡이 먼저 돌아오고 LED 링은 그 뒤에 서서히 켜진다(비대칭 타이밍).
// 값·키프레임은 vanilla 와 같다(다시 타이핑하지 않는다). 누르면 미리보기 루프를 뗀다.
import { useState } from "react";
import styles from "./PowerLedButton.module.scss";

export type PowerLedButtonProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = { [k: string]: any };

const ARIA_LABEL = "전원";
const STATE_ON = "켜짐";
const STATE_OFF = "꺼짐";

export default function PowerLedButton({
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)", // = $ease-spring
  color = "#ffd23f",
}: PowerLedButtonProps) {
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
          <div className={styles.assembly}>
            <span className={styles.bezel} aria-hidden="true"></span>
            <span className={styles.groove} aria-hidden="true"></span>
            <button
              className={styles.cap}
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={ARIA_LABEL}
              onPointerDown={wake}
              onClick={toggle}
            >
              <svg className={styles.mark} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 3v6" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"></path>
                <path d="M18.4 6.6a7.4 7.4 0 1 1-12.8 0" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"></path>
              </svg>
            </button>
            <span className={styles.led} aria-hidden="true"></span>
            <span className={styles.shade} aria-hidden="true"></span>
          </div>
          <p className={styles.state} role="status">
            <span className={styles.wordOn}>{STATE_ON}</span>
            <span className={styles.wordOff}>{STATE_OFF}</span>
          </p>
        </div>
      </div>
    </main>
  );
}
