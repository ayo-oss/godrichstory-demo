import { useEffect, useRef } from 'react';
import styles from './XfDragMove.module.scss';

const STEP_PX = 1; // 방향키 한 번의 기본 이동량
const STEP_PX_SHIFT = 10; // Shift + 방향키
const HOP_MS = 620;
const HOLD_MS = 360;
const WAYPOINTS = [
  { x: 0, y: 0 }, { x: 92, y: -38 }, { x: -70, y: 30 }, { x: 0, y: 0 }
];

export default function XfDragMove() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const scene = scene0;
    const draggable0 = scene.querySelector<HTMLDivElement>('.' + styles.draggable);
    const rx0 = scene.querySelector<HTMLSpanElement>('#rx');
    const ry0 = scene.querySelector<HTMLSpanElement>('#ry');
    if (!draggable0 || !rx0 || !ry0) return undefined;
    const draggable = draggable0;
    const rx = rx0;
    const ry = ry0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let tx = 0, ty = 0;
    let dragging = false;
    let startX = 0, startY = 0, originTx = 0, originTy = 0;
    let rafId = 0;
    let timers: number[] = [];

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    // 포인터 델타 → translate 행렬. matrix(1,0,0,1,tx,ty) 가 곧 순수 이동 행렬이다.
    function applyTransform(nx: number, ny: number) {
      tx = nx; ty = ny;
      draggable.style.transform = 'matrix(1,0,0,1,' + tx.toFixed(1) + ',' + ty.toFixed(1) + ')';
      rx.textContent = String(Math.round(tx));
      ry.textContent = String(Math.round(ty));
    }

    function human() {
      if (scene.classList.contains(styles['is-demo'])) {
        scene.classList.remove(styles['is-demo']);
        timers.forEach((t) => window.clearTimeout(t));
        timers = [];
      }
    }

    function onPointerDown(e: PointerEvent) {
      human();
      dragging = true;
      draggable.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY;
      originTx = tx; originTy = ty;
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      applyTransform(originTx + (e.clientX - startX), originTy + (e.clientY - startY));
    }
    function endDrag(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      try { draggable.releasePointerCapture(e.pointerId); } catch { /* 캡처가 이미 풀린 경우 */ }
    }
    function onKeyDown(e: KeyboardEvent) {
      const step = e.shiftKey ? STEP_PX_SHIFT : STEP_PX;
      if (e.key === 'ArrowLeft') { human(); applyTransform(tx - step, ty); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { human(); applyTransform(tx + step, ty); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { human(); applyTransform(tx, ty - step); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { human(); applyTransform(tx, ty + step); e.preventDefault(); }
    }

    draggable.addEventListener('pointerdown', onPointerDown);
    draggable.addEventListener('pointermove', onPointerMove);
    draggable.addEventListener('pointerup', endDrag);
    draggable.addEventListener('pointercancel', endDrag);
    draggable.addEventListener('keydown', onKeyDown);

    // reduce: 실사용 경로 적용 — 드래그·키보드는 위에서 즉시 반영한다.
    // 아래 자동 루프는 시연 게이트만 — reduce 에서는 돌지 않는다.
    function hopTo(target: { x: number; y: number }, onDone: () => void) {
      const fromX = tx, fromY = ty;
      const start = performance.now();
      function frame(now: number) {
        if (!scene.classList.contains(styles['is-demo'])) return;
        const p = clamp((now - start) / HOP_MS, 0, 1);
        const e = easeOutCubic(p);
        applyTransform(fromX + (target.x - fromX) * e, fromY + (target.y - fromY) * e);
        if (p < 1) rafId = requestAnimationFrame(frame);
        else onDone();
      }
      rafId = requestAnimationFrame(frame);
    }

    function cycle(i: number) {
      if (!scene.classList.contains(styles['is-demo'])) return;
      const target = WAYPOINTS[i % WAYPOINTS.length];
      hopTo(target, () => {
        timers.push(window.setTimeout(() => cycle(i + 1), HOLD_MS));
      });
    }

    applyTransform(0, 0);
    if (!reduce) {
      cycle(1);
    }

    return () => {
      draggable.removeEventListener('pointerdown', onPointerDown);
      draggable.removeEventListener('pointermove', onPointerMove);
      draggable.removeEventListener('pointerup', endDrag);
      draggable.removeEventListener('pointercancel', endDrag);
      draggable.removeEventListener('keydown', onKeyDown);
      timers.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.scene + ' ' + styles['is-demo']} ref={sceneRef}>
        <div
          className={styles.draggable}
          tabIndex={0}
          aria-label="드래그해서 이동"
        >
          <span className={styles.selectBox} aria-hidden="true"></span>
          <span className={styles.subjectShape} aria-hidden="true"></span>
        </div>
        <div className={styles.readout} aria-hidden="true">X <span id="rx">0</span> · Y <span id="ry">0</span></div>
      </div>
    </main>
  );
}
