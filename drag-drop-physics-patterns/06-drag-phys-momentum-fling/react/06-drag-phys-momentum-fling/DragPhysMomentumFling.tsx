import { useEffect, useRef } from "react";
import styles from "./DragPhysMomentumFling.module.scss";

type Box<T> = { current: T };
type Pt = { x: number; y: number };

export default function DragPhysMomentumFling() {
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLButtonElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const box = boxRef.current;
    const ball = ballRef.current;
    const caption = captionRef.current;
    if (!root || !box || !ball || !caption) return;

    const FLING_DECAY_RATE = 0.92;
    const KEY_IMPULSE_PX_S = 260;

    const pos: Pt = { x: 0, y: 0 };
    const vel: Pt = { x: 0, y: 0 };
    let pointerStart: Pt | null = null;
    let startPos: Pt = { x: 0, y: 0 };
    let lastSample: { x: number; y: number; t: number } | null = null;
    let dragging = false;
    let grabbed = false;
    let raf = 0, lastTs: number | null = null;
    let originCache: Pt | null = null;

    function applyBall() {
      ball!.style.transform = "translate(" + pos.x.toFixed(1) + "px," + pos.y.toFixed(1) + "px)";
    }

    function bounds() {
      const br = box!.getBoundingClientRect();
      const brc = ball!.getBoundingClientRect();
      const halfW = brc.width / 2, halfH = brc.height / 2;
      return { minX: br.left + halfW, maxX: br.right - halfW, minY: br.top + halfH, maxY: br.bottom - halfH };
    }

    function ballOrigin() {
      if (originCache) return originCache;
      const r = ball!.getBoundingClientRect();
      originCache = { x: r.left + r.width / 2 - pos.x, y: r.top + r.height / 2 - pos.y };
      return originCache;
    }

    function flingTick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.032);
      lastTs = ts;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      const b = bounds();
      const origin = ballOrigin();
      const cx = origin.x + pos.x, cy = origin.y + pos.y;
      if (cx < b.minX) { pos.x += b.minX - cx; vel.x = Math.abs(vel.x); root!.classList.add(styles.isBounce); }
      else if (cx > b.maxX) { pos.x -= cx - b.maxX; vel.x = -Math.abs(vel.x); root!.classList.add(styles.isBounce); }
      if (cy < b.minY) { pos.y += b.minY - cy; vel.y = Math.abs(vel.y); root!.classList.add(styles.isBounce); }
      else if (cy > b.maxY) { pos.y -= cy - b.maxY; vel.y = -Math.abs(vel.y); root!.classList.add(styles.isBounce); }
      vel.x *= Math.pow(FLING_DECAY_RATE, dt * 60);
      vel.y *= Math.pow(FLING_DECAY_RATE, dt * 60);
      applyBall();
      const speed = Math.hypot(vel.x, vel.y);
      if (speed > 4) { raf = requestAnimationFrame(flingTick); return; }
      vel.x = 0; vel.y = 0;
      root!.classList.remove(styles.isBounce);
      lastTs = null;
    }

    function beginDrag(clientX: number, clientY: number) {
      cancelAnimationFrame(raf);
      dragging = true;
      vel.x = 0; vel.y = 0;
      pointerStart = { x: clientX, y: clientY };
      startPos = { x: pos.x, y: pos.y };
      lastSample = { x: clientX, y: clientY, t: performance.now() };
      root!.classList.add(styles.isDragging);
    }

    function moveDrag(clientX: number, clientY: number) {
      pos.x = startPos.x + (clientX - pointerStart!.x);
      pos.y = startPos.y + (clientY - pointerStart!.y);
      applyBall();
      const now = performance.now();
      const dt = Math.max((now - lastSample!.t) / 1000, 0.001);
      vel.x = (clientX - lastSample!.x) / dt;
      vel.y = (clientY - lastSample!.y) / dt;
      lastSample = { x: clientX, y: clientY, t: now };
    }

    function endDrag() {
      dragging = false;
      root!.classList.remove(styles.isDragging);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) { vel.x = 0; vel.y = 0; } else { lastTs = null; raf = requestAnimationFrame(flingTick); }
    }

    function onPointerDown(e: PointerEvent) {
      root!.classList.remove("is-demo");
      ball!.setPointerCapture(e.pointerId);
      beginDrag(e.clientX, e.clientY);
      caption!.textContent = "속도를 재고 있어요. 놓으면 그대로 날아가요";
      e.preventDefault();
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      moveDrag(e.clientX, e.clientY);
      e.preventDefault();
    }
    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      endDrag();
      caption!.textContent = "빠르게 놓으면 그 속도로 날아가 벽에 튕겨요";
      e.preventDefault();
    }
    ball.addEventListener("pointerdown", onPointerDown);
    ball.addEventListener("pointermove", onPointerMove);
    ball.addEventListener("pointerup", onPointerUp);

    function onKeyDown(e: KeyboardEvent) {
      root!.classList.remove("is-demo");
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        grabbed = !grabbed;
        ball!.classList.toggle(styles.isGrabbed, grabbed);
        caption!.textContent = grabbed ? "잡았어요. 화살표로 방향에 힘을 주세요" : "빠르게 놓으면 그 속도로 날아가 벽에 튕겨요";
        return;
      }
      if (!grabbed) return;
      let ix = 0, iy = 0;
      if (e.key === "ArrowLeft") ix = -KEY_IMPULSE_PX_S;
      else if (e.key === "ArrowRight") ix = KEY_IMPULSE_PX_S;
      else if (e.key === "ArrowUp") iy = -KEY_IMPULSE_PX_S;
      else if (e.key === "ArrowDown") iy = KEY_IMPULSE_PX_S;
      else if (e.key === "Escape") {
        e.preventDefault();
        grabbed = false;
        ball!.classList.remove(styles.isGrabbed);
        caption!.textContent = "빠르게 놓으면 그 속도로 날아가 벽에 튕겨요";
        return;
      } else { return; }
      e.preventDefault();
      vel.x += ix; vel.y += iy;
      grabbed = false;
      ball!.classList.remove(styles.isGrabbed);
      lastTs = null;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(flingTick);
    }
    ball.addEventListener("keydown", onKeyDown);

    applyBall();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demoRaf = 0;
    if (reduce) {
      root.classList.remove("is-demo");
    } else {
      const ballRect0 = ball.getBoundingClientRect();
      const ox0 = ballRect0.left + ballRect0.width / 2;
      const oy0 = ballRect0.top + ballRect0.height / 2;
      let demoStart: number | null = null;
      function demoTick(ts: number) {
        if (demoStart === null) demoStart = ts;
        const t = ts - demoStart;
        if (t < 200) {
          // 대기
        } else if (t < 420) {
          const p = (t - 200) / 220;
          const cx = ox0 - 60 * p;
          const cy = oy0 - 8 * p;
          if (t < 220) beginDrag(ox0, oy0);
          moveDrag(cx, cy);
        } else if (t < 460) {
          endDrag();
        } else {
          if (t > 1900) demoStart = ts - 60;
        }
        demoRaf = requestAnimationFrame(demoTick);
      }
      demoRaf = requestAnimationFrame(demoTick);
    }

    return () => {
      ball.removeEventListener("pointerdown", onPointerDown);
      ball.removeEventListener("pointermove", onPointerMove);
      ball.removeEventListener("pointerup", onPointerUp);
      ball.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(demoRaf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.fl} is-demo`} ref={rootRef}>
        <div className={styles.box} ref={boxRef}>
          <button
            type="button"
            className={styles.ball}
            ref={ballRef}
            aria-label="던지면 벽에 튕기며 서서히 멈추는 공. Enter 로 잡고 화살표로 방향에 힘을 줍니다"
          ></button>
        </div>
        <p className={styles.caption} ref={captionRef}>빠르게 놓으면 그 속도로 날아가 벽에 튕겨요</p>
      </div>
    </main>
  );
}
