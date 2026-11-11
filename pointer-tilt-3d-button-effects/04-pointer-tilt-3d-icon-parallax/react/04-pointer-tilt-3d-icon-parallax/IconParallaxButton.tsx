// IconParallaxButton — vanilla 판(run/393/demo/04-pointer-tilt-3d-icon-parallax/index.html) 의 React 포트.
// 같은 정규화 좌표를 아이콘 층과 글자 층에 서로 다른 배수로 곱해 두 층이 다른 속도로 움직이는
// 시차(parallax) 를 만든다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./IconParallaxButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const ICON_DEPTH = 22;
const LABEL_DEPTH = 8;
const LERP = 0.17;
const LABEL = "다운로드 — 아이콘이 앞층에서 시차로 움직이는 버튼";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function syntheticTarget(t: number): [number, number] {
  return [Math.sin(t * 1.05), Math.sin(t * 0.7 + 2.1)];
}

export default function IconParallaxButton() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const iconRef = useRef<HTMLSpanElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const targetXRef = useRef<number>(0) as Box<number>;
  const targetYRef = useRef<number>(0) as Box<number>;
  const curXRef = useRef<number>(0) as Box<number>;
  const curYRef = useRef<number>(0) as Box<number>;
  const hasPointerRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const t0Ref = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(nx: number, ny: number): void {
    const btn = btnRef.current;
    const icon = iconRef.current;
    const label = labelRef.current;
    if (!btn || !icon || !label) return;
    btn.style.transform = "rotateX(" + (-ny * 8).toFixed(2) + "deg) rotateY(" + (nx * 8).toFixed(2) + "deg)";
    icon.style.transform = "translate3d(" + (nx * ICON_DEPTH).toFixed(1) + "px, " + (ny * ICON_DEPTH).toFixed(1) + "px, 0)";
    label.style.transform = "translate3d(" + (nx * LABEL_DEPTH).toFixed(1) + "px, " + (ny * LABEL_DEPTH).toFixed(1) + "px, 0)";
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(0.3, -0.5);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) / 1000;
      if (!hasPointerRef.current) {
        const s = syntheticTarget(t);
        targetXRef.current = s[0];
        targetYRef.current = s[1];
      }
      curXRef.current += (targetXRef.current - curXRef.current) * LERP;
      curYRef.current += (targetYRef.current - curYRef.current) * LERP;
      render(curXRef.current, curYRef.current);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  function pointFromEvent(event: ReactPointerEvent<HTMLDivElement>): [number, number] {
    const scene = sceneRef.current;
    if (!scene) return [0, 0];
    const r = scene.getBoundingClientRect();
    const nx = ((event.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((event.clientY - r.top) / r.height) * 2 - 1;
    return [clamp(nx, -1, 1), clamp(ny, -1, 1)];
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    hasPointerRef.current = true;
    setDemo(false);
    const p = pointFromEvent(event);
    targetXRef.current = p[0];
    targetYRef.current = p[1];
  }

  function onPointerLeave(): void {
    hasPointerRef.current = false;
    targetXRef.current = 0;
    targetYRef.current = 0;
  }

  function onClick(): void {
    setDemo(false);
    hasPointerRef.current = true;
    targetYRef.current = -1;
    if (reduce) render(targetXRef.current, targetYRef.current);
    window.setTimeout(() => {
      if (!hasPointerRef.current) {
        targetXRef.current = 0;
        targetYRef.current = 0;
        if (reduce) render(targetXRef.current, targetYRef.current);
      }
    }, 260);
  }

  function onKeyDown(event: KeyEvt): void {
    const step = 0.24;
    const moves: { [key: string]: [number, number] } = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const m = moves[event.key];
    if (!m) return;
    event.preventDefault();
    setDemo(false);
    hasPointerRef.current = true;
    targetXRef.current = clamp(targetXRef.current + m[0], -1, 1);
    targetYRef.current = clamp(targetYRef.current + m[1], -1, 1);
    if (reduce) render(targetXRef.current, targetYRef.current);
  }

  const cls = [styles.ip, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.hint}>
          <span>같은 좌표를 층마다 다른 배수로 곱해 아이콘이 글자보다 더 크게 움직입니다</span>
        </p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <button className={styles.btn} ref={btnRef} type="button" aria-label={LABEL} onClick={onClick} onKeyDown={onKeyDown}>
            <span className={styles.icon} ref={iconRef} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="22" height="22">
                <g fill="currentColor">
                  <path
                    d="M184 120v61.65a8 8 0 0 1-2.34 5.65l-34.35 34.35a8 8 0 0 1-13.57-4.53L128 176Zm-48-48H74.35a8 8 0 0 0-5.65 2.34l-34.35 34.35a8 8 0 0 0 4.53 13.57L80 128ZM40 216c37.65 0 50.69-19.69 54.56-28.18l-26.38-26.38C59.69 165.31 40 178.35 40 216"
                    opacity=".35"
                  />
                  <path d="M223.85 47.12a16 16 0 0 0-15-15c-12.58-.75-44.73.4-71.41 27.07L132.69 64H74.36A15.9 15.9 0 0 0 63 68.68L28.7 103a16 16 0 0 0 9.07 27.16l38.47 5.37l44.21 44.21l5.37 38.49a15.94 15.94 0 0 0 10.78 12.92a16.1 16.1 0 0 0 5.1.83a15.9 15.9 0 0 0 11.3-4.68l34.32-34.3a15.9 15.9 0 0 0 4.68-11.36v-58.33l4.77-4.77c26.68-26.68 27.83-58.83 27.08-71.42M74.36 80h42.33l-39.53 39.52L40 114.34Zm74.41-9.45a76.65 76.65 0 0 1 59.11-22.47a76.46 76.46 0 0 1-22.42 59.16L128 164.68L91.32 128ZM176 181.64L141.67 216l-5.19-37.17L176 139.31Zm-74.16 9.5C97.34 201 82.29 224 40 224a8 8 0 0 1-8-8c0-42.29 23-57.34 32.86-61.85a8 8 0 0 1 6.64 14.56c-6.43 2.93-20.62 12.36-23.12 38.91c26.55-2.5 36-16.69 38.91-23.12a8 8 0 1 1 14.56 6.64Z" />
                </g>
              </svg>
            </span>
            <span className={styles.label} ref={labelRef}>
              다운로드
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
