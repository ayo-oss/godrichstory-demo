import { useEffect, useRef } from 'react';
import styles from './BufferingCountdownEta.module.scss';

const TOTAL_MB = 48;
const LOOP_MS = 7000; // 이 시간 안에 전체를 받는 기준 사이클
const TICK_MS = 120;
const BASE_SPEED_MBPS = TOTAL_MB / (LOOP_MS / 1000);
const SPEED_VARIANCE = 0.55; // 속도 흔들림 비율

// 결정론적 합성파로 순간 전송 속도를 흉내낸다 — 매 틱 다른 속도라 ETA 가 매번 다시 계산된다
function instSpeed(ms: number) {
  const w = 1 + SPEED_VARIANCE * Math.sin(ms / 480) + 0.2 * Math.sin(ms / 133);
  return Math.max(0.15, BASE_SPEED_MBPS * w);
}

export default function BufferingCountdownEta() {
  const cardRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const etaRef = useRef<HTMLParagraphElement>(null);
  const detailRef = useRef<HTMLParagraphElement>(null);
  const pauseBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const track = trackRef.current;
    const fill = fillRef.current;
    const etaEl = etaRef.current;
    const detail = detailRef.current;
    const pauseBtn = pauseBtnRef.current;
    if (!card || !track || !fill || !etaEl || !detail || !pauseBtn) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let loadedMb = 0;
    let lastMs = 0;
    let paused = false;

    function paint(speed: number) {
      if (!fill || !track || !detail || !etaEl) return;
      const pct = Math.min(100, (loadedMb / TOTAL_MB) * 100);
      fill.style.setProperty('--fill-pct', pct.toFixed(1) + '%');
      track.setAttribute('aria-valuenow', String(Math.round(pct)));
      detail.textContent = loadedMb.toFixed(1) + 'MB / ' + TOTAL_MB.toFixed(1) + 'MB · ' + speed.toFixed(1) + 'MB/s';
      if (paused) {
        etaEl.textContent = '일시정지됨';
      } else if (loadedMb >= TOTAL_MB) {
        etaEl.textContent = '받기 완료';
      } else {
        // 남은 용량 ÷ 지금 속도 = 예상 시간 — 저장해 둔 카운트다운이 아니라 매 틱 새로 나눈 값
        const remaining = TOTAL_MB - loadedMb;
        const etaSec = remaining / speed;
        etaEl.textContent = '약 ' + Math.ceil(etaSec) + '초 남음';
      }
    }

    function tick(nowMs: number) {
      const dtMs = lastMs === 0 ? 0 : nowMs - lastMs;
      lastMs = nowMs;
      const speed = instSpeed(nowMs);
      if (!paused && loadedMb < TOTAL_MB) {
        loadedMb = Math.min(TOTAL_MB, loadedMb + speed * (dtMs / 1000));
      }
      if (loadedMb >= TOTAL_MB && !paused) {
        loadedMb = 0; // 데모 루프 — 완료 뒤 처음부터 다시
      }
      paint(speed);
    }

    let timer: ReturnType<typeof window.setInterval> | null = null;
    let start = 0;
    function loop() {
      tick(performance.now() - start);
    }

    function human() {
      if (card && card.classList.contains(styles['is-demo'])) {
        card.classList.remove(styles['is-demo']);
        if (timer !== null) window.clearInterval(timer);
        timer = null;
      }
    }

    function onPause() {
      human();
      if (!pauseBtn) return;
      paused = !paused;
      pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pauseBtn.textContent = paused ? '이어받기' : '일시정지';
      paint(instSpeed(performance.now() - start));
      if (!timer) {
        lastMs = performance.now() - start;
        timer = window.setInterval(loop, TICK_MS);
      }
    }
    pauseBtn.addEventListener('click', onPause);

    if (!reduce) {
      start = performance.now();
      tick(0);
      timer = window.setInterval(loop, TICK_MS);
    } else {
      // reduce: 실사용 경로 적용 — 채움 막대 전환만 멈추고 남은 시간 문구는 한 값으로 고정해 보여준다
      loadedMb = TOTAL_MB * 0.4;
      paint(BASE_SPEED_MBPS);
    }

    return () => {
      if (timer !== null) window.clearInterval(timer);
      pauseBtn.removeEventListener('click', onPause);
    };
  }, []);

  return (
    <div className={`${styles.etaCard} ${styles['is-demo']}`} ref={cardRef}>
      <div
        className={styles.track}
        ref={trackRef}
        role="progressbar"
        aria-label="받은 용량"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
      >
        <div className={styles.fill} ref={fillRef} />
      </div>
      <p className={styles.eta} ref={etaRef} aria-live="polite">계산 중</p>
      <p className={styles.detail} ref={detailRef}>0.0MB / 48.0MB · 0.0MB/s</p>
      <button className={styles.pauseBtn} ref={pauseBtnRef} type="button" aria-pressed="false">일시정지</button>
    </div>
  );
}
