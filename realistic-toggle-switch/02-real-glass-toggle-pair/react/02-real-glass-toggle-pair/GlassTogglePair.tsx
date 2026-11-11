// GlassTogglePair — vanilla 판(run/076/demo/02-real-glass-toggle-pair/index.html) 의 React 포트.
// 세로로 선 어두운 홈을 유리 노브가 위아래로 미끄러진다. 두 채널은 서로 반대 상태로 놓여 0 과 1 을 견준다.
// 값·키프레임은 vanilla 와 같다(다시 타이핑하지 않는다). 손이 닿으면 미리보기 루프를 뗀다.
import { useState } from "react";
import styles from "./GlassTogglePair.module.scss";

export type GlassTogglePairProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = { [k: string]: any };

const CH_A_LABEL = "채널 1";
const CH_B_LABEL = "채널 2";

export default function GlassTogglePair({
  duration = 220,
  easing = "cubic-bezier(.2, 1.4, .4, 1)", // = $ease-pop
  color = "#fff7e6",
}: GlassTogglePairProps) {
  const [demo, setDemo] = useState(true);
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");

  function wake() {
    setDemo(false);
  }
  function flipA() {
    setDemo(false);
    setA((prev) => !prev);
  }
  function flipB() {
    setDemo(false);
    setB((prev) => !prev);
  }

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars} onPointerDown={wake}>
        <div className={[styles.unit, styles.unitA].join(" ")}>
          <input
            className={styles.input}
            type="checkbox"
            role="switch"
            aria-label={CH_A_LABEL}
            checked={a}
            onChange={flipA}
          />
          <div className={styles.scale} aria-hidden="true">
            <span className={[styles.num, styles.numZero].join(" ")}>0</span>
            <span className={[styles.num, styles.numOne].join(" ")}>1</span>
          </div>
          <div className={styles.track}>
            <span className={[styles.detent, styles.detentTop].join(" ")} aria-hidden="true"></span>
            <span className={[styles.detent, styles.detentBottom].join(" ")} aria-hidden="true"></span>
            <span className={styles.knob} aria-hidden="true"></span>
          </div>
        </div>
        <div className={[styles.unit, styles.unitB].join(" ")}>
          <input
            className={styles.input}
            type="checkbox"
            role="switch"
            aria-label={CH_B_LABEL}
            checked={b}
            onChange={flipB}
          />
          <div className={styles.scale} aria-hidden="true">
            <span className={[styles.num, styles.numZero].join(" ")}>0</span>
            <span className={[styles.num, styles.numOne].join(" ")}>1</span>
          </div>
          <div className={styles.track}>
            <span className={[styles.detent, styles.detentTop].join(" ")} aria-hidden="true"></span>
            <span className={[styles.detent, styles.detentBottom].join(" ")} aria-hidden="true"></span>
            <span className={styles.knob} aria-hidden="true"></span>
          </div>
        </div>
      </div>
    </main>
  );
}
