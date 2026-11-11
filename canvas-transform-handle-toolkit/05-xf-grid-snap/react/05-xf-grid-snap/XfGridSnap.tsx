import { useEffect, useRef } from 'react';
import styles from './XfGridSnap.module.scss';

const CELL_PX = 20;
const CORNER_SNAP_RADIUS_PX = 6; // 변형 05 가 16 으로 넓힌다 — 오브젝트 모서리가 격자 교차점에 붙는 자석 반경
const WAYPOINTS = [
  { x: 20, y: 20 }, { x: 140, y: 60 }, { x: 63, y: 96 }, { x: 20, y: 20 }
];
const HOP_MS = 560;
const HOLD_MS = 320;

export default function XfGridSnap() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const scene = scene0;
    const draggable0 = scene.querySelector<HTMLDivElement>('.' + styles.draggable);
    const guideDot0 = scene.querySelector<HTMLDivElement>('.' + styles.guideDot);
    const rs0 = scene.querySelector<HTMLSpanElement>('#rs');
    if (!draggable0 || !guideDot0 || !rs0) return undefined;
    const draggable = draggable0;
    const guideDot = guideDot0;
    const rs = rs0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const frameW = 184, frameH = 108;
    let tx = 20, ty = 20;
    let dragging = false;
    let startX = 0, startY = 0, originTx = 0, originTy = 0;
    let rafId = 0;
    let timers: number[] = [];

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    // 오브젝트 모서리(좌상단)를 가장 가까운 격자 교차점(CELL_PX 배수)과 비교해, 그 거리가
    // CORNER_SNAP_RADIUS_PX 안이면 손을 놓기 전에도 교차점으로 스냅한다 — 다른 오브젝트가 아니라
    // 고정된 배경 격자 한 가지에만 붙는다(250 의 panel-snap-guides 와 다른 시연).
    function nearestGrid(v: number) { return Math.round(v / CELL_PX) * CELL_PX; }

    function applyPosition(rawX: number, rawY: number) {
      const nx = nearestGrid(rawX);
      const ny = nearestGrid(rawY);
      const d = Math.hypot(rawX - nx, rawY - ny);
      const snapped = d <= CORNER_SNAP_RADIUS_PX;
      tx = clamp(snapped ? nx : rawX, 0, frameW - 44);
      ty = clamp(snapped ? ny : rawY, 0, frameH - 32);
      draggable.style.transform = 'matrix(1,0,0,1,' + tx.toFixed(1) + ',' + ty.toFixed(1) + ')';
      if (snapped) {
        guideDot.style.transform = 'matrix(1,0,0,1,' + nx.toFixed(1) + ',' + ny.toFixed(1) + ')';
        guideDot.classList.add(styles.isActive);
      } else {
        guideDot.classList.remove(styles.isActive);
      }
      rs.textContent = snapped ? 'snap' : 'free';
      draggable.classList.toggle(styles.isSnapped, snapped);
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
      applyPosition(originTx + (e.clientX - startX), originTy + (e.clientY - startY));
    }
    function endDrag(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      try { draggable.releasePointerCapture(e.pointerId); } catch { /* 캡처가 이미 풀린 경우 */ }
    }
    function onKeyDown(e: KeyboardEvent) {
      const step = CELL_PX;
      if (e.key === 'ArrowLeft') { human(); applyPosition(tx - step, ty); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { human(); applyPosition(tx + step, ty); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { human(); applyPosition(tx, ty - step); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { human(); applyPosition(tx, ty + step); e.preventDefault(); }
    }

    draggable.addEventListener('pointerdown', onPointerDown);
    draggable.addEventListener('pointermove', onPointerMove);
    draggable.addEventListener('pointerup', endDrag);
    draggable.addEventListener('pointercancel', endDrag);
    draggable.addEventListener('keydown', onKeyDown);

    // reduce: 실사용 경로 적용 — 드래그·키보드는 위에서 같은 applyPosition() 으로 즉시 반영한다.
    // 아래 hopTo()·cycle() 은 시연 게이트만 — reduce 에서는 돌지 않는다.
    function hopTo(target: { x: number; y: number }, onDone: () => void) {
      const fromX = tx, fromY = ty;
      const start = performance.now();
      function frame(now: number) {
        if (!scene.classList.contains(styles['is-demo'])) return;
        const p = clamp((now - start) / HOP_MS, 0, 1);
        const e = easeOutCubic(p);
        applyPosition(fromX + (target.x - fromX) * e, fromY + (target.y - fromY) * e);
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

    applyPosition(tx, ty);
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
        <div className={styles.gridBg} aria-hidden="true"></div>
        <div className={styles.frame}>
          <div className={styles.guideDot} aria-hidden="true"></div>
          <div
            className={styles.draggable}
            tabIndex={0}
            aria-label="드래그하면 배경 격자 교차점에 달라붙는 오브젝트"
          ></div>
        </div>
        <div className={styles.readout} aria-hidden="true"><span id="rs">free</span></div>
      </div>
    </main>
  );
}
