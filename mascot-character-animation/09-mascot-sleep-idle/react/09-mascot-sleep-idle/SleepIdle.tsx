// SleepIdle — vanilla 판(run/300/demo/09-mascot-sleep-idle/index.html) 의 React 포트.
// setTimeout 유휴 타이머(3.6초) → 잠듦, 어떤 입력이든 타이머를 처음부터 되돌린다. 값은 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SleepIdle.module.scss";

export type SleepIdleProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ZVars = CSSProperties & { "--i"?: string };

const IDLE_MS = 3600;
const HINT_TEXT = "아무 입력이 없으면 잠들고, 누르면 깨어납니다";
const CHAR_LABEL = "깨었다 잠드는 마스코트";
const AWAKE_TEXT = "깨어 있음";
const ASLEEP_TEXT = "자는 중";

export default function SleepIdle({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: SleepIdleProps) {
  const [asleep, setAsleep] = useState(false);
  const [demo, setDemo] = useState(true);
  const [wakePop, setWakePop] = useState(false);
  const timer = useRef(0);
  const popTimer = useRef(0);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function arm() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAsleep(true), IDLE_MS);
  }
  function wake() {
    setDemo(false);
    if (asleep) {
      setAsleep(false);
      setWakePop(true);
      if (popTimer.current) window.clearTimeout(popTimer.current);
      popTimer.current = window.setTimeout(() => setWakePop(false), 460);
    }
    arm();
  }

  // 창 키 입력으로도 깨운다(포인터는 최상위 onPointerDown 이 담당). 타이머는 cleanup 에서 정리.
  // 격자 미리보기(demo) 동안은 실제 타이머를 돌리지 않는다 — 처음 손을 댄 뒤부터 돈다(vanilla 와 같은 구조).
  useEffect(() => {
    function onKey() { wake(); }
    window.addEventListener("keydown", onKey);
    if (!demo) arm();
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer.current) window.clearTimeout(timer.current);
      if (popTimer.current) window.clearTimeout(popTimer.current);
    };
  });

  const cls = [styles.root, demo ? styles.isDemo : "", asleep ? styles.isAsleep : "", wakePop ? styles.isWake : ""]
    .filter(Boolean).join(" ");
  const zCls = [styles.z1, styles.z2, styles.z3];

  return (
    <main className={styles.stage} onPointerDown={wake}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-moon" viewBox="0 0 256 256" fill="currentColor"><g><path d="M227.89 147.89A96 96 0 1 1 108.11 28.11a96.09 96.09 0 0 0 119.78 119.78" opacity=".2"/><path d="M233.54 142.23a8 8 0 0 0-8-2a88.08 88.08 0 0 1-109.8-109.8a8 8 0 0 0-10-10a104.84 104.84 0 0 0-52.91 37A104 104 0 0 0 136 224a103.1 103.1 0 0 0 62.52-20.88a104.84 104.84 0 0 0 37-52.91a8 8 0 0 0-1.98-7.98m-44.64 48.11A88 88 0 0 1 65.66 67.11a89 89 0 0 1 31.4-26A106 106 0 0 0 96 56a104.11 104.11 0 0 0 104 104a106 106 0 0 0 14.92-1.06a89 89 0 0 1-26.02 31.4"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-moon" /></svg>
          <span>{HINT_TEXT}</span>
        </p>
        <div className={styles.floor}>
          <div className={styles.char} role="img" aria-label={CHAR_LABEL}>
            <span className={styles.body}>
              <i className={`${styles.eye} ${styles.eyeL}`} />
              <i className={`${styles.eye} ${styles.eyeR}`} />
              <i className={`${styles.cheek} ${styles.cheekL}`} />
              <i className={`${styles.cheek} ${styles.cheekR}`} />
              <i className={styles.mouth} />
            </span>
            <span className={styles.zLayer} aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <i key={i} className={`${styles.z} ${zCls[i]}`} style={{ "--i": String(i) } as ZVars}>Z</i>
              ))}
            </span>
            <span className={styles.shadow} />
          </div>
        </div>
        <p className={styles.stateRow}>
          <i className={styles.dot} aria-hidden="true" />
          <span className={styles.stateText} role="status" aria-live="polite">{asleep ? ASLEEP_TEXT : AWAKE_TEXT}</span>
        </p>
      </div>
    </main>
  );
}
