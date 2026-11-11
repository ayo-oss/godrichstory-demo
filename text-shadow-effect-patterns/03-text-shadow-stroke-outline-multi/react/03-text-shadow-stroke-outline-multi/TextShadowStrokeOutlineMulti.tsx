// TextShadowStrokeOutlineMulti — vanilla 판(run/412/demo/03-text-shadow-stroke-outline-multi/index.html) 의 React 포트.
// 값 d 하나를 여덟 방향(상하좌우+대각선)에 같은 거리만큼 겹쳐, 글자 채움 없이도
// 둘레에 윤곽선만 남는다. d 가 커질수록 윤곽선이 두꺼워진다.
import { useEffect, useRef, useState } from "react";
import styles from "./TextShadowStrokeOutlineMulti.module.scss";

type Box<T> = { current: T };

const OUTLINE_MAX_PX = 15;
const PERIOD_MS = 1000;
const DIRS: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071]
];

function buildOutlineShadow(d: number): string {
  const parts: string[] = [];
  for (let i = 0; i < DIRS.length; i++) {
    const x = (DIRS[i][0] * d).toFixed(2);
    const y = (DIRS[i][1] * d).toFixed(2);
    parts.push(x + "px " + y + "px 0 rgba(23,20,26,.92)");
  }
  return parts.join(", ");
}

export default function TextShadowStrokeOutlineMulti() {
  const wordRef = useRef<HTMLHeadingElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const t0Ref = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [demo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(d: number): void {
    const word = wordRef.current;
    const value = valueRef.current;
    if (!word || !value) return;
    word.style.textShadow = buildOutlineShadow(d);
    value.textContent = d.toFixed(1) + "px";
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(OUTLINE_MAX_PX);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) % PERIOD_MS;
      const phase = (Math.sin((t / PERIOD_MS) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      render(0.4 + (OUTLINE_MAX_PX - 0.4) * phase);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  const cls = [styles.ol, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge}><span>윤곽 두께</span> <span ref={valueRef}>0.5px</span></p>
        <h1 className={styles.word} ref={wordRef}>윤곽</h1>
      </div>
    </main>
  );
}
