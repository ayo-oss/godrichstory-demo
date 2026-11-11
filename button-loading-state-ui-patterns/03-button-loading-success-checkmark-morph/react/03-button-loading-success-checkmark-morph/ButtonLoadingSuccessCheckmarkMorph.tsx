import { useEffect, useRef } from 'react';
import styles from './ButtonLoadingSuccessCheckmarkMorph.module.scss';

const SPIN_MS = 700;
const DRAW_MS = 420;
const HOLD_MS = 450;
const RESET_MS = 220;
const GAP_MS = 450;
const START_DELAY_MS = 200;
const DEG_PER_MS = 360 / 800;

export default function ButtonLoadingSuccessCheckmarkMorph() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tintRef = useRef<HTMLSpanElement>(null);
  const ringWrapRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const checkWrapRef = useRef<HTMLSpanElement>(null);
  const checkPathRef = useRef<SVGPathElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const btn = btnRef.current;
    const tint = tintRef.current;
    const ringWrap = ringWrapRef.current;
    const ring = ringRef.current;
    const checkWrap = checkWrapRef.current;
    const checkPath = checkPathRef.current;
    const text = textRef.current;
    const status = statusRef.current;
    if (!scene || !btn || !tint || !ringWrap || !ring || !checkWrap || !checkPath || !text || !status) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let gen = 0;
    let timers: number[] = [];
    let rafId = 0;

    // 계산 겹: 체크 path 의 실제 길이를 getTotalLength() 로 실측해 stroke-dasharray/offset 을
    // 그 값으로 맞춘다 — 임의 숫자를 넣으면 선이 끝까지 안 그려지거나 남는다.
    const checkLen = checkPath.getTotalLength();
    checkPath.style.strokeDasharray = String(checkLen);
    checkPath.style.strokeDashoffset = String(checkLen);

    function human() {
      if (scene!.classList.contains(styles['is-demo'])) {
        scene!.classList.remove(styles['is-demo']);
        timers.forEach((t) => window.clearTimeout(t));
        timers = [];
      }
    }

    function easeOutCubic(p: number) { return 1 - Math.pow(1 - p, 3); }

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

    // 한 번의 rAF 루프가 링 opacity · 체크 opacity · 체크 draw 길이 · 틴트 opacity 넷을
    // 같은 진행률 p 로 동시에 몰아 "모양이 이어져 바뀐다"는 인상을 만든다.
    function morph(myGen: number, onDone: () => void) {
      let start: number | null = null;
      function step(now: number) {
        if (myGen !== gen) return;
        if (start === null) start = now;
        const p = easeOutCubic(Math.min(1, (now - start) / DRAW_MS));
        ringWrap!.style.opacity = String(1 - p);
        checkWrap!.style.opacity = String(p);
        checkPath!.style.strokeDashoffset = String(checkLen * (1 - p));
        tint!.style.opacity = String(p * .5);
        if (p < 1) requestAnimationFrame(step); else onDone();
      }
      requestAnimationFrame(step);
    }

    function reset() {
      cancelAnimationFrame(rafId);
      ring!.style.transform = 'rotate(0deg)';
      ringWrap!.style.opacity = '1';
      checkWrap!.style.opacity = '0';
      checkPath!.style.strokeDashoffset = String(checkLen);
      tint!.style.opacity = '0';
    }

    function runAnimated() {
      gen++;
      const myGen = gen;
      reset();
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      status!.textContent = '처리하는 중';
      text!.textContent = 'Processing';
      spinLoop(myGen);
      timers.push(window.setTimeout(() => {
        cancelAnimationFrame(rafId);
        text!.textContent = 'Confirmed';
        status!.textContent = '처리 완료';
        morph(myGen, () => {
          timers.push(window.setTimeout(() => {
            btn!.disabled = false;
            btn!.removeAttribute('aria-busy');
            text!.textContent = 'Confirm order';
            reset();
          }, HOLD_MS));
        });
      }, SPIN_MS));
    }

    function runReduced() {
      gen++;
      reset();
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      status!.textContent = '처리하는 중';
      text!.textContent = 'Processing';
      timers.push(window.setTimeout(() => {
        text!.textContent = 'Confirmed';
        status!.textContent = '처리 완료';
        ringWrap!.style.opacity = '0';
        checkWrap!.style.opacity = '1';
        checkPath!.style.strokeDashoffset = '0';
        tint!.style.opacity = '.5';
        timers.push(window.setTimeout(() => {
          btn!.disabled = false;
          btn!.removeAttribute('aria-busy');
          text!.textContent = 'Confirm order';
          reset();
        }, HOLD_MS));
      }, SPIN_MS));
    }

    function onClick() {
      if (btn!.disabled) return;
      human();
      if (reduce) runReduced(); else runAnimated();
    }
    btn.addEventListener('click', onClick);

    // reduce: 실사용 경로 적용 — runReduced() 는 회전·드로잉 트윈 없이 opacity/offset 을 즉시 바꾼다.
    // 아래 자동 루프는 시연 게이트만 — reduce 에서는 돌지 않는다.
    function cycle() {
      if (!scene!.classList.contains(styles['is-demo'])) return;
      runAnimated();
      timers.push(window.setTimeout(() => {
        timers.push(window.setTimeout(cycle, GAP_MS));
      }, SPIN_MS + DRAW_MS + HOLD_MS + RESET_MS));
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
          <span className={styles.btnTint} ref={tintRef} aria-hidden="true" />
          <span className={styles.iconWrap} aria-hidden="true">
            <span className={styles.ringWrap} ref={ringWrapRef}>
              <svg viewBox="0 0 24 24" width="18" height="18" className={styles.ringSvg}>
                <circle ref={ringRef} cx="12" cy="12" r="9" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="34 22" />
              </svg>
            </span>
            <span className={styles.checkWrap} ref={checkWrapRef}>
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path ref={checkPathRef} d="M4 12 L9.5 17.5 L20 6" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </span>
          <span className={styles.btnText} ref={textRef}>Confirm order</span>
        </button>
        <span className={styles.visuallyHidden} ref={statusRef} role="status" aria-live="polite" />
      </div>
    </main>
  );
}
