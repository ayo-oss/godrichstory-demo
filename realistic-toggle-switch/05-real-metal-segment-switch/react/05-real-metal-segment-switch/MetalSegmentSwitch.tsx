// MetalSegmentSwitch — vanilla 판(run/076/demo/05-real-metal-segment-switch/index.html) 의 React 포트.
// 파란 면 트랙 안을 짙은 잉크 알약 노브가 좌우로 미끄러진다. 이미 눌린 칸이면 그대로 둔다.
// 값·키프레임은 vanilla 와 같다(다시 타이핑하지 않는다). 손이 닿으면 미리보기 루프를 뗀다.
import { useState } from "react";
import styles from "./MetalSegmentSwitch.module.scss";

export type MetalSegmentSwitchProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = { [k: string]: any };

const LABEL_DAY = "일간";
const LABEL_WEEK = "주간";

export default function MetalSegmentSwitch({
  duration = 300,
  easing = "cubic-bezier(.2, 1.4, .4, 1)", // = $ease-pop
  color = "#0a4fe8",
}: MetalSegmentSwitchProps) {
  const [demo, setDemo] = useState(true);
  const [week, setWeek] = useState(false);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  const cls = [styles.root, demo ? styles.isDemo : "", week ? styles.isWeek : ""].filter(Boolean).join(" ");

  function wake() {
    setDemo(false);
  }
  function pick(next: boolean) {
    setDemo(false);
    setWeek(next);
  }

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars} onPointerDown={wake}>
        <div className={styles.track}>
          <span className={styles.knob} aria-hidden="true"></span>
          <button
            className={styles.cell}
            type="button"
            aria-pressed={!week}
            onClick={() => pick(false)}
          >
            {LABEL_DAY}
          </button>
          <button
            className={styles.cell}
            type="button"
            aria-pressed={week}
            onClick={() => pick(true)}
          >
            {LABEL_WEEK}
          </button>
        </div>
      </div>
    </main>
  );
}
