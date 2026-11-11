import { useEffect, useRef } from 'react';
import styles from './ButtonLoadingReducedMotionStatic.module.scss';

const FADE_MS = 180;
const SPIN_MS = 900;
const GAP_MS = 500;
const START_DELAY_MS = 200;
const TOGGLE_GAP_MS = 550;
const DEG_PER_MS = 360 / 650;

export default function ButtonLoadingReducedMotionStatic() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const spinnerWrapRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const dotWrapRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const btn = btnRef.current;
    const label = labelRef.current;
    const spinnerWrap = spinnerWrapRef.current;
    const ring = ringRef.current;
    const dotWrap = dotWrapRef.current;
    const status = statusRef.current;
    const toggle = toggleRef.current;
    const knob = knobRef.current;
    if (!scene || !btn || !label || !spinnerWrap || !ring || !dotWrap || !status || !toggle || !knob) return undefined;

    // 실제 OS 설정을 진짜로 읽는다 — 기본 상태는 이 값을 따른다.
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    let osReduce = mql.matches;
    let simReduce = osReduce;

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

    function setToggleUI() {
      toggle!.setAttribute('aria-checked', simReduce ? 'true' : 'false');
      knob!.style.transform = simReduce ? 'translateX(16px)' : 'translateX(0px)';
    }

    function applyToggle(next: boolean) {
      simReduce = next;
      setToggleUI();
    }

    // 시뮬 토글 — 방문자가 실제 OS 설정과 무관하게 두 상태를 미리 볼 수 있다.
    function onToggleClick() {
      human();
      applyToggle(!simReduce);
    }
    toggle.addEventListener('click', onToggleClick);

    if (osReduce) setToggleUI();

    // 실사용 경로 적용 — 진짜 OS 값이 바뀌면(브라우저·OS 설정 변경) 시뮬 토글도 따라간다.
    function onOsChange(e: MediaQueryListEvent) {
      osReduce = e.matches;
      applyToggle(osReduce);
    }
    if (mql.addEventListener) mql.addEventListener('change', onOsChange);

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

    function runLoad(myGen: number, useStaticDot: boolean, onDone?: () => void) {
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      status!.textContent = '저장하는 중';
      if (useStaticDot) {
        dotWrap!.style.opacity = '1';
      } else {
        fade(spinnerWrap!, 0, 1, FADE_MS, myGen, () => { spinLoop(myGen); });
      }
      timers.push(window.setTimeout(() => {
        cancelAnimationFrame(rafId);
        dotWrap!.style.opacity = '0';
        spinnerWrap!.style.opacity = '0';
        btn!.disabled = false;
        btn!.removeAttribute('aria-busy');
        status!.textContent = '저장 완료';
        if (onDone) onDone();
      }, SPIN_MS));
    }

    function onClick() {
      if (btn!.disabled) return;
      human();
      gen++;
      runLoad(gen, simReduce);
    }
    btn.addEventListener('click', onClick);

    // reduce: 시연 게이트만 — 아래 자동 루프는 reduce 여부와 무관하게 두 상태를 번갈아 보여주려고
    // 계속 돈다(정지 표시 자체가 이 항목의 주제라 자동 루프를 완전히 끄면 데모가 항상 빈 화면이다).
    // 실사용 경로는 위 runLoad(simReduce) 가 osReduce 시작값을 그대로 물려받아 처리한다.
    function cycle() {
      if (!scene!.classList.contains(styles['is-demo'])) return;
      gen++;
      const myGen = gen;
      const useStaticDot = simReduce;
      runLoad(myGen, useStaticDot, () => {
        timers.push(window.setTimeout(() => {
          if (!scene!.classList.contains(styles['is-demo'])) return;
          applyToggle(!simReduce);
          timers.push(window.setTimeout(cycle, TOGGLE_GAP_MS));
        }, GAP_MS));
      });
    }

    timers.push(window.setTimeout(cycle, START_DELAY_MS));

    return () => {
      btn.removeEventListener('click', onClick);
      toggle.removeEventListener('click', onToggleClick);
      if (mql.removeEventListener) mql.removeEventListener('change', onOsChange);
      timers.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.scene + ' ' + styles['is-demo']} ref={sceneRef}>
        <div className={styles.togglePanel}>
          <span className={styles.toggleLabel}>Reduce motion preview</span>
          <button
            className={styles.toggleSwitch}
            ref={toggleRef}
            type="button"
            role="switch"
            aria-checked="false"
            aria-label="Reduce motion preview"
          >
            <span className={styles.toggleKnob} ref={knobRef} />
          </button>
        </div>
        <button className={styles.btn} ref={btnRef} type="button">
          <span className={styles.btnContent}>
            <span className={styles.btnLabel} ref={labelRef}>Save</span>
            <span className={styles.btnSpinnerWrap} ref={spinnerWrapRef} aria-hidden="true">
              <span className={styles.btnRing} ref={ringRef} />
            </span>
            <span className={styles.btnDotWrap} ref={dotWrapRef} aria-hidden="true">
              <span className={styles.btnDot} />
            </span>
          </span>
        </button>
        <span className={styles.visuallyHidden} ref={statusRef} role="status" aria-live="polite" />
      </div>
    </main>
  );
}
