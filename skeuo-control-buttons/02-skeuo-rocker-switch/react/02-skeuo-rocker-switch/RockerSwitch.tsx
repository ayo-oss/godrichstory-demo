// RockerSwitch — vanilla 판(run/013/demo/02-skeuo-rocker-switch/index.html) 의 React 포트.
// 윗면(I)을 누르면 그쪽이 가라앉고 반대쪽(O)이 뜬다. 값·키프레임은 vanilla 와 같다.
import { useState } from "react";
import styles from "./RockerSwitch.module.scss";

export type RockerSwitchProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = { [k: string]: any };

const ROCKER_LABEL = "전원 로커";
const STATE_OFF = "꺼짐";
const STATE_ON = "켜짐";

export default function RockerSwitch({
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)", // = $ease-spring
  color = "#ffffff",
}: RockerSwitchProps) {
  const [on, setOn] = useState(false);
  const [demo, setDemo] = useState(true);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  const cls = [styles.root, demo ? styles.isDemo : "", on ? styles.isOn : ""].filter(Boolean).join(" ");

  function toggle() {
    setDemo(false);
    setOn((prev) => !prev);
  }
  function wake() {
    setDemo(false);
  }

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <section className={styles.plate}>
          <p className={styles.head}><span className={styles.lamp} aria-hidden="true"></span><span className={styles.onWord}>ON</span></p>
          <div className={styles.bezel}>
            <button
              className={styles.rocker}
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={ROCKER_LABEL}
              onPointerDown={wake}
              onClick={toggle}
            >
              <span className={`${styles.cap} ${styles.capTop}`}><b className={styles.io}>I</b></span>
              <span className={`${styles.cap} ${styles.capBottom}`}><b className={styles.io}>O</b></span>
            </button>
          </div>
          <p className={styles.state} role="status">
            <span className={styles.wordOff}>{STATE_OFF}</span>
            <span className={styles.wordOn}>{STATE_ON}</span>
          </p>
        </section>
      </div>
    </main>
  );
}
