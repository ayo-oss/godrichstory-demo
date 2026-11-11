import { useEffect, useRef } from 'react';
import styles from './BufferingScrubPreviewGhost.module.scss';

const TOTAL_SEC = 185; // 총 길이(가상)
const LOOP_MS = 4200;
const TICK_MS = 60;
const BUFFER_LEAD = 0.28; // 버퍼가 재생보다 앞서는 고정 여유(비율)

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export default function BufferingScrubPreviewGhost() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const bufferFillRef = useRef<HTMLDivElement>(null);
  const playFillRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const ghostTipRef = useRef<HTMLSpanElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    const bufferFill = bufferFillRef.current;
    const playFill = playFillRef.current;
    const ghost = ghostRef.current;
    const ghostTip = ghostTipRef.current;
    const handle = handleRef.current;
    const readout = readoutRef.current;
    if (!wrap || !track || !bufferFill || !playFill || !ghost || !ghostTip || !handle || !readout) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let playFrac = 0.18;
    let manualPlayFrac: number | null = null;

    function setGhost(frac: number) {
      if (!ghost || !ghostTip) return;
      const pct = (frac * 100).toFixed(1) + '%';
      ghost.style.setProperty('--ghost-pct', pct);
      ghostTip.textContent = fmt(frac * TOTAL_SEC);
    }

    function paint(playF: number, ghostF: number) {
      if (!bufferFill || !playFill || !handle || !track || !readout) return;
      const bufF = clamp(playF + BUFFER_LEAD, 0, 1);
      bufferFill.style.setProperty('--buffer-pct', (bufF * 100).toFixed(1) + '%');
      playFill.style.setProperty('--play-pct', (playF * 100).toFixed(1) + '%');
      handle.style.setProperty('--play-pct', (playF * 100).toFixed(1) + '%');
      track.setAttribute('aria-valuenow', String(Math.round(playF * 100)));
      setGhost(ghostF);
      readout.textContent = '재생 ' + fmt(playF * TOTAL_SEC) + ' · 버퍼 ' + fmt(bufF * TOTAL_SEC);
    }

    function tick(elapsedMs: number) {
      const t = (elapsedMs % LOOP_MS) / LOOP_MS;
      playFrac = manualPlayFrac !== null ? manualPlayFrac : 0.05 + 0.55 * t;
      // 유령(미리보기) 위치는 실제 포인터 X 좌표를 트랙 폭 기준 비율로 바꾼 값 — 여기선 같은 방식을 합성파로 재현
      const pointerFrac = clamp(playFrac + 0.22 + 0.06 * Math.sin(elapsedMs / 260), 0, 1);
      paint(playFrac, pointerFrac);
    }

    let timer: ReturnType<typeof window.setInterval> | null = null;
    let start = 0;
    function loop() {
      tick(performance.now() - start);
    }

    function human() {
      if (wrap && wrap.classList.contains(styles['is-demo'])) {
        wrap.classList.remove(styles['is-demo']);
        if (timer !== null) window.clearInterval(timer);
        timer = null;
      }
    }

    // 실제 포인터 좌표 → 트랙 안 비율로 바꾸는 계산 (getBoundingClientRect 실측)
    function fracFromPointer(clientX: number) {
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      return clamp((clientX - rect.left) / rect.width, 0, 1);
    }

    let dragging = false;

    function onPointerMove(ev: PointerEvent) {
      human();
      const f = fracFromPointer(ev.clientX);
      setGhost(f);
      if (dragging) {
        manualPlayFrac = f;
        paint(f, f);
      }
    }

    function onPointerDown(ev: PointerEvent) {
      human();
      dragging = true;
      const f = fracFromPointer(ev.clientX);
      manualPlayFrac = f;
      paint(f, f);
    }

    function onPointerUp() {
      dragging = false;
    }

    function onKeyDown(ev: KeyboardEvent) {
      human();
      const step = 0.02;
      if (ev.key === 'ArrowRight') {
        manualPlayFrac = clamp((manualPlayFrac !== null ? manualPlayFrac : playFrac) + step, 0, 1);
        paint(manualPlayFrac, manualPlayFrac);
      } else if (ev.key === 'ArrowLeft') {
        manualPlayFrac = clamp((manualPlayFrac !== null ? manualPlayFrac : playFrac) - step, 0, 1);
        paint(manualPlayFrac, manualPlayFrac);
      }
    }

    track.addEventListener('pointermove', onPointerMove);
    track.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    track.addEventListener('keydown', onKeyDown);

    if (!reduce) {
      start = performance.now();
      tick(0);
      timer = window.setInterval(loop, TICK_MS);
    } else {
      // reduce: 실사용 경로 적용 — 자동 이동은 멈추고 재생·버퍼·유령 위치를 한 장면으로 고정한다
      paint(0.3, 0.5);
    }

    return () => {
      if (timer !== null) window.clearInterval(timer);
      track.removeEventListener('pointermove', onPointerMove);
      track.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      track.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div className={`${styles.scrubWrap} ${styles['is-demo']}`} ref={wrapRef}>
      <div
        className={styles.track}
        ref={trackRef}
        role="slider"
        aria-label="탐색 막대"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        tabIndex={0}
      >
        <div className={styles.bufferFill} ref={bufferFillRef} />
        <div className={styles.playFill} ref={playFillRef} />
        <div className={styles.ghost} ref={ghostRef}>
          <span className={styles.ghostTip} ref={ghostTipRef}>0:00</span>
        </div>
        <div className={styles.handle} ref={handleRef} />
      </div>
      <p className={styles.readout} ref={readoutRef} aria-live="polite">재생 0:00 · 버퍼 0:00</p>
    </div>
  );
}
