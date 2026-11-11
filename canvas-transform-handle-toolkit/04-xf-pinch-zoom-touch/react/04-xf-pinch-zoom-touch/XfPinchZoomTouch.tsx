import { useEffect, useRef } from 'react';
import styles from './XfPinchZoomTouch.module.scss';

const MIN_SCALE = 0.55;
const MAX_SCALE = 1.9;
const LOOP_MS = 2000;

export default function XfPinchZoomTouch() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const scene = scene0;
    const frame0 = scene.querySelector<HTMLDivElement>('#frame');
    const subject0 = scene.querySelector<HTMLDivElement>('#subject');
    const fingerA0 = scene.querySelector<HTMLDivElement>('#fingerA');
    const fingerB0 = scene.querySelector<HTMLDivElement>('#fingerB');
    const rp0 = scene.querySelector<HTMLSpanElement>('#rp');
    const rr0 = scene.querySelector<HTMLSpanElement>('#rr');
    if (!frame0 || !subject0 || !fingerA0 || !fingerB0 || !rp0 || !rr0) return undefined;
    const frame = frame0;
    const subject = subject0;
    const fingerA = fingerA0;
    const fingerB = fingerB0;
    const rp = rp0;
    const rr = rr0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 이 데모는 선택된 오브젝트 하나에만 적용된다 — 247 의 gesture-pinch-zoom-pan(화면 전체를
    // 확대·이동하는 손짓)과 달리 여기서는 무대·배경은 그대로고 subjectShape 만 scale·rotate 된다.
    const posA = { x: 0.24, y: 0.5 };
    const posB = { x: 0.76, y: 0.5 };
    let baseDist: number | null = null;
    let baseAngle: number | null = null;
    let dragging: { x: number; y: number } | null = null;
    let rafId = 0;

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

    function placeFinger(el: HTMLDivElement, pos: { x: number; y: number }) {
      const r = frame.getBoundingClientRect();
      el.style.left = pos.x * r.width + 'px';
      el.style.top = pos.y * r.height + 'px';
    }

    // 두 포인터 거리/각 → scale·rotate. 실제 두 손가락 대신 포인터 이벤트 2개(finger A·B)를
    // 각각 시뮬레이트해 그 사이 거리비·각도차를 subjectShape 에 그대로 반영한다.
    function computeFromFingers() {
      const r = frame.getBoundingClientRect();
      const ax = posA.x * r.width, ay = posA.y * r.height;
      const bx = posB.x * r.width, by = posB.y * r.height;
      const d = Math.hypot(bx - ax, by - ay);
      const a = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
      if (baseDist === null) { baseDist = d; baseAngle = a; }
      const scale = clamp(d / baseDist, MIN_SCALE, MAX_SCALE);
      const rotate = a - (baseAngle as number);
      subject.style.transform = 'translate(-50%,-50%) rotate(' + rotate.toFixed(1) + 'deg) scale(' + scale.toFixed(3) + ')';
      rp.textContent = String(Math.round(scale * 100));
      rr.textContent = String(Math.round(rotate));
      placeFinger(fingerA, posA);
      placeFinger(fingerB, posB);
    }

    function human() {
      if (scene.classList.contains(styles['is-demo'])) {
        scene.classList.remove(styles['is-demo']);
        cancelAnimationFrame(rafId);
      }
    }

    function bindFinger(el: HTMLDivElement, posRef: { x: number; y: number }) {
      function onDown(e: PointerEvent) {
        human();
        dragging = posRef;
        el.setPointerCapture(e.pointerId);
      }
      function onMove(e: PointerEvent) {
        if (dragging !== posRef) return;
        const r = frame.getBoundingClientRect();
        posRef.x = clamp((e.clientX - r.left) / r.width, 0.05, 0.95);
        posRef.y = clamp((e.clientY - r.top) / r.height, 0.05, 0.95);
        computeFromFingers();
      }
      function onUp(e: PointerEvent) {
        if (dragging !== posRef) return;
        dragging = null;
        try { el.releasePointerCapture(e.pointerId); } catch { /* 캡처가 이미 풀린 경우 */ }
      }
      function onKey(e: KeyboardEvent) {
        const step = 0.04;
        if (e.key === 'ArrowLeft') { human(); posRef.x = clamp(posRef.x - step, 0.05, 0.95); computeFromFingers(); e.preventDefault(); }
        else if (e.key === 'ArrowRight') { human(); posRef.x = clamp(posRef.x + step, 0.05, 0.95); computeFromFingers(); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { human(); posRef.y = clamp(posRef.y - step, 0.05, 0.95); computeFromFingers(); e.preventDefault(); }
        else if (e.key === 'ArrowDown') { human(); posRef.y = clamp(posRef.y + step, 0.05, 0.95); computeFromFingers(); e.preventDefault(); }
      }
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
      el.addEventListener('keydown', onKey);
      cleanups.push(() => {
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        el.removeEventListener('keydown', onKey);
      });
    }

    const cleanups: Array<() => void> = [];
    bindFinger(fingerA, posA);
    bindFinger(fingerB, posB);
    computeFromFingers();

    // reduce: 실사용 경로 적용 — 두 finger 의 pointer·keydown 은 위에서 즉시 반영한다.
    // 아래 자동 루프(시연 게이트만)는 reduce 에서는 돌지 않는다.
    function loopStep() {
      if (!scene.classList.contains(styles['is-demo']) || reduce) return;
      const t = (performance.now() % LOOP_MS) / LOOP_MS;
      const spread = 0.16 + Math.sin(t * Math.PI * 2) * 0.14;
      const twist = Math.sin(t * Math.PI * 2) * 0.12;
      posA.x = clamp(0.5 - spread - twist, 0.05, 0.95);
      posA.y = clamp(0.5 - twist * 0.6, 0.05, 0.95);
      posB.x = clamp(0.5 + spread - twist, 0.05, 0.95);
      posB.y = clamp(0.5 + twist * 0.6, 0.05, 0.95);
      computeFromFingers();
      rafId = requestAnimationFrame(loopStep);
    }

    if (!reduce) {
      rafId = requestAnimationFrame(loopStep);
    }

    return () => {
      cleanups.forEach((fn) => fn());
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.scene + ' ' + styles['is-demo']} ref={sceneRef}>
        <div id="frame" className={styles.frame}>
          <div id="subject" className={styles.subjectShape}></div>
          <div id="fingerA" className={styles.finger} tabIndex={0} role="slider" aria-label="첫 번째 손가락 포인트" aria-valuemin={0} aria-valuemax={100} aria-valuenow={50}></div>
          <div id="fingerB" className={styles.finger} tabIndex={0} role="slider" aria-label="두 번째 손가락 포인트" aria-valuemin={0} aria-valuemax={100} aria-valuenow={50}></div>
        </div>
        <div className={styles.readout} aria-hidden="true"><span id="rp">100</span>% · <span id="rr">0</span>°</div>
      </div>
    </main>
  );
}
