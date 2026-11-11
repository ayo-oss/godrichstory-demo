// DragRotateKnob — vanilla 판(run/374/demo/04-arc-drag-rotate/index.html) 의 React 포트.
// 계산 겹: 관성 감쇠(decayStep) — 놓은 순간의 속도가 매 프레임 DRAG_DECAY 배로 줄며 각도에 계속 더해진다.
// reduce 체크는 decayStep 안에 있어 isDemo 분기 밖에서도(실사용에서도) 그대로 적용된다.
import { useEffect, useRef, useState } from "react";
import styles from "./DragRotateKnob.module.scss";

type Box<T> = { current: T };

const DRAG_DECAY = 0.92;
const MIN_VELOCITY = 0.15;
const LOOP_MS = 2000;

export default function DragRotateKnob() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const ringRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const knobRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rafRef = useRef(0) as unknown as Box<number>;
  const [speedLabel, setSpeedLabel] = useState("속도: 0.0 도/프레임");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    const ring = ringRef.current;
    const knob = knobRef.current;
    if (!root || !ring || !knob) return;

    let isDemo = true;
    let angle = 0;
    let velocity = 0;
    let dragging = false;
    let lastAngle = 0;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function angleAt(clientX: number, clientY: number) {
      const r = ring!.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
    }
    function apply() {
      knob!.style.setProperty("--angle", String(angle));
      setSpeedLabel("속도: " + Math.abs(velocity).toFixed(1) + " 도/프레임");
    }

    function onDown(e: PointerEvent) {
      human();
      dragging = true;
      velocity = 0;
      lastAngle = angleAt(e.clientX, e.clientY);
      knob!.setPointerCapture(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (!dragging) return;
      const a = angleAt(e.clientX, e.clientY);
      let delta = a - lastAngle;
      if (delta > 180) delta -= 360; else if (delta < -180) delta += 360;
      angle += delta;
      velocity = reduce ? 0 : delta;
      lastAngle = a;
      apply();
    }
    function onUp() { dragging = false; }
    knob.addEventListener("pointerdown", onDown);
    knob.addEventListener("pointermove", onMove);
    knob.addEventListener("pointerup", onUp);
    knob.addEventListener("pointercancel", onUp);

    function decayStep() {
      if (dragging) return;
      if (reduce) { velocity = 0; return; }
      if (Math.abs(velocity) < MIN_VELOCITY) { velocity = 0; return; }
      velocity *= DRAG_DECAY;
      angle += velocity;
    }

    const demoVelocity = 26;
    function loop(ts: number) {
      if (isDemo) {
        if (!reduce) {
          const phase = (ts % LOOP_MS) / LOOP_MS;
          if (phase < 0.02) { velocity = demoVelocity; }
          decayStep();
        } else {
          angle = 0; velocity = 0;
        }
        apply();
      } else {
        decayStep();
        apply();
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    apply();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      knob.removeEventListener("pointerdown", onDown);
      knob.removeEventListener("pointermove", onMove);
      knob.removeEventListener("pointerup", onUp);
      knob.removeEventListener("pointercancel", onUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.dr + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.ring} ref={ringRef}>
          <button className={styles.knob} ref={knobRef} type="button" aria-label="드래그해서 볼륨 손잡이 돌리기" />
        </div>
        <p className={styles.hint}>{speedLabel}</p>
      </div>
    </main>
  );
}
