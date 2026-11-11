import { useEffect, useRef } from 'react';
import styles from './ButtonLoadingMultiStepSequence.module.scss';

const STEP_INTERVAL_MS = 450;
const STEP_ANIM_MS = 220;
const FADE_MS = 160;
const DONE_HOLD_MS = 400;
const GAP_MS = 460;
const START_DELAY_MS = 200;
const STEP_LABELS = ['Preparing', 'Uploading', 'Verifying', 'Done'];
const STEP_STATUS = ['준비하는 중', '올리는 중', '확인하는 중', '완료'];

export default function ButtonLoadingMultiStepSequence() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const stepsRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const step0Ref = useRef<HTMLSpanElement>(null);
  const step1Ref = useRef<HTMLSpanElement>(null);
  const step2Ref = useRef<HTMLSpanElement>(null);
  const step3Ref = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const btn = btnRef.current;
    const label = labelRef.current;
    const steps = stepsRef.current;
    const track = trackRef.current;
    const step0 = step0Ref.current;
    const step1 = step1Ref.current;
    const step2 = step2Ref.current;
    const step3 = step3Ref.current;
    const status = statusRef.current;
    if (!scene || !btn || !label || !steps || !track || !step0 || !step1 || !step2 || !step3 || !status) return undefined;
    const stepEls = [step0, step1, step2, step3];
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

    function easeInOutQuad(p: number) { return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

    // 계산 겹: 각 단계 문구의 오프셋을 짐작하지 않고 offsetTop 으로 실측한다 — 트랙 안에서
    // 앞선 문구들이 쌓인 실제 높이만큼만 밀어 올리므로 줄 높이가 달라져도 어긋나지 않는다.
    function measureOffsets() {
      return stepEls.map((el) => el.offsetTop);
    }

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

    function slideTo(myGen: number, fromY: number, toY: number, ms: number, onDone: () => void) {
      let start: number | null = null;
      function step(now: number) {
        if (myGen !== gen) return;
        if (start === null) start = now;
        const p = easeInOutQuad(Math.min(1, (now - start) / ms));
        const y = fromY + (toY - fromY) * p;
        track!.style.transform = 'translateY(' + (-y).toFixed(2) + 'px)';
        if (p < 1) requestAnimationFrame(step); else onDone();
      }
      requestAnimationFrame(step);
    }

    function runAnimated() {
      gen++;
      const myGen = gen;
      const offsets = measureOffsets();
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      status!.textContent = STEP_STATUS[0];
      track!.style.transform = 'translateY(0px)';
      fade(label!, 1, 0, FADE_MS, myGen);
      fade(steps!, 0, 1, FADE_MS, myGen);

      function advance(i: number) {
        if (i >= offsets.length) {
          timers.push(window.setTimeout(() => {
            fade(steps!, 1, 0, FADE_MS, myGen);
            fade(label!, 0, 1, FADE_MS, myGen, () => {
              btn!.disabled = false;
              btn!.removeAttribute('aria-busy');
              label!.textContent = 'Submit';
              status!.textContent = '';
            });
          }, DONE_HOLD_MS));
          return;
        }
        status!.textContent = STEP_STATUS[i];
        timers.push(window.setTimeout(() => {
          if (i + 1 < offsets.length) {
            slideTo(myGen, offsets[i], offsets[i + 1], STEP_ANIM_MS, () => { advance(i + 1); });
          } else {
            advance(i + 1);
          }
        }, STEP_INTERVAL_MS));
      }
      advance(0);
    }

    function runReduced() {
      gen++;
      const myGen = gen;
      const offsets = measureOffsets();
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      label!.style.opacity = '0';
      steps!.style.opacity = '1';
      let i = 0;
      function tick() {
        if (myGen !== gen) return;
        status!.textContent = STEP_STATUS[i];
        track!.style.transform = 'translateY(' + (-offsets[i]).toFixed(2) + 'px)';
        if (i < offsets.length - 1) {
          i++;
          timers.push(window.setTimeout(tick, STEP_INTERVAL_MS));
        } else {
          timers.push(window.setTimeout(() => {
            steps!.style.opacity = '0';
            label!.style.opacity = '1';
            label!.textContent = 'Submit';
            btn!.disabled = false;
            btn!.removeAttribute('aria-busy');
            status!.textContent = '';
          }, DONE_HOLD_MS));
        }
      }
      tick();
    }

    function onClick() {
      if (btn!.disabled) return;
      human();
      if (reduce) runReduced(); else runAnimated();
    }
    btn.addEventListener('click', onClick);

    // reduce: 실사용 경로 적용 — runReduced() 는 슬라이드 트윈 없이 단계마다 즉시 위치를 바꾼다.
    // 아래 자동 루프는 시연 게이트만 — reduce 에서는 돌지 않는다.
    function cycle() {
      if (!scene!.classList.contains(styles['is-demo'])) return;
      runAnimated();
      const total = STEP_INTERVAL_MS * STEP_LABELS.length + STEP_ANIM_MS * (STEP_LABELS.length - 1) + DONE_HOLD_MS + FADE_MS;
      timers.push(window.setTimeout(() => {
        timers.push(window.setTimeout(cycle, GAP_MS));
      }, total));
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
          <span className={styles.btnContent}>
            <span className={styles.btnLabel} ref={labelRef}>Submit</span>
            <span className={styles.btnSteps} ref={stepsRef} aria-hidden="true">
              <span className={styles.btnStepsTrack} ref={trackRef}>
                <span className={styles.btnStep} ref={step0Ref}>Preparing</span>
                <span className={styles.btnStep} ref={step1Ref}>Uploading</span>
                <span className={styles.btnStep} ref={step2Ref}>Verifying</span>
                <span className={styles.btnStep} ref={step3Ref}>Done</span>
              </span>
            </span>
          </span>
        </button>
        <span className={styles.visuallyHidden} ref={statusRef} role="status" aria-live="polite" />
      </div>
    </main>
  );
}
