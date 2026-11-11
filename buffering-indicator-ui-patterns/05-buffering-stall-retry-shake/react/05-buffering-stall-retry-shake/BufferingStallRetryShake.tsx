import { useEffect, useRef } from 'react';
import styles from './BufferingStallRetryShake.module.scss';

const LOOP_MS = 2000;
const TICK_MS = 30;
const NORMAL_FRAC = 0.15; // 이 지점까지는 정상 재생
const STALL_FRAC = 0.92; // 이 지점부터 재생 재개
const STALL_THRESHOLD_MS = 300; // 정지가 이만큼 지속돼야 흔들림이 시작된다
const SHAKE_DECAY = 0.0018; // 감쇠율 — 클수록 빨리 잦아든다
const SHAKE_FREQ = 0.05; // 각속도
const SHAKE_AMP_PX = 9;

// 정지 지속 시간(ms) 을 감쇠 사인파의 위상으로 바꿔 흔들림 폭을 계산한다 — CSS keyframe 이 아니라 매 틱 산술
function shakeOffset(stallOverMs: number) {
  const amp = SHAKE_AMP_PX * Math.exp(-SHAKE_DECAY * stallOverMs);
  return amp * Math.sin(stallOverMs * SHAKE_FREQ);
}

const ICON_PATHS = [
  'M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88',
  'M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0',
];

export default function BufferingStallRetryShake() {
  const cardRef = useRef<HTMLDivElement>(null);
  const iconWrapRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const retryBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const iconWrap = iconWrapRef.current;
    const status = statusRef.current;
    const retryBtn = retryBtnRef.current;
    if (!card || !iconWrap || !status || !retryBtn) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setStatus(text: string) {
      if (status && status.textContent !== text) status.textContent = text;
    }

    let manualRecovered: boolean | null = null;

    function tick(elapsedMs: number) {
      if (manualRecovered !== null || !card || !iconWrap) return;
      const loopPos = elapsedMs % LOOP_MS;
      const normalEnd = LOOP_MS * NORMAL_FRAC;
      const stallEnd = LOOP_MS * STALL_FRAC;
      if (loopPos < normalEnd) {
        setStatus('정상 재생');
        iconWrap.style.transform = 'translateX(0px)';
        card.classList.remove(styles.isStalled);
      } else if (loopPos < stallEnd) {
        const stallElapsed = loopPos - normalEnd;
        card.classList.add(styles.isStalled);
        if (stallElapsed > STALL_THRESHOLD_MS) {
          setStatus('연결이 끊겨 다시 시도하는 중');
          const offset = shakeOffset(stallElapsed - STALL_THRESHOLD_MS);
          iconWrap.style.transform = 'translateX(' + offset.toFixed(2) + 'px)';
        } else {
          setStatus('정지됨');
          iconWrap.style.transform = 'translateX(0px)';
        }
      } else {
        setStatus('재생 재개');
        iconWrap.style.transform = 'translateX(0px)';
        card.classList.remove(styles.isStalled);
      }
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

    function onRetry() {
      human();
      manualRecovered = true;
      if (card) card.classList.remove(styles.isStalled);
      if (iconWrap) iconWrap.style.transform = 'translateX(0px)';
      setStatus('재생 재개');
    }
    retryBtn.addEventListener('click', onRetry);

    if (!reduce) {
      start = performance.now();
      tick(0);
      timer = window.setInterval(loop, TICK_MS);
    } else {
      // reduce: 실사용 경로 적용 — 흔들림(진동)만 멈추고 정지 상태·문구는 그대로 전달한다
      card.classList.add(styles.isStalled);
      setStatus('정지됨');
    }

    return () => {
      if (timer !== null) window.clearInterval(timer);
      retryBtn.removeEventListener('click', onRetry);
    };
  }, []);

  return (
    <div className={`${styles.stallCard} ${styles['is-demo']}`} ref={cardRef}>
      <div className={styles.iconWrap} ref={iconWrapRef} aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">
          <g fill="currentColor">
            <path d={ICON_PATHS[0]} opacity=".2" />
            <path d={ICON_PATHS[1]} />
          </g>
        </svg>
      </div>
      <p className={styles.status} ref={statusRef} aria-live="polite">정상 재생</p>
      <button className={styles.retryBtn} ref={retryBtnRef} type="button">지금 다시 시도</button>
    </div>
  );
}
