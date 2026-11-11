// PlayfulMorphToggle — vanilla 판(run/076/demo/03-real-playful-morph-toggle/index.html) 의 React 포트.
// 노브는 미끄러지는 대신 굴러서 반대편으로 간다(translateX + rotate 동시). 도착하면 감겨 있던 두 눈이 벌어진다.
// 값·키프레임은 vanilla 와 같다(다시 타이핑하지 않는다). 누르면 미리보기 루프를 뗀다.
import { useState } from "react";
import styles from "./PlayfulMorphToggle.module.scss";

export type PlayfulMorphToggleProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = { [k: string]: any };

const SIDE_OFF = "꺼짐";
const SIDE_ON = "켜짐";
const ARIA_LABEL = "소리";
const STATE_ON = "소리 켜짐";
const STATE_OFF = "소리 꺼짐";
const TOOTH_COUNT = 8; // 위·아래 랙의 이빨 수(vanilla 와 같다)

export default function PlayfulMorphToggle({
  duration = 300,
  easing = "cubic-bezier(.2, 1.4, .4, 1)", // = $ease-pop — 칩 값 그대로 노출
  color = "#fff7e6",
}: PlayfulMorphToggleProps) {
  const [on, setOn] = useState(false);
  const [demo, setDemo] = useState(true);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  const cls = [styles.root, demo ? styles.isDemo : "", on ? styles.isOn : ""].filter(Boolean).join(" ");

  const teeth: number[] = [];
  for (let i = 0; i < TOOTH_COUNT; i++) { teeth.push(i); }

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
        <div className={styles.unit}>
          <div className={styles.head} aria-hidden="true">
            <span className={[styles.side, styles.sideOff].join(" ")}>
              <span className={styles.dot}></span>
              <span className={styles.word}>{SIDE_OFF}</span>
            </span>
            <span className={[styles.side, styles.sideOn].join(" ")}>
              <span className={styles.word}>{SIDE_ON}</span>
              <span className={styles.dot}></span>
            </span>
          </div>
          <div className={styles.track}>
            <span className={[styles.rack, styles.rackTop].join(" ")} aria-hidden="true">
              {teeth.map((i) => <span key={i} className={styles.tooth}></span>)}
            </span>
            <span className={[styles.rack, styles.rackBottom].join(" ")} aria-hidden="true">
              {teeth.map((i) => <span key={`b${i}`} className={styles.tooth}></span>)}
            </span>
            <span className={styles.knob} aria-hidden="true">
              <span className={styles.roll}><span className={styles.grip}></span></span>
              <span className={styles.eyes}><span className={styles.eye}></span><span className={styles.eye}></span></span>
            </span>
            <button
              className={styles.hit}
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={ARIA_LABEL}
              onPointerDown={wake}
              onClick={toggle}
            ></button>
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
