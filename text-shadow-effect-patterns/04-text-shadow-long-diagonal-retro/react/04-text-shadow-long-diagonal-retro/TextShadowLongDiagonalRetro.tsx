// TextShadowLongDiagonalRetro — vanilla 판(run/412/demo/04-text-shadow-long-diagonal-retro/index.html) 의 React 포트.
// 길이 값(len) 하나를 대각선 방향으로 1px 씩 반복해 그 값만큼 길게 늘어뜨린다.
import { useEffect, useRef, useState } from "react";
import styles from "./TextShadowLongDiagonalRetro.module.scss";

type Box<T> = { current: T };

const RETRO_MAX_LEN = 34;
const RETRO_MIN_LEN = 4;
const PERIOD_MS = 1000;

function buildRetroShadow(len: number): string {
  const parts: string[] = [];
  const n = Math.round(len);
  for (let i = 1; i <= n; i++) {
    parts.push(i + "px " + i + "px 0 rgba(10,79,232," + (0.9 - (i / n) * 0.35).toFixed(2) + ")");
  }
  return parts.join(", ");
}

export default function TextShadowLongDiagonalRetro() {
  const wordRef = useRef<HTMLHeadingElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const t0Ref = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [demo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(len: number): void {
    const word = wordRef.current;
    const value = valueRef.current;
    if (!word || !value) return;
    word.style.textShadow = buildRetroShadow(len);
    value.textContent = Math.round(len) + "px";
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(RETRO_MAX_LEN);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) % PERIOD_MS;
      const phase = (Math.sin((t / PERIOD_MS) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      render(RETRO_MIN_LEN + (RETRO_MAX_LEN - RETRO_MIN_LEN) * phase);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  const cls = [styles.rt, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge}><span>그림자 길이</span> <span ref={valueRef}>4px</span></p>
        <h1 className={styles.word} ref={wordRef}>레트로</h1>
      </div>
    </main>
  );
}
