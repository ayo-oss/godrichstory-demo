import { useEffect, useRef } from 'react';
import styles from './XfRotateHandle.module.scss';

const ROTATE_SNAP_DEG = 15; // 변형 03 이 5 로 좁힌다 — 드래그 중 붙는 회전 스냅 각도
const HOP_MS = 620;
const HOLD_MS = 340;
const LOOP_SEQUENCE = [70, 200, 320, 360];

export default function XfRotateHandle() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const scene = scene0;
    const frame0 = scene.querySelector<HTMLDivElement>('#frame');
    const rotator0 = scene.querySelector<HTMLDivElement>('#rotator');
    const handle0 = scene.querySelector<HTMLDivElement>('#handle');
    const rd0 = scene.querySelector<HTMLSpanElement>('#rd');
    if (!frame0 || !rotator0 || !handle0 || !rd0) return undefined;
    const frame = frame0;
    const rotator = rotator0;
    const handle = handle0;
    const rd = rd0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let deg = 0;
    let dragging = false;
    let rafId = 0;
    let timers: number[] = [];

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
    function mod360(raw: number) { return ((raw % 360) + 360) % 360; }

    // 프레임 중심→포인터 벡터의 atan2 로 절대 각도를 구한다 — 0° 가 위를 향하도록 +90 보정.
    function angleFromPointer(e: PointerEvent) {
      const r = frame.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      return mod360((Math.atan2(dy, dx) * 180) / Math.PI + 90);
    }

    function applyRotate(a: number) {
      deg = mod360(a);
      rotator.style.transform = 'rotate(' + deg.toFixed(1) + 'deg)';
      rd.textContent = String(Math.round(deg));
      handle.setAttribute('aria-valuenow', String(Math.round(deg)));
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
      handle.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      // 실 드래그는 ROTATE_SNAP_DEG 배수로 반올림해 붙는다.
      const a = angleFromPointer(e);
      applyRotate(Math.round(a / ROTATE_SNAP_DEG) * ROTATE_SNAP_DEG);
    }
    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      try { handle.releasePointerCapture(e.pointerId); } catch { /* 캡처가 이미 풀린 경우 */ }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { human(); applyRotate(deg - ROTATE_SNAP_DEG); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { human(); applyRotate(deg + ROTATE_SNAP_DEG); e.preventDefault(); }
    }

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);
    handle.addEventListener('keydown', onKeyDown);
    applyRotate(0);

    // reduce: 실사용 경로 적용 — 핸들 드래그·키보드는 위에서 즉시 반영한다.
    // 아래 자동 루프는 시연 게이트만 — 스냅 없이 연속 회전하며 reduce 에서는 돌지 않는다.
    function hopRotate(target: number, onDone: () => void) {
      const from = deg;
      const delta = target - from;
      const start = performance.now();
      function frame(now: number) {
        if (!scene.classList.contains(styles['is-demo'])) return;
        const p = clamp((now - start) / HOP_MS, 0, 1);
        applyRotate(from + delta * easeOutCubic(p));
        if (p < 1) rafId = requestAnimationFrame(frame);
        else onDone();
      }
      rafId = requestAnimationFrame(frame);
    }

    function cycle(i: number) {
      if (!scene.classList.contains(styles['is-demo'])) return;
      const target = LOOP_SEQUENCE[i % LOOP_SEQUENCE.length];
      hopRotate(target, () => {
        timers.push(window.setTimeout(() => cycle(i + 1), HOLD_MS));
      });
    }

    if (!reduce) {
      cycle(0);
    }

    return () => {
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
      handle.removeEventListener('pointercancel', onPointerUp);
      handle.removeEventListener('keydown', onKeyDown);
      timers.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.scene + ' ' + styles['is-demo']} ref={sceneRef}>
        <div id="frame" className={styles.frame}>
          <div id="rotator" className={styles.rotator}>
            <span className={styles.subjectShape} aria-hidden="true"></span>
            <span className={styles.stick} aria-hidden="true"></span>
            <div
              id="handle"
              className={styles.handle}
              role="slider"
              tabIndex={0}
              aria-label="회전 핸들, 드래그하여 회전"
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={0}
            ></div>
          </div>
        </div>
        <div className={styles.readout} aria-hidden="true"><span id="rd">0</span>°</div>
      </div>
    </main>
  );
}
