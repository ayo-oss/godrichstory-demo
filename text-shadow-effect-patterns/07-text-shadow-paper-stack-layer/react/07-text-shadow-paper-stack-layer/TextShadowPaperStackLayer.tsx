// TextShadowPaperStackLayer — vanilla 판(run/412/demo/07-text-shadow-paper-stack-layer/index.html) 의 React 포트.
// 층 값(n) 하나로 색·거리 값이 다른 종이 층을 n 장 쌓는다 — n 이 늘수록 종이가
// 여러 장 겹친 것처럼 보인다.
import { useEffect, useRef, useState } from "react";
import styles from "./TextShadowPaperStackLayer.module.scss";

type Box<T> = { current: T };

const PAPER_LAYER_COUNT = 6;
const OFFSET_STEP_PX = 12;
const PERIOD_MS = 1000;

function buildPaperShadow(n: number): string {
  const parts: string[] = [];
  for (let i = 1; i <= n; i++) {
    const d = (i * OFFSET_STEP_PX).toFixed(2);
    const warm = i % 2 === 0;
    const sheet = warm ? "rgba(255,247,230,.92)" : "rgba(246,238,222,.92)";
    parts.push(d + "px " + d + "px 0 " + sheet);
    parts.push(d + "px " + (Number(d) + 1.4).toFixed(2) + "px 2px rgba(23,20,26," + (0.22 - i * 0.02).toFixed(2) + ")");
  }
  return parts.join(", ");
}

export default function TextShadowPaperStackLayer() {
  const wordRef = useRef<HTMLHeadingElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const t0Ref = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [demo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(n: number): void {
    const word = wordRef.current;
    const value = valueRef.current;
    if (!word || !value) return;
    word.style.textShadow = buildPaperShadow(n);
    value.textContent = String(n);
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(PAPER_LAYER_COUNT);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) % PERIOD_MS;
      const phase = (Math.sin((t / PERIOD_MS) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      const n = 1 + Math.round(phase * (PAPER_LAYER_COUNT - 1));
      render(n);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  const cls = [styles.pp, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge}><span>종이 층</span> <span ref={valueRef}>1</span></p>
        <h1 className={styles.word} ref={wordRef}>종이</h1>
      </div>
    </main>
  );
}
