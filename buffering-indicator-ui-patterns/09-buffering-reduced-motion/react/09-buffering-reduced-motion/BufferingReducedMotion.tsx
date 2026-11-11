import { useEffect, useRef } from 'react';
import styles from './BufferingReducedMotion.module.scss';

const SPIN_MS = 1600;
const TICK_MS = 40;
const REDUCED_STEP_MS = 900; // 동작 줄임판은 이 간격마다 한 번씩만 상태를 바꾼다(연속 회전 없음)

// 왼쪽(동작 유지)은 각도를 연속으로 계산해 회전시키고, 오른쪽(동작 줄임)은 같은 시간 입력을
// REDUCED_STEP_MS 단위로 끊어(정수 나눗셈) 계단식으로만 바꾼다 — 두 분기를 같은 시계로 비교하는 계산.
function tickMotion(ms: number) {
  return (ms % SPIN_MS) / SPIN_MS * 360;
}

function tickReduced(ms: number) {
  return Math.floor(ms / REDUCED_STEP_MS) % 2;
}

export default function BufferingReducedMotion() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const sysStatusRef = useRef<HTMLParagraphElement>(null);
  const ringMotionRef = useRef<HTMLSpanElement>(null);
  const ringReducedRef = useRef<HTMLSpanElement>(null);
  const previewBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const sysStatus = sysStatusRef.current;
    const ringMotion = ringMotionRef.current;
    const ringReduced = ringReducedRef.current;
    const previewBtn = previewBtnRef.current;
    if (!wrap || !sysStatus || !ringMotion || !ringReduced || !previewBtn) return undefined;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    // 실사용 경로 적용 — 실제 OS 환경설정이 바뀌면 이 리스너가 즉시 문구를 다시 쓴다(새로고침 불필요)
    function updateSystemStatus() {
      if (!sysStatus) return;
      sysStatus.textContent = '시스템 설정: 동작 줄이기 ' + (mq.matches ? '켜짐' : '꺼짐');
    }
    mq.addEventListener('change', updateSystemStatus);
    updateSystemStatus();

    function paintMotion(ms: number) {
      if (!ringMotion) return;
      const deg = tickMotion(ms);
      ringMotion.style.transform = 'rotate(' + deg.toFixed(1) + 'deg)';
    }

    function paintReduced(ms: number) {
      if (!ringReduced) return;
      const step = tickReduced(ms);
      ringReduced.style.setProperty('--dim', step === 0 ? '1' : '.45');
    }

    let timer: ReturnType<typeof window.setInterval> | null = null;
    let start = 0;
    function loop() {
      const ms = performance.now() - start;
      paintMotion(ms);
      paintReduced(ms);
    }

    function human() {
      if (wrap && wrap.classList.contains(styles['is-demo'])) {
        wrap.classList.remove(styles['is-demo']);
        if (timer !== null) window.clearInterval(timer);
        timer = null;
      }
    }

    // 시연 게이트만 — 실제 시스템 설정과 무관하게, 이 데모 안에서만 두 판을 동시에 보여주는 비교 토글이다
    let comparing = true;
    function onPreview() {
      human();
      if (!wrap || !previewBtn) return;
      comparing = !comparing;
      previewBtn.setAttribute('aria-pressed', comparing ? 'true' : 'false');
      previewBtn.textContent = comparing ? '동작 유지판 숨기기' : '두 판 나란히 미리보기';
      wrap.classList.toggle(styles['single-panel'], !comparing);
    }
    previewBtn.addEventListener('click', onPreview);

    start = performance.now();
    paintMotion(0);
    paintReduced(0);
    timer = window.setInterval(loop, TICK_MS);

    return () => {
      if (timer !== null) window.clearInterval(timer);
      previewBtn.removeEventListener('click', onPreview);
      mq.removeEventListener('change', updateSystemStatus);
    };
  }, []);

  return (
    <div className={`${styles.compareWrap} ${styles['is-demo']}`} ref={wrapRef}>
      <p className={styles.sysStatus} ref={sysStatusRef} aria-live="polite">시스템 설정 확인 중</p>
      <div className={styles.panels}>
        <div className={styles.panel}>
          <span className={`${styles.ring} ${styles.ringMotion}`} ref={ringMotionRef} aria-hidden="true" />
          <p className={styles.panelLabel}>동작 유지판</p>
        </div>
        <div className={styles.panel}>
          <span className={`${styles.ring} ${styles.ringReduced}`} ref={ringReducedRef} aria-hidden="true" />
          <p className={styles.panelLabel}>동작 줄임판</p>
        </div>
      </div>
      <button className={styles.previewBtn} ref={previewBtnRef} type="button" aria-pressed="false">두 판 나란히 미리보기</button>
    </div>
  );
}
