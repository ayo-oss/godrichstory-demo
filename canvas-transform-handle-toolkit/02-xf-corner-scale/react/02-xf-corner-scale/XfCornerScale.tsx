import { useEffect, useRef } from 'react';
import styles from './XfCornerScale.module.scss';

const MIN_SCALE = 0.55;
const MAX_SCALE = 1.75;
const KEY_STEP = 0.08;
const HOP_MS = 560;
const HOLD_MS = 340;
const LOOP_SEQUENCE = [1.5, 0.7, 1];
const ORIGIN_BY_CORNER: Record<string, string> = {
  tl: '100% 100%',
  tr: '0% 100%',
  bl: '100% 0%',
  br: '0% 0%'
};

export default function XfCornerScale() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const scene = scene0;
    const frame0 = scene.querySelector<HTMLDivElement>('.' + styles.frame);
    const subject0 = scene.querySelector<HTMLDivElement>('#subject');
    const rp0 = scene.querySelector<HTMLSpanElement>('#rp');
    const handles = Array.from(scene.querySelectorAll<HTMLDivElement>('.' + styles.handle));
    if (!frame0 || !subject0 || !rp0 || handles.length === 0) return undefined;
    const frame = frame0;
    const subject = subject0;
    const rp = rp0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let scale = 1;
    let rafId = 0;
    let timers: number[] = [];
    const dragByCorner: Record<string, boolean> = {};
    const originByCorner: Record<string, { x: number; y: number }> = {};

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    // 앵커 고정 비율 산술: 드래그하는 모서리의 대각선 반대쪽을 앵커로 고정하고(transformOrigin),
    // 앵커→포인터 거리의 비로 균일 스케일을 만든다.
    function cornerAnchorRect(corner: string) {
      const r = frame.getBoundingClientRect();
      const ax = corner === 'tl' || corner === 'bl' ? r.right : r.left;
      const ay = corner === 'tl' || corner === 'tr' ? r.bottom : r.top;
      return { x: ax, y: ay };
    }

    function applyScale(corner: string, s: number) {
      scale = clamp(s, MIN_SCALE, MAX_SCALE);
      subject.style.transformOrigin = ORIGIN_BY_CORNER[corner] || '50% 50%';
      subject.style.transform = 'scale(' + scale.toFixed(3) + ')';
      rp.textContent = String(Math.round(scale * 100));
      handles.forEach((h) => h.setAttribute('aria-valuenow', String(Math.round(scale * 100))));
    }

    function human() {
      if (scene.classList.contains(styles['is-demo'])) {
        scene.classList.remove(styles['is-demo']);
        timers.forEach((t) => window.clearTimeout(t));
        timers = [];
      }
    }

    function bindHandle(handle: HTMLDivElement) {
      const corner = handle.dataset.corner || 'br';
      function onDown(e: PointerEvent) {
        human();
        dragByCorner[corner] = true;
        handle.setPointerCapture(e.pointerId);
        const anchor = cornerAnchorRect(corner);
        originByCorner[corner] = { x: e.clientX - anchor.x, y: e.clientY - anchor.y };
      }
      function onMove(e: PointerEvent) {
        if (!dragByCorner[corner]) return;
        const anchor = cornerAnchorRect(corner);
        const dx = e.clientX - anchor.x;
        const dy = e.clientY - anchor.y;
        const dNow = Math.hypot(dx, dy);
        const d0 = Math.hypot(originByCorner[corner].x, originByCorner[corner].y);
        if (d0 === 0) return;
        applyScale(corner, scale * (dNow / d0));
        originByCorner[corner] = { x: dx, y: dy };
      }
      function onUp(e: PointerEvent) {
        if (!dragByCorner[corner]) return;
        dragByCorner[corner] = false;
        try { handle.releasePointerCapture(e.pointerId); } catch { /* 캡처가 이미 풀린 경우 */ }
      }
      function onKey(e: KeyboardEvent) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { human(); applyScale(corner, scale + KEY_STEP); e.preventDefault(); }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { human(); applyScale(corner, scale - KEY_STEP); e.preventDefault(); }
      }
      handle.addEventListener('pointerdown', onDown);
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
      handle.addEventListener('keydown', onKey);
      cleanups.push(() => {
        handle.removeEventListener('pointerdown', onDown);
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onUp);
        handle.removeEventListener('keydown', onKey);
      });
    }

    const cleanups: Array<() => void> = [];
    handles.forEach(bindHandle);
    applyScale('br', 1);

    // reduce: 실사용 경로 적용 — 핸들 드래그·키보드는 위에서 즉시 반영한다.
    // 아래 자동 루프는 시연 게이트만 — reduce 에서는 돌지 않는다.
    function hopScale(corner: string, target: number, onDone: () => void) {
      const from = scale;
      const start = performance.now();
      function frame(now: number) {
        if (!scene.classList.contains(styles['is-demo'])) return;
        const p = clamp((now - start) / HOP_MS, 0, 1);
        applyScale(corner, from + (target - from) * easeOutCubic(p));
        if (p < 1) rafId = requestAnimationFrame(frame);
        else onDone();
      }
      rafId = requestAnimationFrame(frame);
    }

    function cycle(i: number) {
      if (!scene.classList.contains(styles['is-demo'])) return;
      const target = LOOP_SEQUENCE[i % LOOP_SEQUENCE.length];
      hopScale('br', target, () => {
        timers.push(window.setTimeout(() => cycle(i + 1), HOLD_MS));
      });
    }

    if (!reduce) {
      cycle(0);
    }

    return () => {
      cleanups.forEach((fn) => fn());
      timers.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.scene + ' ' + styles['is-demo']} ref={sceneRef}>
        <div className={styles.frame} tabIndex={0} aria-label="크기 조절 프레임, 모서리 핸들을 드래그">
          <div id="subject" className={styles.subjectShape}></div>
          <div className={styles.handle} data-corner="tl" role="slider" tabIndex={0} aria-label="왼쪽 위 모서리 핸들" aria-valuemin={50} aria-valuemax={180} aria-valuenow={100}></div>
          <div className={styles.handle} data-corner="tr" role="slider" tabIndex={0} aria-label="오른쪽 위 모서리 핸들" aria-valuemin={50} aria-valuemax={180} aria-valuenow={100}></div>
          <div className={styles.handle} data-corner="bl" role="slider" tabIndex={0} aria-label="왼쪽 아래 모서리 핸들" aria-valuemin={50} aria-valuemax={180} aria-valuenow={100}></div>
          <div className={styles.handle} data-corner="br" role="slider" tabIndex={0} aria-label="오른쪽 아래 모서리 핸들" aria-valuemin={50} aria-valuemax={180} aria-valuenow={100}></div>
        </div>
        <div className={styles.readout} aria-hidden="true"><span id="rp">100</span>%</div>
      </div>
    </main>
  );
}
