// TextShadowStackExtrude3D — vanilla 판(run/412/demo/01-text-shadow-stack-extrude-3d/index.html) 의 React 포트.
// 값(step) 하나로 SHADOW_LAYER_COUNT 층의 그림자를 조립한다. step 이 작을 때는 얇은 입체,
// 클 때는 층이 겹겹이 쌓여 두꺼운 입체로 보인다.
import { useEffect, useRef, useState } from "react";
import styles from "./TextShadowStackExtrude3D.module.scss";

type Box<T> = { current: T };

const SHADOW_LAYER_COUNT = 6;
const STEP_MIN_PX = 1;
const STEP_MAX_PX = 15;
const PERIOD_MS = 1000;

function extrudeColor(i: number, n: number): string {
  const t = i / n;
  const l = Math.max(6, Math.round(24 - t * 16));
  return "hsl(232 14% " + l + "%)";
}

function buildExtrudeShadow(step: number): string {
  const parts: string[] = [];
  for (let i = 1; i <= SHADOW_LAYER_COUNT; i++) {
    const d = (i * step).toFixed(2);
    parts.push(d + "px " + d + "px 0 " + extrudeColor(i, SHADOW_LAYER_COUNT));
  }
  return parts.join(", ");
}

export default function TextShadowStackExtrude3D() {
  const wordRef = useRef<HTMLHeadingElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const t0Ref = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [demo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(step: number): void {
    const word = wordRef.current;
    const value = valueRef.current;
    if (!word || !value) return;
    word.style.textShadow = buildExtrudeShadow(step);
    value.textContent = step.toFixed(1) + "px";
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(STEP_MAX_PX);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) % PERIOD_MS;
      const phase = (Math.sin((t / PERIOD_MS) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      render(STEP_MIN_PX + (STEP_MAX_PX - STEP_MIN_PX) * phase);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  const cls = [styles.ex, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge}><span>돌출 깊이</span> <span ref={valueRef}>1.0px</span></p>
        <h1 className={styles.word} ref={wordRef}>돌출</h1>
      </div>
    </main>
  );
}
