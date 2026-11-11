// SeesawSwitch — vanilla 판(run/013/demo/07-skeuo-seesaw-switch) 의 React 포트.
// 각도·눌림·글월은 전부 side 상태 하나로 갈린다. 값·키프레임은 vanilla 와 같다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SeesawSwitch.module.scss";

export type SeesawSwitchProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const HINT = "양쪽 끝을 눌러 A 또는 B를 고르세요";
const SUB_A = "왼쪽";
const SUB_B = "오른쪽";
const OUT_LABEL = "고른 쪽";

export default function SeesawSwitch({
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffffff",
}: SeesawSwitchProps) {
  const [side, setSide] = useState<"a" | "b">("a");
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function pick(next: "a" | "b") {
    setDemo(false);
    setSide(next);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const pressedA = side === "a";

  return (
    <main className={styles.stage}>
      <div className={cls} data-side={side} style={vars}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.scene}>
          <div className={styles.ground} aria-hidden="true"></div>
          <div className={styles.plinth} aria-hidden="true"></div>
          <div className={styles.plank}>
            <button
              className={`${styles.pad} ${styles.padA}`}
              type="button"
              aria-pressed={pressedA}
              onClick={() => pick("a")}
            >
              <b className={styles.key}>A</b>
              <span className={styles.sub}>{SUB_A}</span>
            </button>
            <span className={styles.bolt} aria-hidden="true"></span>
            <button
              className={`${styles.pad} ${styles.padB}`}
              type="button"
              aria-pressed={!pressedA}
              onClick={() => pick("b")}
            >
              <b className={styles.key}>B</b>
              <span className={styles.sub}>{SUB_B}</span>
            </button>
          </div>
        </div>
        <p className={styles.out}>
          <span className={styles.outLabel}>{OUT_LABEL}</span>
          <span className={styles.outVal}>
            <b className={`${styles.letter} ${styles.letterA}`}>A</b>
            <b className={`${styles.letter} ${styles.letterB}`}>B</b>
          </span>
        </p>
      </div>
    </main>
  );
}
