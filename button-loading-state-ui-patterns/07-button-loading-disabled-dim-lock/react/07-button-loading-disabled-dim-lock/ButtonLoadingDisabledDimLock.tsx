import { useEffect, useRef } from 'react';
import styles from './ButtonLoadingDisabledDimLock.module.scss';

const COOLDOWN_MS = 1300;
const FADE_MS = 160;
const GAP_MS = 480;
const START_DELAY_MS = 200;
const BASE_HZ = 0.6;
const MAX_HZ = 2.4;

export default function ButtonLoadingDisabledDimLock() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const filmRef = useRef<HTMLSpanElement>(null);
  const lockWrapRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const btn = btnRef.current;
    const film = filmRef.current;
    const lockWrap = lockWrapRef.current;
    const status = statusRef.current;
    if (!scene || !btn || !film || !lockWrap || !status) return undefined;
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

    function clamp01(v: number) { return Math.min(1, Math.max(0, v)); }

    // 계산 겹: 남은 시간(remaining)이 줄어들수록 진동수를 BASE_HZ→MAX_HZ 로 끌어올린다.
    // 진동수가 시간에 따라 바뀌므로 sin(2π·f·t) 를 그대로 쓸 수 없어 phase 를 프레임 델타로
    // 직접 적분한다(phase += 2π·f(now)·dt) — 막이 남은 시간이 줄수록 더 빨리 깜빡인다.
    function pulseLoop(myGen: number) {
      let last: number | null = null;
      let phase = 0;
      let loopStart: number | null = null;
      function step(now: number) {
        if (myGen !== gen) return;
        if (last === null) { last = now; loopStart = now; }
        const dt = now - last;
        last = now;
        const elapsed = now - loopStart!;
        const remainingFrac = clamp01(1 - elapsed / COOLDOWN_MS);
        const freq = BASE_HZ + (MAX_HZ - BASE_HZ) * (1 - remainingFrac);
        phase += 2 * Math.PI * freq * (dt / 1000);
        const wave = (1 + Math.sin(phase)) / 2;
        film!.style.opacity = String(.14 + .16 * wave);
        rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);
    }

    function fade(el: HTMLElement, from: number, to: number, ms: number, myGen: number, onDone?: () => void) {
      let start: number | null = null;
      function step(now: number) {
        if (myGen !== gen) return;
        if (start === null) start = now;
        const p = Math.min(1, (now - start) / ms);
        el.style.opacity = String(from + (to - from) * p);
        if (p < 1) requestAnimationFrame(step); else if (onDone) onDone();
      }
      requestAnimationFrame(step);
    }

    function runAnimated() {
      gen++;
      const myGen = gen;
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      status!.textContent = '잠시 기다리는 중';
      fade(lockWrap!, 0, 1, FADE_MS, myGen);
      film!.style.opacity = '.14';
      pulseLoop(myGen);
      timers.push(window.setTimeout(() => {
        cancelAnimationFrame(rafId);
        fade(film!, parseFloat(film!.style.opacity || '0'), 0, FADE_MS, myGen);
        fade(lockWrap!, 1, 0, FADE_MS, myGen, () => {
          btn!.disabled = false;
          btn!.removeAttribute('aria-busy');
          status!.textContent = '';
        });
      }, COOLDOWN_MS));
    }

    function runReduced() {
      gen++;
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      status!.textContent = '잠시 기다리는 중';
      film!.style.opacity = '.2';
      lockWrap!.style.opacity = '1';
      timers.push(window.setTimeout(() => {
        film!.style.opacity = '0';
        lockWrap!.style.opacity = '0';
        btn!.disabled = false;
        btn!.removeAttribute('aria-busy');
        status!.textContent = '';
      }, COOLDOWN_MS));
    }

    function onClick() {
      if (btn!.disabled) return;
      human();
      if (reduce) runReduced(); else runAnimated();
    }
    btn.addEventListener('click', onClick);

    // reduce: 실사용 경로 적용 — runReduced() 는 진동수 계산 없이 고정 opacity 로 즉시 바뀐다.
    // 아래 자동 루프는 시연 게이트만 — reduce 에서는 돌지 않는다.
    function cycle() {
      if (!scene!.classList.contains(styles['is-demo'])) return;
      runAnimated();
      timers.push(window.setTimeout(() => {
        timers.push(window.setTimeout(cycle, GAP_MS));
      }, COOLDOWN_MS + FADE_MS));
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
          <span className={styles.btnFilm} ref={filmRef} aria-hidden="true" />
          <span className={styles.btnLockWrap} ref={lockWrapRef} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="14" height="14">
              <g fill="currentColor">
                <path d="M208 88H48a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8V96a8 8 0 0 0-8-8m-80 72a20 20 0 1 1 20-20a20 20 0 0 1-20 20" opacity=".2" />
                <path d="M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16M96 56a32 32 0 0 1 64 0v24H96Zm112 152H48V96h160zm-80-96a28 28 0 0 0-8 54.83V184a8 8 0 0 0 16 0v-17.17a28 28 0 0 0-8-54.83m0 40a12 12 0 1 1 12-12a12 12 0 0 1-12 12" />
              </g>
            </svg>
          </span>
          <span className={styles.btnLabel}>Confirm</span>
        </button>
        <span className={styles.visuallyHidden} ref={statusRef} role="status" aria-live="polite" />
      </div>
    </main>
  );
}
