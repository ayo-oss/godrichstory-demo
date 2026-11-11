// TextShadowHoverDepthLift — vanilla 판(run/412/demo/09-text-shadow-hover-depth-lift/index.html) 의 React 포트.
// 근접도 값(p 0~1) 하나로 그림자 오프셋·번짐 값을 함께 밀어 올린다. 포인터가 글자 위에
// 오르면 p 가 커지며 그림자 깊이가 늘고 글자가 살짝 떠오른다.
import { useEffect, useRef, useState } from "react";
import styles from "./TextShadowHoverDepthLift.module.scss";

type Box<T> = { current: T };

const HOVER_LIFT_PX = 4;
const LIFT_MULTIPLIER = 5;
const LERP = 0.18;
const PERIOD_MS = 1000;

function buildLiftShadow(p: number): string {
  const y = (p * HOVER_LIFT_PX * 1.6).toFixed(2);
  const y2 = (p * HOVER_LIFT_PX * LIFT_MULTIPLIER).toFixed(2);
  const blur = (4 + p * HOVER_LIFT_PX * 6.5).toFixed(1);
  return [
    "0px " + y + "px 0 rgba(10,79,232," + (0.55 + p * 0.3).toFixed(2) + ")",
    "0px " + y2 + "px " + blur + "px rgba(10,79,232," + (0.22 + p * 0.36).toFixed(2) + ")"
  ].join(", ");
}

export default function TextShadowHoverDepthLift() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const wordRef = useRef<HTMLHeadingElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const targetPRef = useRef<number>(0) as Box<number>;
  const curPRef = useRef<number>(0) as Box<number>;
  const hasPointerRef = useRef<boolean>(false) as Box<boolean>;
  const t0Ref = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [demo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(p: number): void {
    const word = wordRef.current;
    const value = valueRef.current;
    if (!word || !value) return;
    word.style.textShadow = buildLiftShadow(p);
    word.style.transform = "translateY(" + (-(p * HOVER_LIFT_PX * 1.2)).toFixed(2) + "px)";
    value.textContent = (p * HOVER_LIFT_PX).toFixed(1) + "px";
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(0);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      if (!hasPointerRef.current) {
        const t = (now - t0Ref.current) % PERIOD_MS;
        const phase = (Math.sin((t / PERIOD_MS) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
        targetPRef.current = phase;
      }
      curPRef.current += (targetPRef.current - curPRef.current) * LERP;
      render(curPRef.current);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  function onPointerEnter(): void {
    hasPointerRef.current = true;
    targetPRef.current = 1;
    if (reduce) { curPRef.current = 1; render(1); }
  }
  function onPointerLeave(): void {
    hasPointerRef.current = false;
    targetPRef.current = 0;
    if (reduce) { curPRef.current = 0; render(0); }
  }
  function onFocus(): void {
    hasPointerRef.current = true;
    targetPRef.current = 1;
    if (reduce) { curPRef.current = 1; render(1); }
  }
  function onBlur(): void {
    hasPointerRef.current = false;
    targetPRef.current = 0;
    if (reduce) { curPRef.current = 0; render(0); }
  }

  const cls = [styles.hv, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge}><span>떠오름 값</span> <span ref={valueRef}>0.0px</span></p>
        <div className={styles.scene} ref={sceneRef} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
          <h1 className={styles.word} ref={wordRef} tabIndex={0} onFocus={onFocus} onBlur={onBlur}>부상</h1>
        </div>
      </div>
    </main>
  );
}
