// SlideMuteSwitch — vanilla 판(run/076/demo/07-real-slide-mute-switch/index.html) 의 React 포트.
// 레일 안쪽에 숨어 있던 띠가 손잡이가 비켜난 만큼 드러나고, 손잡이는 중간에 서지 않는다.
// 값·키프레임은 vanilla 와 같다(다시 타이핑하지 않는다). 클릭하면 미리보기 루프를 뗀다.
import { useState } from "react";
import styles from "./SlideMuteSwitch.module.scss";

export type SlideMuteSwitchProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = { [k: string]: any };

const LABEL_TEXT = "알림";
const HANDLE_LABEL = "알림 무음";
const STATE_ON = "소리 켜짐";
const STATE_OFF = "무음";

export default function SlideMuteSwitch({
  duration = 300,
  easing = "cubic-bezier(.2, 1.4, .4, 1)", // = $ease-pop
  color = "#c2361a",
}: SlideMuteSwitchProps) {
  const [muted, setMuted] = useState(false);
  const [demo, setDemo] = useState(true);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  const cls = [styles.root, demo ? styles.isDemo : "", muted ? styles.isMuted : ""].filter(Boolean).join(" ");

  function toggle() {
    setDemo(false);
    setMuted((prev) => !prev);
  }
  function wake() {
    setDemo(false);
  }

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <section className={styles.panel}>
          <p className={styles.label}>{LABEL_TEXT}</p>
          <div className={styles.rail}>
            <span className={styles.band} aria-hidden="true"></span>
            <button
              className={styles.handle}
              type="button"
              role="switch"
              aria-checked={muted}
              aria-label={HANDLE_LABEL}
              onPointerDown={wake}
              onClick={toggle}
            >
              <span className={styles.grip} aria-hidden="true"></span>
            </button>
          </div>
          <p className={styles.state} role="status">
            <span className={styles.wordOn}>{STATE_ON}</span>
            <span className={styles.wordOff}>{STATE_OFF}</span>
          </p>
        </section>
      </div>
    </main>
  );
}
