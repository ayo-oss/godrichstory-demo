// IsometricPointerParallaxTilt — vanilla 판(run/333/demo/05-isometric-pointer-parallax-tilt/index.html)
// 의 React 포트. 등각 기본 각도(-35.264deg) 위에 포인터 위치를 clamp() 로 가둔 만큼만
// 덧기울인다. 손을 떼면 자동 경로(sin/cos)로 같은 보간을 계속한다.
import { useEffect, useRef } from "react";
import styles from "./IsometricPointerParallaxTilt.module.scss";

export type IsometricPointerParallaxTiltProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "등각 기본 각도 위에 포인터 위치를 clamp() 로 가둔 만큼만 더 기울입니다 — 손을 떼면 자동으로 훑습니다";
const ARIA_FIELD = "포인터를 올리면 등각 장면이 시차만큼 기울고, 손을 떼면 자동으로 훑는 장면";
const LABEL_TILT = "기울임 x ";

const TILT = -35.264;
const LIMIT = 9;
const IDLE_MS = 1100;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export default function IsometricPointerParallaxTilt({
  duration = "600ms",
  easing = "ease-out",
  color = "#5b8cf8"
}: IsometricPointerParallaxTiltProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const tiltXRef = useRef<HTMLElement | null>(null);
  const stateRef = useRef({
    targetX: 0,
    targetY: 0,
    curX: 0,
    curY: 0,
    lastInput: -Infinity
  }) as Box<{ targetX: number; targetY: number; curX: number; curY: number; lastInput: number }>;
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const field = fieldRef.current;
    const tilt = tiltRef.current;
    const root = rootRef.current;
    if (!field || !tilt || !root) return;

    function onMove(e: PointerEvent): void {
      if (!field) return;
      const rect = field.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      stateRef.current.targetX = clamp(nx * LIMIT * 2, -LIMIT, LIMIT);
      stateRef.current.targetY = clamp(ny * LIMIT * 2, -LIMIT, LIMIT);
      stateRef.current.lastInput = performance.now();
    }
    function onLeave(): void {
      stateRef.current.lastInput = -Infinity;
    }
    field.addEventListener("pointermove", onMove);
    field.addEventListener("pointerleave", onLeave);

    function autoPath(t: number): { x: number; y: number } {
      return { x: Math.sin(t * 0.6) * LIMIT * 0.85, y: Math.cos(t * 0.42) * LIMIT };
    }

    function paint(now: number, t: number): void {
      const s = stateRef.current;
      const idle = now - s.lastInput > IDLE_MS;
      if (idle) {
        const p = autoPath(t);
        s.targetX = p.x;
        s.targetY = p.y;
      }
      s.curX += (s.targetX - s.curX) * 0.16;
      s.curY += (s.targetY - s.curY) * 0.16;
      tilt!.style.transform =
        "rotateX(" + (TILT + s.curY).toFixed(3) + "deg) rotateY(" + s.curX.toFixed(3) + "deg)";
      if (tiltXRef.current) tiltXRef.current.textContent = s.curX.toFixed(1);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      paint(0, 0.8);
      root.classList.add(styles.isStill);
    } else {
      const start = performance.now();
      const step = (now: number): void => {
        paint(now, (now - start) / 1000);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      field.removeEventListener("pointermove", onMove);
      field.removeEventListener("pointerleave", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.pt} ref={rootRef} data-duration={duration} data-easing={easing} data-color={color}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.field} ref={fieldRef} role="img" aria-label={ARIA_FIELD} tabIndex={0}>
          <div className={styles.tilt} ref={tiltRef}>
            <div className={styles.grid3}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={styles.block}></div>
              ))}
            </div>
          </div>
        </div>
        <p className={styles.meta}>
          <span className={styles.metaLabel}>{LABEL_TILT}</span>
          <b className={styles.tiltVal} ref={tiltXRef}>0.0</b>
        </p>
      </div>
    </main>
  );
}
