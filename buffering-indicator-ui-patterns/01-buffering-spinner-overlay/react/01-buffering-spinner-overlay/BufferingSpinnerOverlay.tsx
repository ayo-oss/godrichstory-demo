import { useEffect, useRef } from 'react';
import styles from './BufferingSpinnerOverlay.module.scss';

const STALL_CYCLE_MS = 2000;
const STALL_PORTION = 0.72;
const TICK_MS = 60;
const SPIN_MS_STALL_START = 1500;
const SPIN_MS_STALL_END = 550;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export default function BufferingSpinnerOverlay() {
  const playerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const player = playerRef.current;
    const overlay = overlayRef.current;
    const ring = ringRef.current;
    const status = statusRef.current;
    const toggleBtn = toggleBtnRef.current;
    if (!player || !overlay || !ring || !status || !toggleBtn) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function tick(elapsedMs: number) {
      if (!overlay || !ring || !status) return;
      const phase = elapsedMs % STALL_CYCLE_MS;
      const stallSpan = STALL_CYCLE_MS * STALL_PORTION;
      const stalling = phase < stallSpan;
      if (stalling) {
        const stallFrac = clamp(phase / stallSpan, 0, 1);
        const spinMs = SPIN_MS_STALL_START - (SPIN_MS_STALL_START - SPIN_MS_STALL_END) * stallFrac;
        const jitter = clamp(0.5 + 0.28 * Math.sin(elapsedMs / 190) + 0.14 * Math.sin(elapsedMs / 61), 0, 1);
        ring.style.setProperty('--spin-duration', spinMs.toFixed(0) + 'ms');
        overlay.style.setProperty('--blur', (4 + jitter * 7).toFixed(2) + 'px');
        overlay.style.opacity = (0.5 + jitter * 0.28).toFixed(2);
        if (status.textContent !== '버퍼링 중') status.textContent = '버퍼링 중';
      } else {
        overlay.style.opacity = '0';
        if (status.textContent !== '재생 재개') status.textContent = '재생 재개';
      }
    }

    let timer: ReturnType<typeof window.setInterval> | null = null;
    let start = 0;
    function loop() {
      tick(performance.now() - start);
    }

    function human() {
      if (player && player.classList.contains(styles['is-demo'])) {
        player.classList.remove(styles['is-demo']);
        if (timer !== null) window.clearInterval(timer);
        timer = null;
      }
    }

    function onToggle() {
      human();
      if (!overlay || !ring || !status || !toggleBtn) return;
      const manualStall = overlay.style.opacity !== '1';
      overlay.style.opacity = manualStall ? '1' : '0';
      overlay.style.setProperty('--blur', '8px');
      ring.style.setProperty('--spin-duration', '900ms');
      status.textContent = manualStall ? '버퍼링 중' : '재생 재개';
      toggleBtn.setAttribute('aria-pressed', manualStall ? 'true' : 'false');
      toggleBtn.textContent = manualStall ? '재생 다시 잇기' : '지금 버퍼링 멈춰보기';
    }

    toggleBtn.addEventListener('click', onToggle);

    if (!reduce) {
      start = performance.now();
      tick(0);
      timer = window.setInterval(loop, TICK_MS);
    } else {
      // reduce: 실사용 경로 적용 — 회전·흐림 변화는 멈추고 정지된 오버레이 상태 하나만 고정으로 보여준다
      overlay.style.opacity = '0.6';
      overlay.style.setProperty('--blur', '6px');
      status.textContent = '버퍼링 중';
    }

    return () => {
      if (timer !== null) window.clearInterval(timer);
      toggleBtn.removeEventListener('click', onToggle);
    };
  }, []);

  return (
    <div className={`${styles.player} ${styles['is-demo']}`} ref={playerRef}>
      <div className={styles.frame} aria-hidden="true">
        <span className={styles.frameDot} />
        <span className={styles.frameDot} />
        <span className={styles.frameDot} />
      </div>
      <div className={styles.overlay} ref={overlayRef}>
        <span className={styles.ring} ref={ringRef} />
      </div>
      <button className={styles.toggleBtn} ref={toggleBtnRef} type="button" aria-pressed="false">지금 버퍼링 멈춰보기</button>
      <p className={styles.status} ref={statusRef} aria-live="polite">버퍼링 중</p>
    </div>
  );
}
