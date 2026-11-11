// FailShake — vanilla 판(run/371/demo/03-biometric-scan-fail-shake/index.html) 의 React 포트.
// 계산 겹(감쇠 스프링 진동)은 useFailShake 훅 안에 있다: x(t) = AMPLITUDE * e^(-t/decayMs) * cos(t*FREQ)
// 을 매 프레임 다시 계산해 아이콘 translateX 오프셋에 쓴다.
import { useEffect, useRef, useState } from "react";
import styles from "./FailShake.module.scss";

type Box<T> = { current: T };

const STRINGS: Record<string, string> = { idle: "다시 시도해 주세요", failed: "인증 실패" };

function useFailShake(
  rootRef: Box<HTMLButtonElement>,
  iconRef: Box<SVGSVGElement>,
  setStatus: (s: string) => void,
  setPressed: (b: boolean) => void
) {
  useEffect(() => {
    const AMPLITUDE = 14;
    const FREQ = 0.028;
    const SHAKE_DAMP = 18; // 변형 03: SHAKE_DAMP 18 → 8
    const SETTLE_MS = 900;
    const GAP_MS = 900;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const decayMs = reduce ? 1 : SHAKE_DAMP * 40;

    const root = rootRef.current;
    const icon = iconRef.current;
    if (!root || !icon) return;

    let isDemo = true;
    let running = false;
    let startTs = 0;
    let rafId = 0;

    function apply(t: number) {
      const offset = AMPLITUDE * Math.exp(-t / decayMs) * Math.cos(t * FREQ);
      icon.style.transform = "translateX(" + offset.toFixed(2) + "px)";
    }

    function runShake(ts: number) {
      if (!startTs) startTs = ts;
      const t = ts - startTs;
      if (t <= SETTLE_MS) {
        apply(t);
        rafId = requestAnimationFrame(runShake);
      } else {
        apply(0);
        setStatus(STRINGS.idle);
        running = false;
        setPressed(false);
      }
    }

    function trigger() {
      if (running) return;
      running = true;
      startTs = 0;
      setStatus(STRINGS.failed);
      setPressed(true);
      rafId = requestAnimationFrame(runShake);
    }

    function human() { if (isDemo) { root.classList.remove(styles.isDemo); isDemo = false; } }
    function onClick() { human(); trigger(); }
    function onKeyDown(e: KeyboardEvent) { if (e.key === " " || e.key === "Enter") human(); }
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);

    apply(0);

    let cycleStart = 0;
    const PERIOD = SETTLE_MS + GAP_MS;
    function loop(ts: number) {
      if (isDemo && !reduce) {
        if (!cycleStart) cycleStart = ts;
        const phase = (ts - cycleStart) % PERIOD;
        if (phase < 16 && !running) trigger();
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafId);
    };
  }, []);
}

export default function FailShake() {
  const rootRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const iconRef = useRef(null) as unknown as Box<SVGSVGElement>;
  const [status, setStatus] = useState(STRINGS.idle);
  const [pressed, setPressed] = useState(false);

  useFailShake(rootRef, iconRef, setStatus, setPressed);

  return (
    <main className={styles.stage}>
      <div className={styles.failWrap}>
        <button
          type="button"
          className={styles.fail + " " + styles.isDemo}
          ref={rootRef}
          aria-pressed={pressed}
        >
          <svg className={styles.failIcon} viewBox="0 0 120 120" aria-hidden="true" ref={iconRef}>
            <circle className={styles.failRing} cx={60} cy={60} r={34} />
            <path className={styles.failMark} d="M46,46 L74,74 M74,46 L46,74" />
          </svg>
          <span className={styles.failLabel}>지문 인증</span>
        </button>
        <p className={styles.failStatus}>{status}</p>
      </div>
    </main>
  );
}
