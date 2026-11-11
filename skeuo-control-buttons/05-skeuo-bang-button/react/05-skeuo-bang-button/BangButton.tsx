// BangButton — vanilla 판(run/013/demo/05-skeuo-bang-button) 의 React 포트.
// 누르면 원근 장면 안으로 translateZ 깊이 가라앉고 받침 그림자가 좁아지며 경고등이 켠다.
// 눌림은 aria-pressed 와 글자(대기/가동) 둘로 전달된다. 값·타이밍은 vanilla 와 같다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BangButton.module.scss";

export type BangButtonProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const HINT = "눌러 보세요";
const ARIA_LABEL = "비상 정지 버튼";
const LAMP_TEXT = "경고";
const STATE_IDLE = "대기";
const STATE_HIT = "가동";

export default function BangButton({
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#c2361a",
}: BangButtonProps) {
  const [on, setOn] = useState(false);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function press() {
    setDemo(false);
    setOn((v) => !v);
  }

  const cls = [styles.root, demo ? styles.isDemo : "", on ? styles.isOn : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-warning" viewBox="0 0 256 256" fill="currentColor"><g><path d="M224 91.55v72.9a8 8 0 0 1-2.34 5.66l-51.55 51.55a8 8 0 0 1-5.66 2.34h-72.9a8 8 0 0 1-5.66-2.34l-51.55-51.55a8 8 0 0 1-2.34-5.66v-72.9a8 8 0 0 1 2.34-5.66l51.55-51.55A8 8 0 0 1 91.55 32h72.9a8 8 0 0 1 5.66 2.34l51.55 51.55a8 8 0 0 1 2.34 5.66" opacity=".2"/><path d="M120 136V80a8 8 0 0 1 16 0v56a8 8 0 0 1-16 0m112-44.45v72.9a15.86 15.86 0 0 1-4.69 11.31l-51.55 51.55a15.86 15.86 0 0 1-11.31 4.69h-72.9a15.86 15.86 0 0 1-11.31-4.69l-51.55-51.55A15.86 15.86 0 0 1 24 164.45v-72.9a15.86 15.86 0 0 1 4.69-11.31l51.55-51.55A15.86 15.86 0 0 1 91.55 24h72.9a15.86 15.86 0 0 1 11.31 4.69l51.55 51.55A15.86 15.86 0 0 1 232 91.55m-16 0L164.45 40h-72.9L40 91.55v72.9L91.55 216h72.9L216 164.45ZM128 160a12 12 0 1 0 12 12a12 12 0 0 0-12-12"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-warning" /></svg>
          <span>{HINT}</span>
        </p>
        <div className={styles.scene}>
          <div className={styles.panel}>
            <span className={styles.lampWrap}>
              <i className={styles.lamp}><i className={styles.lampGlow} /></i>
              <span className={styles.lampText}>{LAMP_TEXT}</span>
            </span>
            <div className={styles.well}>
              <i className={styles.shadow} />
              <button className={styles.btn} type="button" aria-pressed={on} aria-label={ARIA_LABEL} onClick={press}>
                <i className={styles.dome} />
              </button>
            </div>
            <p className={styles.state}>
              <span className={styles.stateIdle}>{STATE_IDLE}</span>
              <span className={styles.stateHit}>{STATE_HIT}</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
