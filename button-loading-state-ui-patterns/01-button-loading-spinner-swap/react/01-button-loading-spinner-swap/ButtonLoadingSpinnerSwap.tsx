import { useEffect, useRef } from 'react';
import styles from './ButtonLoadingSpinnerSwap.module.scss';

const FADE_MS = 180;
const SPIN_MS = 900;
const GAP_MS = 500;
const START_DELAY_MS = 200;
const DEG_PER_MS = 360 / 650;

export default function ButtonLoadingSpinnerSwap() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const spinnerWrapRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const btn = btnRef.current;
    const label = labelRef.current;
    const spinnerWrap = spinnerWrapRef.current;
    const ring = ringRef.current;
    const status = statusRef.current;
    if (!scene || !btn || !label || !spinnerWrap || !ring || !status) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let gen = 0;
    let timers: number[] = [];
    let rafId = 0;

    function human() {
      if (scene!.classList.contains(styles['is-demo'])) {
        scene!.classList.remove(styles['is-demo']);
        timers.forEach((t) => window.clearTimeout(t));
        timers = [];
      }
    }

    function easeInOutQuad(p: number) { return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

    function fade(el: HTMLElement, from: number, to: number, ms: number, myGen: number, onDone?: () => void) {
      let start: number | null = null;
      function step(now: number) {
        if (myGen !== gen) return;
        if (start === null) start = now;
        const p = Math.min(1, (now - start) / ms);
        el.style.opacity = String(from + (to - from) * easeInOutQuad(p));
        if (p < 1) requestAnimationFrame(step); else if (onDone) onDone();
      }
      requestAnimationFrame(step);
    }

    function spinLoop(myGen: number) {
      let start: number | null = null;
      function step(now: number) {
        if (myGen !== gen) return;
        if (start === null) start = now;
        const angle = ((now - start) * DEG_PER_MS) % 360;
        ring!.style.transform = 'rotate(' + angle.toFixed(1) + 'deg)';
        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);
    }

    // 계산 겹: 라벨이 보이는 지금 이 순간의 버튼 실측 폭을 lockWidth() 가 px 로 고정한다 —
    // 스피너로 바뀌며 콘텐츠 폭이 좁아져도 버튼이 함께 좁아지지 않는다.
    function lockWidth() {
      const w = btn!.getBoundingClientRect().width;
      btn!.style.width = w + 'px';
    }
    function unlockWidth() { btn!.style.width = ''; }

    function startLoad(myGen: number) {
      lockWidth();
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      status!.textContent = '저장하는 중';
      fade(label!, 1, 0, FADE_MS, myGen);
      fade(spinnerWrap!, 0, 1, FADE_MS, myGen, () => { spinLoop(myGen); });
    }
    function finishLoad(myGen: number) {
      cancelAnimationFrame(rafId);
      fade(spinnerWrap!, 1, 0, FADE_MS, myGen);
      fade(label!, 0, 1, FADE_MS, myGen, () => {
        btn!.disabled = false;
        btn!.removeAttribute('aria-busy');
        status!.textContent = '저장 완료';
        unlockWidth();
      });
    }

    function runAnimated() {
      gen++;
      const myGen = gen;
      startLoad(myGen);
      timers.push(window.setTimeout(() => { finishLoad(myGen); }, SPIN_MS));
    }

    function runReduced() {
      gen++;
      lockWidth();
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      status!.textContent = '저장하는 중';
      label!.style.opacity = '0';
      spinnerWrap!.style.opacity = '1';
      timers.push(window.setTimeout(() => {
        spinnerWrap!.style.opacity = '0';
        label!.style.opacity = '1';
        btn!.disabled = false;
        btn!.removeAttribute('aria-busy');
        status!.textContent = '저장 완료';
        unlockWidth();
      }, SPIN_MS));
    }

    function onClick() {
      if (btn!.disabled) return;
      human();
      if (reduce) runReduced(); else runAnimated();
    }
    btn.addEventListener('click', onClick);

    // reduce: 실사용 경로 적용 — runReduced() 는 회전 트윈 없이 opacity 만 즉시 바꾼다.
    // 아래 자동 루프는 시연 게이트만 — reduce 에서는 돌지 않는다.
    function cycle() {
      if (!scene!.classList.contains(styles['is-demo'])) return;
      runAnimated();
      timers.push(window.setTimeout(() => {
        timers.push(window.setTimeout(cycle, GAP_MS));
      }, SPIN_MS));
    }

    if (!reduce) {
      timers.push(window.setTimeout(cycle, START_DELAY_MS));
    }

    return () => {
      btn.removeEventListener('click', onClick);
      timers.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.scene + ' ' + styles['is-demo']} ref={sceneRef}>
        <button className={styles.btn} ref={btnRef} type="button">
          <span className={styles.btnContent}>
            <span className={styles.btnLabel} ref={labelRef}>Save changes</span>
            <span className={styles.btnSpinner} ref={spinnerWrapRef} aria-hidden="true">
              <span className={styles.btnRing} ref={ringRef} />
            </span>
          </span>
        </button>
        <span className={styles.visuallyHidden} ref={statusRef} role="status" aria-live="polite" />
      </div>
    </main>
  );
}
