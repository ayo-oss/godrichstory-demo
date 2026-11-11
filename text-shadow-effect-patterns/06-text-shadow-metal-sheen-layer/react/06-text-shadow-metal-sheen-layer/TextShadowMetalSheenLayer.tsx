// TextShadowMetalSheenLayer — vanilla 판(run/412/demo/06-text-shadow-metal-sheen-layer/index.html) 의 React 포트.
// 각도 값 하나로 SHEEN_LAYER_COUNT 층마다 밝기를 사인 곡선을 따라 다르게 겹친다.
// 각도가 돌면 밝은 띠가 층을 타고 흘러 금속 표면에 빛이 지나가는 것처럼 보인다.
import { useEffect, useRef, useState } from "react";
import styles from "./TextShadowMetalSheenLayer.module.scss";

type Box<T> = { current: T };

const SHEEN_LAYER_COUNT = 7;
const PERIOD_MS = 900;

function buildSheenShadow(angleDeg: number): string {
  const rad = (angleDeg * Math.PI) / 180;
  const parts: string[] = [];
  for (let i = 1; i <= SHEEN_LAYER_COUNT; i++) {
    const phase = rad + (i / SHEEN_LAYER_COUNT) * Math.PI * 1.4;
    const bright = (Math.sin(phase) + 1) / 2;
    const l = Math.round(22 + bright * 58);
    const y = (i * 6.8).toFixed(2);
    parts.push("0px " + y + "px 0 hsl(220 10% " + l + "%)");
  }
  return parts.join(", ");
}

export default function TextShadowMetalSheenLayer() {
  const wordRef = useRef<HTMLHeadingElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const t0Ref = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [demo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(angleDeg: number): void {
    const word = wordRef.current;
    const value = valueRef.current;
    if (!word || !value) return;
    word.style.textShadow = buildSheenShadow(angleDeg);
    value.textContent = Math.round(angleDeg % 360) + "deg";
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(90);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) % PERIOD_MS;
      const angle = (t / PERIOD_MS) * 360;
      render(angle);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  const cls = [styles.mt, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge}><span>광택 각도</span> <span ref={valueRef}>0deg</span></p>
        <h1 className={styles.word} ref={wordRef}>금속</h1>
      </div>
    </main>
  );
}
