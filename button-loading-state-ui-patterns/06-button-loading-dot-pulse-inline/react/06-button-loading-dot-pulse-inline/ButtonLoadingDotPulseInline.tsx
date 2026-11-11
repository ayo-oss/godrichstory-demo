import { useEffect, useRef } from 'react';
import styles from './ButtonLoadingDotPulseInline.module.scss';

const FADE_MS = 160;
const LOAD_MS = 1100;
const GAP_MS = 480;
const START_DELAY_MS = 200;
const PULSE_PERIOD_MS = 900;
const PHASE_OFFSET_RAD = (2 * Math.PI) / 3;
const AMPLITUDE = 0.38;

export default function ButtonLoadingDotPulseInline() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const dotsRef = useRef<HTMLSpanElement>(null);
  const dot0Ref = useRef<HTMLSpanElement>(null);
  const dot1Ref = useRef<HTMLSpanElement>(null);
  const dot2Ref = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const btn = btnRef.current;
    const label = labelRef.current;
    const dots = dotsRef.current;
    const dot0 = dot0Ref.current;
    const dot1 = dot1Ref.current;
    const dot2 = dot2Ref.current;
    const status = statusRef.current;
    if (!scene || !btn || !label || !dots || !dot0 || !dot1 || !dot2 || !status) return undefined;
    const dotEls = [dot0, dot1, dot2];
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

    // 계산 겹: 점마다 위상을 다르게 준 사인파 scale_i(t) = 1 + A·sin(2π·t/period − i·phaseOffset)
    // 를 매 프레임 계산한다 — animation-delay 로 어긋나게 도는 방식이 아니라 각 점을 매번 직접 계산한다.
    function pulseLoop(myGen: number) {
      let start: number | null = null;
      function step(now: number) {
        if (myGen !== gen) return;
        if (start === null) start = now;
        const t = now - start;
        for (let i = 0; i < dotEls.length; i++) {
          const s = 1 + AMPLITUDE * Math.sin((2 * Math.PI * t) / PULSE_PERIOD_MS - i * PHASE_OFFSET_RAD);
          dotEls[i]!.style.transform = 'scale(' + s.toFixed(3) + ')';
        }
        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);
    }

    function runAnimated() {
      gen++;
      const myGen = gen;
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      status!.textContent = '보내는 중';
      fade(label!, 1, 0, FADE_MS, myGen);
      fade(dots!, 0, 1, FADE_MS, myGen, () => { pulseLoop(myGen); });
      timers.push(window.setTimeout(() => {
        cancelAnimationFrame(rafId);
        fade(dots!, 1, 0, FADE_MS, myGen);
        fade(label!, 0, 1, FADE_MS, myGen, () => {
          btn!.disabled = false;
          btn!.removeAttribute('aria-busy');
          status!.textContent = '전송 완료';
        });
      }, LOAD_MS));
    }

    function runReduced() {
      gen++;
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      status!.textContent = '보내는 중';
      label!.style.opacity = '0';
      dots!.style.opacity = '1';
      timers.push(window.setTimeout(() => {
        dots!.style.opacity = '0';
        label!.style.opacity = '1';
        btn!.disabled = false;
        btn!.removeAttribute('aria-busy');
        status!.textContent = '전송 완료';
      }, LOAD_MS));
    }

    function onClick() {
      if (btn!.disabled) return;
      human();
      if (reduce) runReduced(); else runAnimated();
    }
    btn.addEventListener('click', onClick);

    // reduce: 실사용 경로 적용 — runReduced() 는 펄스 트윈 없이 opacity 만 즉시 바꾼다.
    // 아래 자동 루프는 시연 게이트만 — reduce 에서는 돌지 않는다.
    function cycle() {
      if (!scene!.classList.contains(styles['is-demo'])) return;
      runAnimated();
      timers.push(window.setTimeout(() => {
        timers.push(window.setTimeout(cycle, GAP_MS));
      }, LOAD_MS + FADE_MS));
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
            <span className={styles.btnLabel} ref={labelRef}>Send</span>
            <span className={styles.btnDots} ref={dotsRef} aria-hidden="true">
              <span className={styles.btnDot} ref={dot0Ref} />
              <span className={styles.btnDot} ref={dot1Ref} />
              <span className={styles.btnDot} ref={dot2Ref} />
            </span>
          </span>
        </button>
        <span className={styles.visuallyHidden} ref={statusRef} role="status" aria-live="polite" />
      </div>
    </main>
  );
}
