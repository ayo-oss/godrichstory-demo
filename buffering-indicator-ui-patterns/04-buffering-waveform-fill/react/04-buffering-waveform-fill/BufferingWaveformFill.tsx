import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import styles from './BufferingWaveformFill.module.scss';

const WAVEFORM_FILL_EASE: string = 'linear'; // 훅 — 변형이 cubic-bezier(.22,1,.36,1) 로 바꾸는 값
const BAR_COUNT = 22;
const LOOP_MS = 2000;
const TICK_MS = 70;
const BUMP_PX = 10; // 버퍼 경계 막대가 채워지는 순간 살짝 솟는 최대 높이

// 고정 패턴(사인 두 겹 합성) — Math.random 없이 매번 같은 파형을 만든다
const HEIGHTS: number[] = [];
for (let i = 0; i < BAR_COUNT; i++) {
  const v = 18 + 16 * Math.abs(Math.sin(i * 0.7)) + 8 * Math.abs(Math.sin(i * 1.9));
  HEIGHTS.push(Math.round(v));
}

// 3차 베지어 이징 평가기 — WAVEFORM_FILL_EASE 값을 실제 진행률 곡선에 반영한다
function bezier(x1: number, y1: number, x2: number, y2: number) {
  function bx(t: number) { return 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t; }
  function by(t: number) { return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t; }
  return function (x: number) {
    let t = x;
    for (let it = 0; it < 6; it++) {
      const cx = bx(t) - x;
      const d = 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
      if (Math.abs(d) < 1e-6) break;
      t -= cx / d;
      t = Math.min(1, Math.max(0, t));
    }
    return by(t);
  };
}

function easeFn(): (x: number) => number {
  if (WAVEFORM_FILL_EASE === 'linear') return (x: number) => x;
  const nums = WAVEFORM_FILL_EASE.replace('cubic-bezier(', '').replace(')', '').split(',').map(Number);
  return bezier(nums[0], nums[1], nums[2], nums[3]);
}

export default function BufferingWaveformFill() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const filmRef = useRef<HTMLDivElement>(null);
  const skipBtnRef = useRef<HTMLButtonElement>(null);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const film = filmRef.current;
    const skipBtn = skipBtnRef.current;
    const bars = barRefs.current;
    if (!wrap || !film || !skipBtn || !bars) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ease = easeFn();

    function paint(pct: number) {
      if (!film || !wrap) return;
      const pctStr = (pct * 100).toFixed(1) + '%';
      film.style.setProperty('--buffer-pct', pctStr);
      wrap.setAttribute('aria-valuenow', String(Math.round(pct * 100)));
      const raw = pct * BAR_COUNT;
      const idx = Math.min(BAR_COUNT - 1, Math.floor(raw));
      const frac = raw - idx;
      bars!.forEach((b, i) => {
        if (!b) return;
        const bump = i === idx ? Math.sin(frac * Math.PI) * BUMP_PX : 0;
        b.style.setProperty('--bump', bump.toFixed(1) + 'px');
      });
    }

    let manualPct: number | null = null;

    function tick(elapsedMs: number) {
      if (manualPct !== null) { paint(manualPct); return; }
      const t = (elapsedMs % LOOP_MS) / LOOP_MS;
      paint(ease(t));
    }

    let timer: ReturnType<typeof window.setInterval> | null = null;
    let start = 0;
    function loop() {
      tick(performance.now() - start);
    }

    function human() {
      if (wrap && wrap.classList.contains(styles['is-demo'])) {
        wrap.classList.remove(styles['is-demo']);
        if (timer !== null) window.clearInterval(timer);
        timer = null;
      }
    }

    function onSkip() {
      human();
      manualPct = 1;
      paint(1);
    }
    skipBtn.addEventListener('click', onSkip);

    if (!reduce) {
      start = performance.now();
      tick(0);
      timer = window.setInterval(loop, TICK_MS);
    } else {
      // reduce: 실사용 경로 — 채워지는 전환은 멈추고 버퍼 진행률을 고정된 한 장면으로만 보여준다
      paint(0.55);
    }

    return () => {
      if (timer !== null) window.clearInterval(timer);
      skipBtn.removeEventListener('click', onSkip);
    };
  }, []);

  return (
    <>
      <div
        className={`${styles.waveWrap} ${styles['is-demo']}`}
        ref={wrapRef}
        role="progressbar"
        aria-label="오디오 버퍼 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
      >
        <div className={styles.bars}>
          {HEIGHTS.map((h, i) => (
            <span
              key={i}
              className={styles.bar}
              ref={(el: HTMLSpanElement | null) => { if (barRefs.current) barRefs.current[i] = el; }}
              style={{ ['--h' as string]: h + 'px' } as CSSProperties}
            />
          ))}
        </div>
        <div className={styles.film} ref={filmRef} />
      </div>
      <button className={styles.skipBtn} ref={skipBtnRef} type="button">버퍼된 곳까지 건너뛰기</button>
    </>
  );
}
