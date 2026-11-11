import { useEffect, useRef } from 'react';
import styles from './ButtonLoadingIconOnlyCollapse.module.scss';

const COLLAPSE_MS = 380;
const LABEL_FADE_MS = 150;
const HOLD_MS = 700;
const EXPAND_MS = 380;
const GAP_MS = 450;
const START_DELAY_MS = 200;
const COLLAPSED_WIDTH_PX = 44;

export default function ButtonLoadingIconOnlyCollapse() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const btn = btnRef.current;
    const icon = iconRef.current;
    const label = labelRef.current;
    const status = statusRef.current;
    if (!scene || !btn || !icon || !label || !status) return undefined;
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

    // 계산 겹: 지금 렌더된 버튼 실측 폭(fullWidth)과 아이콘 하나가 들어갈 목표 폭을 비교해
    // collapsedRatio 를 구하고, 매 프레임 scale 값으로 btn 을 scaleX 하면서 아이콘엔 1/scale
    // 역스케일을 걸어 버튼이 좁아지는 동안에도 아이콘 자체는 눌리지 않게 만든다.
    function driveScale(myGen: number, fromScale: number, toScale: number, ms: number, onDone: () => void) {
      const fullWidth = btn!.getBoundingClientRect().width / fromScale;
      const collapsedRatio = COLLAPSED_WIDTH_PX / fullWidth;
      const resolvedFrom = fromScale === 1 ? 1 : collapsedRatio;
      const resolvedTo = toScale === 1 ? 1 : collapsedRatio;
      let start: number | null = null;
      function step(now: number) {
        if (myGen !== gen) return;
        if (start === null) start = now;
        const p = easeInOutQuad(Math.min(1, (now - start) / ms));
        const scale = resolvedFrom + (resolvedTo - resolvedFrom) * p;
        btn!.style.transform = 'scaleX(' + scale.toFixed(4) + ')';
        icon!.style.transform = 'scaleX(' + (1 / scale).toFixed(4) + ')';
        if (p < 1) requestAnimationFrame(step); else onDone();
      }
      requestAnimationFrame(step);
    }

    function fade(el: HTMLElement, from: number, to: number, ms: number, myGen: number) {
      let start: number | null = null;
      function step(now: number) {
        if (myGen !== gen) return;
        if (start === null) start = now;
        const p = Math.min(1, (now - start) / ms);
        el.style.opacity = String(from + (to - from) * p);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function reset() {
      btn!.style.transform = 'scaleX(1)';
      icon!.style.transform = 'scaleX(1)';
      label!.style.opacity = '1';
    }

    function runAnimated() {
      gen++;
      const myGen = gen;
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      status!.textContent = '전송하는 중';
      fade(label!, 1, 0, LABEL_FADE_MS, myGen);
      driveScale(myGen, 1, 0, COLLAPSE_MS, () => {
        timers.push(window.setTimeout(() => {
          status!.textContent = '전송 완료';
          driveScale(myGen, 0, 1, EXPAND_MS, () => {
            fade(label!, 0, 1, LABEL_FADE_MS, myGen);
            btn!.disabled = false;
            btn!.removeAttribute('aria-busy');
          });
        }, HOLD_MS));
      });
    }

    function runReduced() {
      gen++;
      btn!.disabled = true;
      btn!.setAttribute('aria-busy', 'true');
      status!.textContent = '전송하는 중';
      const fullWidth = btn!.getBoundingClientRect().width;
      const collapsedRatio = COLLAPSED_WIDTH_PX / fullWidth;
      label!.style.opacity = '0';
      btn!.style.transform = 'scaleX(' + collapsedRatio.toFixed(4) + ')';
      icon!.style.transform = 'scaleX(' + (1 / collapsedRatio).toFixed(4) + ')';
      timers.push(window.setTimeout(() => {
        status!.textContent = '전송 완료';
        reset();
        btn!.disabled = false;
        btn!.removeAttribute('aria-busy');
      }, HOLD_MS));
    }

    function onClick() {
      if (btn!.disabled) return;
      human();
      if (reduce) runReduced(); else runAnimated();
    }
    btn.addEventListener('click', onClick);

    // reduce: 실사용 경로 적용 — runReduced() 는 scaleX 트윈 없이 즉시 좁아지고 즉시 되돌아간다.
    // 아래 자동 루프는 시연 게이트만 — reduce 에서는 돌지 않는다.
    function cycle() {
      if (!scene!.classList.contains(styles['is-demo'])) return;
      runAnimated();
      timers.push(window.setTimeout(() => {
        timers.push(window.setTimeout(cycle, GAP_MS));
      }, COLLAPSE_MS + HOLD_MS + EXPAND_MS));
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
          <span className={styles.btnIcon} ref={iconRef} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="18" height="18">
              <g fill="currentColor">
                <path d="m216 128l-72 72V56Z" opacity=".2" />
                <path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z" />
              </g>
            </svg>
          </span>
          <span className={styles.btnLabel} ref={labelRef}>Send message</span>
        </button>
        <span className={styles.visuallyHidden} ref={statusRef} role="status" aria-live="polite" />
      </div>
    </main>
  );
}
