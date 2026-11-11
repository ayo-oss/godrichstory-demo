// PressSpringButton — vanilla 판(run/393/demo/06-pointer-tilt-3d-press-release-spring/index.html) 의 React 포트.
// 누르고 있던 시간을 눌림 깊이(0~1)로 바꾸고, 놓는 순간 그 깊이로 스프링 감쇠(damping)를 정해
// velocity·damping 한 식으로 관성과 오버슛을 만든다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./PressSpringButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const PERIOD = 2.4;
const STIFFNESS = 0.28;
const DAMP_BASE = 0.6;
const DAMP_DEPTH_RANGE = 0.32;
const PRESS_DEPTH_CAP = 480;
const MAX_DEG = 6;
const LERP = 0.16;
const LABEL = "제출하기 — 누른 깊이만큼 스프링으로 튕겨 돌아오는 버튼";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function syntheticTarget(t: number): [number, number] {
  return [Math.sin(t * 0.7 + 1.1), Math.sin(t * 0.5)];
}
function syntheticHold(t: number): boolean {
  const cycle = Math.floor(t / PERIOD);
  const phase = t - cycle * PERIOD;
  const holdFrac = 0.14 + 0.18 * (0.5 + 0.5 * Math.sin(cycle * 1.7));
  return phase < PERIOD * holdFrac;
}

export default function PressSpringButton() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const targetXRef = useRef<number>(0) as Box<number>;
  const targetYRef = useRef<number>(0) as Box<number>;
  const curXRef = useRef<number>(0) as Box<number>;
  const curYRef = useRef<number>(0) as Box<number>;
  const hasPointerRef = useRef<boolean>(false) as Box<boolean>;
  const pressedRealRef = useRef<boolean>(false) as Box<boolean>;
  const wasHeldRef = useRef<boolean>(false) as Box<boolean>;
  const pressStartRef = useRef<number>(0) as Box<number>;
  const dampingRef = useRef<number>(DAMP_BASE) as Box<number>;
  const aimZRef = useRef<number>(0) as Box<number>;
  const curZRef = useRef<number>(0) as Box<number>;
  const velZRef = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const t0Ref = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(nx: number, ny: number, z: number): void {
    const btn = btnRef.current;
    if (!btn) return;
    const rotY = nx * MAX_DEG;
    const rotX = -ny * MAX_DEG;
    btn.style.transform = "rotateX(" + rotX.toFixed(2) + "deg) rotateY(" + rotY.toFixed(2) + "deg) translateZ(" + z.toFixed(2) + "px)";
    const shadowScale = clamp(1 + z / 60, 0.35, 1.25);
    btn.style.boxShadow = "0 " + (14 * shadowScale).toFixed(1) + "px " + (24 * shadowScale).toFixed(1) + "px rgba(23,20,26,.30)";
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(0.3, 0.2, -14);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) / 1000;
      let heldSynthetic = false;
      if (!hasPointerRef.current) {
        const s = syntheticTarget(t);
        targetXRef.current = s[0];
        targetYRef.current = s[1];
        heldSynthetic = syntheticHold(t);
      }
      const held = pressedRealRef.current || heldSynthetic;
      if (held && !wasHeldRef.current) {
        pressStartRef.current = now;
      }
      if (!held && wasHeldRef.current) {
        const heldMs = now - pressStartRef.current;
        const depth = clamp(heldMs / PRESS_DEPTH_CAP, 0, 1);
        dampingRef.current = DAMP_BASE + depth * DAMP_DEPTH_RANGE;
      }
      wasHeldRef.current = held;
      aimZRef.current = held ? -14 : 0;

      curXRef.current += (targetXRef.current - curXRef.current) * LERP;
      curYRef.current += (targetYRef.current - curYRef.current) * LERP;
      velZRef.current = (velZRef.current + (aimZRef.current - curZRef.current) * STIFFNESS) * dampingRef.current;
      curZRef.current += velZRef.current;
      render(curXRef.current, curYRef.current, curZRef.current);
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
    pressedRealRef.current = false;
  }

  function onPointerDown(): void {
    setDemo(false);
    hasPointerRef.current = true;
    pressedRealRef.current = true;
    if (reduce) render(targetXRef.current, targetYRef.current, -14);
  }

  function onPointerUp(): void {
    pressedRealRef.current = false;
    if (reduce) render(targetXRef.current, targetYRef.current, 0);
  }

  function onKeyDown(event: KeyEvt): void {
    if (event.key === " " || event.key === "Enter") {
      setDemo(false);
      hasPointerRef.current = true;
      pressedRealRef.current = true;
      if (reduce) render(targetXRef.current, targetYRef.current, -14);
    }
  }

  function onKeyUp(event: KeyEvt): void {
    if (event.key === " " || event.key === "Enter") {
      pressedRealRef.current = false;
      if (reduce) render(targetXRef.current, targetYRef.current, 0);
    }
  }

  const cls = [styles.pj, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.hint}>
          <span>누르고 있던 시간이 눌림 깊이가 되어, 놓으면 그 깊이만큼 스프링 감쇠가 달라집니다</span>
        </p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <button
            className={styles.btn}
            ref={btnRef}
            type="button"
            aria-label={LABEL}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
          >
            <span className={styles.label}>제출하기</span>
          </button>
        </div>
      </div>
    </main>
  );
}
