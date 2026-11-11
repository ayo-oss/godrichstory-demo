import { useEffect, useRef } from 'react';
import styles from './DifficultySelectorGaugeArcDrag.module.scss';

const LEVELS = ['쉬움', '보통', '어려움', '매우 어려움', '최고'];
const ZONE_DEG = 36;
const SEQUENCE = [4, 0, 3, 1, 2];
const TICK_MS = 780;

export default function DifficultySelectorGaugeArcDrag() {
  const rootRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const zoneRefs = useRef<HTMLSpanElement[]>([]);
  const outRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const face = faceRef.current;
    const needle = needleRef.current;
    const out = outRef.current;
    if (!root || !face || !needle || !out || !zoneRefs.current) return undefined;
    const zones = zoneRefs.current;
    if (zones.length !== LEVELS.length) return undefined;

    let value = 2;
    let dragging = false;

    function zoneCenterDeg(i: number) { return -90 + ZONE_DEG / 2 + i * ZONE_DEG; }
    zones.forEach((z, i) => { z.style.transform = 'rotate(' + zoneCenterDeg(i) + 'deg)'; });

    // 계산 겹: 포인터 좌표와 피벗(바닥 중앙) 사이의 각도를 atan2 로 구해 -90~90도 구간을 0~4 값으로 매핑한다
    function angleToValue(clientX: number, clientY: number) {
      const r = face!.getBoundingClientRect();
      const px = r.left + r.width / 2;
      const py = r.bottom;
      const dx = clientX - px;
      const dy = Math.min(clientY - py, -1);
      const theta = Math.atan2(dy, dx) * 180 / Math.PI;
      let t = (theta + 180) / 180;
      t = Math.max(0, Math.min(1, t));
      return t * 4;
    }
    function paint() {
      const deg = -90 + (value / 4) * 180;
      needle!.style.transform = 'rotate(' + deg + 'deg)';
      const zi = Math.round(value);
      zones.forEach((z, i) => { z.classList.toggle(styles['is-active'], i === zi); });
      face!.setAttribute('aria-valuenow', String(zi));
      face!.setAttribute('aria-valuetext', LEVELS[zi]);
      out!.textContent = LEVELS[zi];
    }
    let timer = 0;
    function human() { root!.classList.remove(styles['is-demo']); window.clearInterval(timer); }
    function setValue(v: number) { value = Math.max(0, Math.min(4, v)); paint(); }

    function onDown(e: PointerEvent) {
      human(); dragging = true; face!.setPointerCapture(e.pointerId);
      setValue(angleToValue(e.clientX, e.clientY));
    }
    function onMove(e: PointerEvent) {
      if (!dragging) return;
      setValue(angleToValue(e.clientX, e.clientY));
    }
    function onUp() {
      dragging = false; setValue(Math.round(value));
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); human(); setValue(Math.round(value) + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); human(); setValue(Math.round(value) - 1); }
      else if (e.key === 'Home') { e.preventDefault(); human(); setValue(0); }
      else if (e.key === 'End') { e.preventDefault(); human(); setValue(4); }
    }
    face.addEventListener('pointerdown', onDown);
    face.addEventListener('pointermove', onMove);
    face.addEventListener('pointerup', onUp);
    face.addEventListener('keydown', onKey);

    let si = 0;
    function tick() { setValue(SEQUENCE[si % SEQUENCE.length]); si++; }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    paint();

    return () => {
      face!.removeEventListener('pointerdown', onDown);
      face!.removeEventListener('pointermove', onMove);
      face!.removeEventListener('pointerup', onUp);
      face!.removeEventListener('keydown', onKey);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.gad + ' ' + styles['is-demo']} ref={rootRef}>
        <div
          className={styles.gadFace}
          ref={faceRef}
          role="slider"
          tabIndex={0}
          aria-label="난이도"
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={2}
          aria-valuetext="어려움"
        >
          <div className={styles.gadZones} aria-hidden="true">
            {LEVELS.map((_, i) => (
              <span key={i} className={styles.gadZone} data-i={i} ref={(el: HTMLSpanElement | null) => { if (el && zoneRefs.current) zoneRefs.current[i] = el; }} />
            ))}
          </div>
          <div className={styles.gadNeedle} ref={needleRef} aria-hidden="true" />
          <div className={styles.gadPivot} aria-hidden="true" />
        </div>
        <p className={styles.gadLabel}>난이도 <span ref={outRef}>어려움</span></p>
      </div>
    </main>
  );
}
