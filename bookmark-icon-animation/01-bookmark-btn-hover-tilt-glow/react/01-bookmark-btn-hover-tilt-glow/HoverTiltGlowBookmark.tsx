// HoverTiltGlowBookmark — vanilla 판(run/416/demo/01-bookmark-btn-hover-tilt-glow/index.html) 의 React 포트.
// 값 하나: 포인터 벡터(dx,dy) → 각도. 그 각도가 버튼 기울기(rotateX/rotateY)와 광택 sweep 위치(conic-gradient)를 함께 정한다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./HoverTiltGlowBookmark.module.scss";

type Box<T> = { current: T };

const TILT_MAX_DEG = 14;
const GLOW_RADIUS_PX = 150;
const CYCLE_S = 2;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function HoverTiltGlowBookmark() {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const hasPointerRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [saved, setSaved] = useState(false);
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function applyVector(dx: number, dy: number): void {
    const btn = btnRef.current;
    const glow = glowRef.current;
    if (!btn || !glow) return;
    const dist = Math.hypot(dx, dy);
    const strength = clamp(1 - dist / GLOW_RADIUS_PX, 0, 1);
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const tiltX = clamp(-dy / GLOW_RADIUS_PX, -1, 1) * TILT_MAX_DEG * strength;
    const tiltY = clamp(dx / GLOW_RADIUS_PX, -1, 1) * TILT_MAX_DEG * strength;
    btn.style.transform = "perspective(600px) rotateX(" + tiltX.toFixed(2) + "deg) rotateY(" + tiltY.toFixed(2) + "deg)";
    glow.style.setProperty("--glow-deg", angleDeg.toFixed(1) + "deg");
    glow.style.setProperty("--glow-strength", strength.toFixed(3));
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      applyVector(0, 0);
      return;
    }
    let start = 0;
    let prevT = 0;
    let toggledA = false;
    let toggledB = false;
    function loop(now: number): void {
      if (start === 0) start = now;
      const t = ((now - start) / 1000) % CYCLE_S;
      if (t < prevT) { toggledA = false; toggledB = false; }
      prevT = t;
      if (!hasPointerRef.current && demo) {
        const ang = (t / CYCLE_S) * Math.PI * 2;
        const x = Math.cos(ang) * 120;
        const y = Math.sin(ang) * 70;
        applyVector(x, y);
        if (!toggledA && t > 0.45) { toggledA = true; setSaved(true); }
        if (!toggledB && t > 1.45) { toggledB = true; setSaved(false); }
      }
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce, demo]);

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    hasPointerRef.current = true;
    setDemo(false);
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    applyVector(event.clientX - cx, event.clientY - cy);
  }

  function onPointerLeave(): void {
    hasPointerRef.current = false;
    applyVector(0, 0);
  }

  function onFocus(): void {
    applyVector(0, -GLOW_RADIUS_PX * 0.4);
  }

  function onBlur(): void {
    if (!hasPointerRef.current) applyVector(0, 0);
  }

  function onClick(): void {
    setDemo(false);
    setSaved(!saved);
  }

  return (
    <main className={styles.stage}>
      <div className={styles.rb}>
        <p className={styles.caption}>호버로 살짝 기울며 빛나는 북마크 아이콘</p>
        <div className={styles.zone} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <div className={styles.glow} aria-hidden="true" ref={glowRef} />
          <button className={styles.btn} ref={btnRef} type="button" aria-pressed={saved} onFocus={onFocus} onBlur={onBlur} onClick={onClick}>
            <svg className={styles.icon} viewBox="0 0 24 24" width={30} height={30} aria-hidden="true" focusable="false">
              <path className={styles.shape} d="M6.5 3A1.5 1.5 0 0 1 8 1.5h8A1.5 1.5 0 0 1 17.5 3v18.2a.9.9 0 0 1-1.38.76L12 19.1l-4.12 2.86A.9.9 0 0 1 6.5 21.2Z" />
            </svg>
          </button>
        </div>
        <p className={styles.status} aria-live="polite">{saved ? "저장됨" : "저장 전"}</p>
      </div>
    </main>
  );
}
