// TextShadowGlitchRgbSplit — vanilla 판(run/412/demo/05-text-shadow-glitch-rgb-split/index.html) 의 React 포트.
// 값(mag) 하나를 고정 시드 PRNG 로 흔들어 빨강·파랑 그림자를 반대 방향으로 벌린다.
// 클릭하면 시드를 새로 돌려 다시 깨진다.
import { useEffect, useRef, useState } from "react";
import styles from "./TextShadowGlitchRgbSplit.module.scss";

type Box<T> = { current: T };

const GLITCH_SPLIT_PX = 2;
const BURST_PX = GLITCH_SPLIT_PX * 14;
const PULSE_MS = 480;

function seedRand(s: number): () => number {
  let state = s;
  return function () {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function buildGlitchShadow(mag: number, rnd: () => number): string {
  const rx = (mag * (rnd() * 2 - 1)).toFixed(2);
  const ry = (mag * 0.28 * (rnd() * 2 - 1)).toFixed(2);
  const bx = (-mag * (rnd() * 2 - 1)).toFixed(2);
  const by = (-mag * 0.28 * (rnd() * 2 - 1)).toFixed(2);
  return [
    rx + "px " + ry + "px 0 rgba(255,54,96,.88)",
    bx + "px " + by + "px 0 rgba(58,164,255,.88)"
  ].join(", ");
}

export default function TextShadowGlitchRgbSplit() {
  const wordRef = useRef<HTMLButtonElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const t0Ref = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const seedRef = useRef<number>(11) as Box<number>;
  const rndRef = useRef<() => number>(seedRand(11)) as Box<() => number>;
  const burstUntilRef = useRef<number>(0) as Box<number>;
  const [reduce, setReduce] = useState(false);

  function render(mag: number): void {
    const word = wordRef.current;
    const value = valueRef.current;
    if (!word || !value) return;
    word.style.textShadow = buildGlitchShadow(mag, rndRef.current);
    value.textContent = mag.toFixed(1) + "px";
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(GLITCH_SPLIT_PX);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) % PULSE_MS;
      const tri = Math.abs((t / PULSE_MS) * 2 - 1);
      let mag = GLITCH_SPLIT_PX * (0.3 + tri * 9.5);
      if (now < burstUntilRef.current) mag = BURST_PX;
      render(mag);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  function onClick(): void {
    seedRef.current = (seedRef.current * 977 + 313) & 0x7fffffff;
    rndRef.current = seedRand(seedRef.current || 1);
    burstUntilRef.current = performance.now() + 220;
    if (reduce) render(BURST_PX);
  }

  return (
    <main className={styles.stage}>
      <div className={[styles.gl, styles.isDemo].join(" ")}>
        <p className={styles.badge}><span>분리 거리</span> <span ref={valueRef}>0.0px</span></p>
        <button type="button" className={styles.word} ref={wordRef} onClick={onClick}>글리치</button>
        <p className={styles.hint}>클릭하면 다시 깨진다</p>
      </div>
    </main>
  );
}
