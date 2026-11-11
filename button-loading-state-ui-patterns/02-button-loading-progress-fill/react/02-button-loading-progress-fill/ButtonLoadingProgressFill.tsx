import { useEffect, useRef } from 'react';
import styles from './ButtonLoadingProgressFill.module.scss';

const FILL_MS = 1100;
const HOLD_AT_FULL_MS = 500;
const SUCCESS_HOLD_MS = 350;
const GAP_MS = 450;
const START_DELAY_MS = 200;

export default function ButtonLoadingProgressFill() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const btn = btnRef.current;
    const fill = fillRef.current;
    const text = textRef.current;
    const status = statusRef.current;
    if (!scene || !btn || !fill || !text || !status) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let gen = 0;
    let timers: number[] = [];

    function human() {
      if (scene!.classList.contains(styles['is-demo'])) {
        scene!.classList.remove(styles['is-demo']);
        timers.forEach((t) => window.clearTimeout(t));
        timers = [];
      }
    }

    function easeOutCubic(p: number) { return 1 - Math.pow(1 - p, 3); }

    // 계산 겹: 채움 막대는 scaleX 로만 늘어난다(transform-origin: left — 시작 변에서 자란다는
    // 예외적 origin, 채움 막대이므로 허용). 진행률 p 는 easeOutCubic 으로 매 프레임 계산해
    // 같은 값을 style.transform 과 라벨의 퍼센트 숫자 둘 다에 쓴다.
    function drive(myGen: number, onDone: () => void) {
      let start: number | null = null;
      function step(now: number) {
        if (myGen !== gen) return;
        if (start === null) start = now;
        const raw = Math.min(1, (now - start) / FILL_MS);
        const p = easeOutCubic(raw);
        fill!.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        text!.textContent = 'Uploading ' + Math.round(p * 100) + '%';
        if (raw < 1) requestAnimationFrame(step); else onDone();
      }
      requestAnimationFrame(step);
    }

    function fadeOutFill(myGen: number, ms: number, onDone: () => void) {
      let start: number | null = null;
      function step(now: number) {
        if (myGen !== gen) return;
        if (start === null) start = now;
        const p = Math.min(1, (now - start) / ms);
        fill!.style.opacity = String(1 - p);
        if (p < 1) requestAnimationFrame(step); else onDone();
      }
      requestAnimationFrame(step);
    }

    function runAnimated() {
      gen++;
      const myGen = gen;
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      status!.textContent = '업로드하는 중';
      fill!.style.opacity = '1';
      fill!.style.transform = 'scaleX(0)';
      drive(myGen, () => {
        timers.push(window.setTimeout(() => {
          text!.textContent = 'Uploaded';
          status!.textContent = '업로드 완료';
          fadeOutFill(myGen, 260, () => {
            timers.push(window.setTimeout(() => {
              btn!.disabled = false;
              btn!.removeAttribute('aria-busy');
              text!.textContent = 'Upload file';
              fill!.style.transform = 'scaleX(0)';
            }, SUCCESS_HOLD_MS));
          });
        }, HOLD_AT_FULL_MS));
      });
    }

    function runReduced() {
      gen++;
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      status!.textContent = '업로드하는 중';
      fill!.style.opacity = '1';
      fill!.style.transform = 'scaleX(1)';
      text!.textContent = 'Uploading 100%';
      timers.push(window.setTimeout(() => {
        text!.textContent = 'Uploaded';
        status!.textContent = '업로드 완료';
        fill!.style.opacity = '0';
        timers.push(window.setTimeout(() => {
          btn!.disabled = false;
          btn!.removeAttribute('aria-busy');
          text!.textContent = 'Upload file';
          fill!.style.transform = 'scaleX(0)';
        }, SUCCESS_HOLD_MS));
      }, HOLD_AT_FULL_MS));
    }

    function onClick() {
      if (btn!.disabled) return;
      human();
      if (reduce) runReduced(); else runAnimated();
    }
    btn.addEventListener('click', onClick);

    // reduce: 실사용 경로 적용 — runReduced() 는 채움 트윈 없이 즉시 값을 바꾼다.
    // 아래 자동 루프는 시연 게이트만 — reduce 에서는 돌지 않는다.
    function cycle() {
      if (!scene!.classList.contains(styles['is-demo'])) return;
      runAnimated();
      timers.push(window.setTimeout(() => {
        timers.push(window.setTimeout(cycle, GAP_MS));
      }, FILL_MS + HOLD_AT_FULL_MS + 260 + SUCCESS_HOLD_MS));
    }

    if (!reduce) {
      timers.push(window.setTimeout(cycle, START_DELAY_MS));
    }

    return () => {
      btn.removeEventListener('click', onClick);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.scene + ' ' + styles['is-demo']} ref={sceneRef}>
        <button className={styles.btn} ref={btnRef} type="button">
          <span className={styles.btnFill} ref={fillRef} aria-hidden="true" />
          <span className={styles.btnText} ref={textRef}>Upload file</span>
        </button>
        <span className={styles.visuallyHidden} ref={statusRef} role="status" aria-live="polite" />
      </div>
    </main>
  );
}
