// RadialPulse — vanilla 판(run/371/demo/02-biometric-scan-radial-pulse/index.html) 의 React 포트.
// 계산 겹(감쇠 함수)은 useEffect 안에 있다: 펄스가 뜬 뒤 지난 시간(age)에 지수 감쇠식을 걸어
// 반지름은 PULSE_MAX_R 로 점근하고, 불투명도는 그 반지름 비율만큼 옅어진다.
import { useEffect, useRef, useState } from "react";
import styles from "./RadialPulse.module.scss";

type Box<T> = { current: T };

const STRINGS: Record<string, string> = { listening: "인증 대기 중", paused: "일시 정지됨" };

export default function RadialPulse() {
  const rootRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const ringRefs = useRef([]) as unknown as Box<SVGCircleElement[]>;
  const [status, setStatus] = useState(STRINGS.listening);
  const [pressed, setPressed] = useState(true);

  useEffect(() => {
    const PULSE_MAX_R = 40; // 변형 02: PULSE_MAX_R 40 → 70
    const TAU = 260;
    const LAUNCH_GAP = 550;
    const CUTOFF = TAU * 4.4;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const rings = ringRefs.current;
    if (!root || rings.length === 0) return;

    let isDemo = true;
    let listening = true;
    let slotCursor = 0;
    let lastLaunch = 0;
    let rafId = 0;
    const slots = rings.map((el) => ({ el, start: null as number | null }));

    function spawn(now: number) {
      const slot = slots[slotCursor % slots.length];
      slotCursor++;
      slot.start = now;
    }

    function tick() {
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot.start === null) continue;
        const age = performance.now() - slot.start;
        if (age > CUTOFF) {
          slot.start = null;
          slot.el.style.opacity = "0";
          continue;
        }
        const radius = PULSE_MAX_R * (1 - Math.exp(-age / TAU));
        const opacity = Math.max(0, 1 - radius / PULSE_MAX_R);
        slot.el.setAttribute("r", radius.toFixed(2));
        slot.el.style.opacity = opacity.toFixed(3);
      }
    }

    function human() { if (isDemo) { root.classList.remove(styles.isDemo); isDemo = false; } }

    function toggle() {
      listening = !listening;
      setPressed(listening);
      setStatus(listening ? STRINGS.listening : STRINGS.paused);
    }

    function onClick() { human(); toggle(); }
    function onKeyDown(e: KeyboardEvent) { if (e.key === " " || e.key === "Enter") human(); }
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);

    function loop(ts: number) {
      const active = listening && (isDemo ? !reduce : true);
      if (active && ts - lastLaunch >= LAUNCH_GAP) {
        lastLaunch = ts;
        spawn(ts);
      }
      tick();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.pulseWrap}>
        <button
          type="button"
          className={styles.pulse + " " + styles.isDemo}
          ref={rootRef}
          aria-pressed={pressed}
        >
          <svg className={styles.pulseIcon} viewBox="0 0 120 120" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <circle
                key={i}
                className={styles.pulseRing}
                cx={60}
                cy={60}
                r={0}
                ref={(el: SVGCircleElement | null) => { if (el) ringRefs.current[i] = el; }}
              />
            ))}
            <circle className={styles.pulseCore} cx={60} cy={60} r={14} />
            <path className={styles.pulseMark} d="M52,64 A8 8 0 0 1 68,64" />
          </svg>
          <span className={styles.pulseLabel}>인증 대기</span>
        </button>
        <p className={styles.pulseStatus}>{status}</p>
      </div>
    </main>
  );
}
