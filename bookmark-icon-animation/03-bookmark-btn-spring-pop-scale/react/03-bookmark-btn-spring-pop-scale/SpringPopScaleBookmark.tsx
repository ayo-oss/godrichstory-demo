// SpringPopScaleBookmark — vanilla 판(run/416/demo/03-bookmark-btn-spring-pop-scale/index.html) 의 React 포트.
// 스프링 방정식(강성·감쇠)을 매 프레임 적분한 위치가 버튼 scale 이 된다. 누르는 순간 속도를 한 번 차 넣으면
// 스프링이 목표를 BOOKMARK_SPRING_OVERSHOOT_PERCENT 만큼 넘겼다가 되돌아온다.
import { useEffect, useRef, useState } from "react";
import styles from "./SpringPopScaleBookmark.module.scss";

type Box<T> = { current: T };

const BOOKMARK_SPRING_OVERSHOOT_PERCENT = 12;
const SPRING_STIFFNESS = 210;
const SPRING_DAMPING = 18;
const SPRING_KICK_VELOCITY = 7.4;
const CYCLE_S = 2;
const MAX_SCALE = 1 + BOOKMARK_SPRING_OVERSHOOT_PERCENT / 100;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function SpringPopScaleBookmark() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const posRef = useRef<number>(1) as Box<number>;
  const velRef = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [saved, setSaved] = useState(false);
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(p: number): void {
    const btn = btnRef.current;
    const scene = sceneRef.current;
    if (!btn || !scene) return;
    btn.style.transform = "scale(" + p.toFixed(4) + ")";
    const tone = clamp(p - 1, 0, MAX_SCALE - 1) / (MAX_SCALE - 1);
    scene.style.setProperty("--tone", tone.toFixed(3));
  }

  function integrate(dt: number): void {
    const accel = SPRING_STIFFNESS * (1 - posRef.current) - SPRING_DAMPING * velRef.current;
    velRef.current += accel * dt;
    posRef.current += velRef.current * dt;
    if (posRef.current > MAX_SCALE) { posRef.current = MAX_SCALE; velRef.current *= -0.35; }
    if (posRef.current < 1 && velRef.current < 0 && Math.abs(posRef.current - 1) < 0.001 && Math.abs(velRef.current) < 0.01) {
      posRef.current = 1; velRef.current = 0;
    }
  }

  function kick(): void {
    velRef.current += SPRING_KICK_VELOCITY;
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    let lastNow = 0;
    let start = 0;
    let prevT = 0;
    let toggledA = false;
    let toggledB = false;
    function loop(now: number): void {
      if (start === 0) { start = now; lastNow = now; }
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;
      const t = ((now - start) / 1000) % CYCLE_S;
      if (t < prevT) { toggledA = false; toggledB = false; }
      prevT = t;
      if (!reduce && demo) {
        if (!toggledA && t > 0.3) { toggledA = true; setSaved(true); kick(); }
        if (!toggledB && t > 1.3) { toggledB = true; setSaved(false); kick(); }
      }
      if (reduce) {
        posRef.current = 1; velRef.current = 0;
      } else {
        integrate(dt);
      }
      render(posRef.current);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce, demo]);

  function onClick(): void {
    setDemo(false);
    setSaved(!saved);
    kick();
  }

  return (
    <main className={styles.stage}>
      <div className={styles.sp}>
        <p className={styles.caption}>스프링으로 튕겨 커지는 북마크 버튼</p>
        <div className={styles.scene} ref={sceneRef}>
          <button className={styles.btn} ref={btnRef} type="button" aria-pressed={saved} onClick={onClick}>
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
