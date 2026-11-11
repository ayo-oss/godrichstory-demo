// LerpBasics — vanilla 판(run/079/demo/01-follow-lerp-basics/index.html) 의 React 포트.
// 점이 커서를 lerp(0.16)로 쫓고, 잔상 세 개는 다시 점을 쫓게 해 지연을 프레임 차이로 보여 준다.
// 계수(0.16 · 0.10/0.065/0.04)와 잔상 순서는 vanilla 와 같은 값이다 (다시 타이핑하지 않는다).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LerpBasics.module.scss";

export type LerpBasicsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 전역 DOM 타입에 기대지 않는다 — 포인터 이벤트에서 실제로 읽는 것만 적는다
type PtrEvt = { clientX: number; clientY: number };

const FIELD_LABEL = "작은 커서 고리를 파란 점과 잔상 세 개가 한 박자 늦게 쫓는 그림";
const HINT = "마우스를 움직이면 점이 한 박자 늦게 따라옵니다";
// ghosts[0] 이 점 바로 뒤, ghosts[2] 가 가장 느리다 — 잔상 DOM 은 역순으로 섰다
const TRAIL_FACTORS = [0.10, 0.065, 0.04];

// lerp: 매 프레임 남은 거리의 일부만 더 가는 선형 보간 — factor 가 작을수록 한 박자 늦게 따라온다
function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

export default function LerpBasics({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: LerpBasicsProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement>;
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const dotRef = useRef<HTMLSpanElement | null>(null);
  const ghostRef = useRef<(HTMLSpanElement | null)[]>(new Array(3).fill(null)) as Box<(HTMLSpanElement | null)[]>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function setGhost(index: number) {
    return (el: HTMLSpanElement | null): void => {
      ghostRef.current[index] = el;
    };
  }

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const target = { x: 0, y: 0 };
    const dot = { x: 0, y: 0 };
    const trail = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];

    function setTarget(cx: number, cy: number): void {
      const r = field.getBoundingClientRect();
      target.x = cx - r.left;
      target.y = cy - r.top;
    }

    function draw(): void {
      const cursor = cursorRef.current;
      const dotEl = dotRef.current;
      if (cursor) cursor.style.transform = "translate3d(" + (target.x - 9) + "px," + (target.y - 9) + "px,0)";
      if (dotEl) dotEl.style.transform = "translate3d(" + (dot.x - 7) + "px," + (dot.y - 7) + "px,0)";
      for (let i = 0; i < trail.length; i++) {
        const ghost = ghostRef.current[i];
        if (ghost) ghost.style.transform = "translate3d(" + (trail[i].x - 5) + "px," + (trail[i].y - 5) + "px,0)";
      }
    }

    function tick(): void {
      dot.x = lerp(dot.x, target.x, 0.16);
      dot.y = lerp(dot.y, target.y, 0.16);
      let prev = dot;
      for (let i = 0; i < trail.length; i++) {
        trail[i].x = lerp(trail[i].x, prev.x, TRAIL_FACTORS[i]);
        trail[i].y = lerp(trail[i].y, prev.y, TRAIL_FACTORS[i]);
        prev = trail[i];
      }
      draw();
      raf = requestAnimationFrame(tick);
    }

    function start(): void {
      const r = field.getBoundingClientRect();
      const c = { x: r.width / 2, y: r.height / 2 };
      target.x = c.x;
      target.y = c.y;
      dot.x = c.x;
      dot.y = c.y;
      for (let i = 0; i < trail.length; i++) {
        trail[i].x = c.x;
        trail[i].y = c.y;
      }
    }

    function onMove(event: PtrEvt): void {
      setDemo(false);
      setTarget(event.clientX, event.clientY);
      if (reduce) {
        // 움직임을 줄이는 설정에서는 쫓기 없이 즉시 따라붙는다
        dot.x = target.x;
        dot.y = target.y;
        draw();
      }
    }
    // 터치 폴백: 손가락을 대면 그 지점을 쫓게 한다
    function onDown(event: PtrEvt): void {
      setDemo(false);
      setTarget(event.clientX, event.clientY);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);

    let raf = 0;
    start();
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + (demo ? " " + styles.isDemo : "")} style={vars}>
        <div className={styles.field} ref={fieldRef} role="img" aria-label={FIELD_LABEL}>
          <span className={styles.ghost + " " + styles.ghost3} aria-hidden="true" ref={setGhost(2)}></span>
          <span className={styles.ghost + " " + styles.ghost2} aria-hidden="true" ref={setGhost(1)}></span>
          <span className={styles.ghost + " " + styles.ghost1} aria-hidden="true" ref={setGhost(0)}></span>
          <span className={styles.dot} aria-hidden="true" ref={dotRef}></span>
          <span className={styles.cursor} aria-hidden="true" ref={cursorRef}></span>
        </div>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
