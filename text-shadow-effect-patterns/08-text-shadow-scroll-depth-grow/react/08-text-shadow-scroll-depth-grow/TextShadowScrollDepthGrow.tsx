// TextShadowScrollDepthGrow — vanilla 판(run/412/demo/08-text-shadow-scroll-depth-grow/index.html) 의 React 포트.
// 스크롤 진행 값(ratio 0~1) 하나를 그림자 거리 값에 그대로 이어, 내려갈수록 그림자가 자란다.
import { useEffect, useRef, useState } from "react";
import styles from "./TextShadowScrollDepthGrow.module.scss";

type Box<T> = { current: T };

const SCROLL_MAX_PX = 26;
const PERIOD_MS = 1000;

function buildScrollShadow(ratio: number): string {
  const d = (ratio * SCROLL_MAX_PX).toFixed(2);
  return [
    (Number(d) * 0.4).toFixed(2) + "px " + d + "px 0 rgba(10,79,232,.5)",
    (Number(d) * 0.4).toFixed(2) + "px " + (Number(d) * 2).toFixed(2) + "px " + (4 + ratio * 10).toFixed(1) + "px rgba(10,79,232," + (0.28 + ratio * 0.3).toFixed(2) + ")"
  ].join(", ");
}

export default function TextShadowScrollDepthGrow() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const wordRef = useRef<HTMLHeadingElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const t0Ref = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const hasUserRef = useRef<boolean>(false) as Box<boolean>;
  const [demo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(ratio: number): void {
    const word = wordRef.current;
    const value = valueRef.current;
    if (!word || !value) return;
    word.style.textShadow = buildScrollShadow(ratio);
    value.textContent = Math.round(ratio * 100) + "%";
  }

  function ratioFromScroll(): number {
    const viewport = viewportRef.current;
    if (!viewport) return 0;
    const max = viewport.scrollHeight - viewport.clientHeight;
    return max > 0 ? Math.max(0, Math.min(1, viewport.scrollTop / max)) : 0;
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    render(0);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    function onScroll(): void {
      render(ratioFromScroll());
    }
    function onUser(): void {
      hasUserRef.current = true;
    }
    viewport.addEventListener("scroll", onScroll);
    viewport.addEventListener("wheel", onUser, { passive: true });
    viewport.addEventListener("touchstart", onUser, { passive: true });
    viewport.addEventListener("keydown", onUser);
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      viewport.removeEventListener("wheel", onUser);
      viewport.removeEventListener("touchstart", onUser);
      viewport.removeEventListener("keydown", onUser);
    };
  }, []);

  useEffect(() => {
    if (reduce) return;
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const viewport = viewportRef.current;
      if (viewport && !hasUserRef.current) {
        const t = (now - t0Ref.current) % PERIOD_MS;
        const phase = (Math.sin((t / PERIOD_MS) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
        const max = viewport.scrollHeight - viewport.clientHeight;
        viewport.scrollTop = phase * max;
      }
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  const cls = [styles.sc, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge}><span>스크롤 진행</span> <span ref={valueRef}>0%</span></p>
        <div className={styles.viewport} ref={viewportRef} tabIndex={0}>
          <div className={styles.track}>
            <h1 className={styles.word} ref={wordRef}>깊이</h1>
            <div className={styles.spacer} aria-hidden="true" />
          </div>
        </div>
        <p className={styles.hint}>휠·방향키로 내려 본다</p>
      </div>
    </main>
  );
}
