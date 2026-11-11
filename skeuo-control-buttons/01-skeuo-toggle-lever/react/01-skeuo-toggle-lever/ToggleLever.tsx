// ToggleLever — vanilla 판(run/013/demo/01-skeuo-toggle-lever/index.html) 의 React 포트.
// 금속 레버가 관절을 축으로 좌우로 기울어 on·off 를 가르고, transition 이 오버슈트로 한 번 튕긴다.
// 값·키프레임은 vanilla 와 같다(다시 타이핑하지 않는다). 클릭하면 미리보기 루프를 뗀다.
import { useState } from "react";
import styles from "./ToggleLever.module.scss";

export type ToggleLeverProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = { [k: string]: any };

const NAME_TEXT = "전원";
const STATE_OFF = "꺼짐";
const STATE_ON = "켜짐";
const LEVER_LABEL = "전원 레버";

export default function ToggleLever({
  duration = 220,
  easing = "cubic-bezier(.2, 1.4, .4, 1)", // = $ease-pop
  color = "#ffffff",
}: ToggleLeverProps) {
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
        <section className={styles.panel}>
          <p className={styles.head}><span className={styles.led} aria-hidden="true"></span><span className={styles.name}>{NAME_TEXT}</span></p>
          <div className={styles.assembly}>
            <span className={styles.bracket} aria-hidden="true"></span>
            <span className={styles.slot} aria-hidden="true"></span>
            <span className={styles.dome} aria-hidden="true"></span>
            <button
              className={styles.hit}
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={LEVER_LABEL}
              onPointerDown={wake}
              onClick={toggle}
            >
              <span className={styles.armWrap} aria-hidden="true"><span className={styles.grip}></span></span>
            </button>
          </div>
          <p className={styles.marks} aria-hidden="true">
            <span className={`${styles.mark} ${styles.markOff}`}>OFF</span>
            <span className={`${styles.mark} ${styles.markOn}`}>ON</span>
          </p>
          <p className={styles.state} role="status">
            <span className={styles.wordOff}>{STATE_OFF}</span>
            <span className={styles.wordOn}>{STATE_ON}</span>
          </p>
        </section>
      </div>
    </main>
  );
}
