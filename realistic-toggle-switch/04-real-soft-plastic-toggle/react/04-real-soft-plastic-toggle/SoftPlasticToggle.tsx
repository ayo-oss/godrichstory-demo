// SoftPlasticToggle — vanilla 판(run/076/demo/04-real-soft-plastic-toggle/index.html) 의 React 포트.
// 위 광원을 받은 볼록 무광 키캡 세 개. 눌림은 짧게, 색 충전은 그 뒤에 차오른다(축이 다르니 시간을 갈라 둔다).
// 값·키프레임은 vanilla 와 같다(다시 타이핑하지 않는다). 손이 닿으면 미리보기 루프를 뗀다.
import { useState } from "react";
import styles from "./SoftPlasticToggle.module.scss";

export type SoftPlasticToggleProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = { [k: string]: any };

const LABEL_EQ = "이퀄라이저";
const LABEL_FILTER = "필터";
const LABEL_BRANCH = "분기";

export default function SoftPlasticToggle({
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)", // = $ease-spring
  color = "#0a4fe8",
}: SoftPlasticToggleProps) {
  const [demo, setDemo] = useState(true);
  const [on, setOn] = useState([false, false, true]);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");

  function wake() {
    setDemo(false);
  }
  function toggle(i: number) {
    setDemo(false);
    setOn((prev) => prev.map((v, j) => (j === i ? !v : v)));
  }

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars} onPointerDown={wake}>
        <button
          className={[styles.key, on[0] ? styles.isOn : ""].filter(Boolean).join(" ")}
          type="button"
          role="switch"
          aria-checked={on[0]}
          aria-label={LABEL_EQ}
          onClick={() => toggle(0)}
        >
          <svg className={styles.icon} viewBox="0 0 256 256" aria-hidden="true" focusable="false"><g fill="currentColor"><path d="M64 112v32a8 8 0 0 1-8 8H24a8 8 0 0 1-8-8v-32a8 8 0 0 1 8-8h32a8 8 0 0 1 8 8m144-72h-48a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8h48a8 8 0 0 0 8-8V48a8 8 0 0 0-8-8m0 112h-48a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8h48a8 8 0 0 0 8-8v-48a8 8 0 0 0-8-8" opacity=".2"/><path d="M160 112h48a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16h-48a16 16 0 0 0-16 16v16h-16a24 24 0 0 0-24 24v32H72v-8a16 16 0 0 0-16-16H24a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h32a16 16 0 0 0 16-16v-8h32v32a24 24 0 0 0 24 24h16v16a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16v-48a16 16 0 0 0-16-16h-48a16 16 0 0 0-16 16v16h-16a8 8 0 0 1-8-8V88a8 8 0 0 1 8-8h16v16a16 16 0 0 0 16 16M56 144H24v-32h32zm104 16h48v48h-48Zm0-112h48v48h-48Z"/></g></svg>
        </button>
        <button
          className={[styles.key, on[1] ? styles.isOn : ""].filter(Boolean).join(" ")}
          type="button"
          role="switch"
          aria-checked={on[1]}
          aria-label={LABEL_FILTER}
          onClick={() => toggle(1)}
        >
          <svg className={styles.icon} viewBox="0 0 256 256" aria-hidden="true" focusable="false"><g fill="currentColor"><path d="M221.9 61.38L152 136v58.65a8 8 0 0 1-3.56 6.66l-32 21.33A8 8 0 0 1 104 216v-80L34.1 61.38A8 8 0 0 1 40 48h176a8 8 0 0 1 5.9 13.38" opacity=".2"/><path d="M230.6 49.53A15.81 15.81 0 0 0 216 40H40a16 16 0 0 0-11.81 26.76l.08.09L96 139.17V216a16 16 0 0 0 24.87 13.32l32-21.34a16 16 0 0 0 7.13-13.32v-55.49l67.74-72.32l.08-.09a15.8 15.8 0 0 0 2.78-17.23m-84.42 81.05A8 8 0 0 0 144 136v58.66L112 216v-80a8 8 0 0 0-2.16-5.47L40 56h176Z"/></g></svg>
        </button>
        <button
          className={[styles.key, on[2] ? styles.isOn : ""].filter(Boolean).join(" ")}
          type="button"
          role="switch"
          aria-checked={on[2]}
          aria-label={LABEL_BRANCH}
          onClick={() => toggle(2)}
        >
          <svg className={styles.icon} viewBox="0 0 256 256" aria-hidden="true" focusable="false"><g fill="currentColor"><path d="M224 64a24 24 0 1 1-24-24a24 24 0 0 1 24 24" opacity=".2"/><path d="M232 64a32 32 0 1 0-40 31v17a8 8 0 0 1-8 8H96a23.8 23.8 0 0 0-8 1.38V95a32 32 0 1 0-16 0v66a32 32 0 1 0 16 0v-17a8 8 0 0 1 8-8h88a24 24 0 0 0 24-24V95a32.06 32.06 0 0 0 24-31M64 64a16 16 0 1 1 16 16a16 16 0 0 1-16-16m32 128a16 16 0 1 1-16-16a16 16 0 0 1 16 16M200 80a16 16 0 1 1 16-16a16 16 0 0 1-16 16"/></g></svg>
        </button>
      </div>
    </main>
  );
}
