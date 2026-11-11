// SpringKnobDial — vanilla 판(run/374/demo/07-arc-knob-dial/index.html) 의 React 포트.
// 계산 겹: 감쇠 스프링(springStep) — 매 프레임 목표까지의 거리에 SPRING_K 를 곱해 가속하고
// 누적 속도에 SPRING_DAMP 를 곱해 서서히 잦아들게 해 목표를 넘겨 튕기게 한다.
import { useEffect, useRef, useState } from "react";
import styles from "./SpringKnobDial.module.scss";

type Box<T> = { current: T };

const SPRING_K = 0.18;
const SPRING_DAMP = 0.72;
const LOOP_MS = 2000;
const LEVELS = [10, 40, 70, 100];

export default function SpringKnobDial() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const knobRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rafRef = useRef(0) as unknown as Box<number>;
  const [level, setLevel] = useState(LEVELS[1]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    const knob = knobRef.current;
    if (!root || !knob) return;

    let isDemo = true;
    let levelIdx = 1;
    let scaleCur = 1;
    let scaleVel = 0;
    let scaleTarget = 1;
    let pressed = false;
    let releaseTimer = 0;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function springStep() {
      if (reduce) { scaleCur = scaleTarget; scaleVel = 0; return; }
      const force = (scaleTarget - scaleCur) * SPRING_K;
      scaleVel = (scaleVel + force) * SPRING_DAMP;
      scaleCur += scaleVel;
    }

    function apply() {
      knob!.style.setProperty("--scale", scaleCur.toFixed(4));
      setLevel(LEVELS[levelIdx]);
    }

    function press() { human(); pressed = true; scaleTarget = 0.86; }
    function release() {
      if (!pressed) return;
      pressed = false;
      levelIdx = (levelIdx + 1) % LEVELS.length;
      scaleTarget = 1.12;
      scaleVel += reduce ? 0 : 0.03;
      releaseTimer = window.setTimeout(function () { scaleTarget = 1; }, reduce ? 0 : 90);
    }

    function onDown() { press(); }
    function onUp() { release(); }
    function onLeave() { if (pressed) release(); }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); press(); release(); }
    }
    knob.addEventListener("pointerdown", onDown);
    knob.addEventListener("pointerup", onUp);
    knob.addEventListener("pointerleave", onLeave);
    knob.addEventListener("keydown", onKeydown);

    function loop(ts: number) {
      if (isDemo && !reduce) {
        const phase = (ts % LOOP_MS) / LOOP_MS;
        if (phase < 0.06) { scaleTarget = 0.86; }
        else if (phase < 0.12 && scaleTarget !== 1.12) {
          levelIdx = (levelIdx + 1) % LEVELS.length;
          scaleTarget = 1.12;
        } else if (phase >= 0.12 && phase < 0.2) { scaleTarget = 1; }
      } else if (isDemo && reduce) {
        scaleTarget = 1;
      }
      springStep();
      apply();
      rafRef.current = requestAnimationFrame(loop);
    }
    apply();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      knob.removeEventListener("pointerdown", onDown);
      knob.removeEventListener("pointerup", onUp);
      knob.removeEventListener("pointerleave", onLeave);
      knob.removeEventListener("keydown", onKeydown);
      window.clearTimeout(releaseTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.kd + " " + styles.isDemo} ref={rootRef}>
        <button className={styles.knob} ref={knobRef} type="button" aria-label="눌러서 밝기 다이얼 튕기기">
          <span className={styles.face} />
        </button>
        <p className={styles.value}>밝기 {level}%</p>
      </div>
    </main>
  );
}
