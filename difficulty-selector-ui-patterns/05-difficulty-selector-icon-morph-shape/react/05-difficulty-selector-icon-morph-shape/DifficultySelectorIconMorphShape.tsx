import { useEffect, useRef } from 'react';
import styles from './DifficultySelectorIconMorphShape.module.scss';

const LEVELS = ['쉬움', '보통', '어려움', '매우 어려움', '최고'];
const SIDES = [3, 4, 5, 6, 7];
const POINTS = 7, CX = 40, CY = 40, R = 30, MORPH_MS = 420;
const SEQUENCE = [4, 0, 3, 1, 2];
const TICK_MS = 900;

export default function DifficultySelectorIconMorphShape() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<HTMLButtonElement[]>([]);
  const labelRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const path = pathRef.current;
    const label = labelRef.current;
    if (!root || !path || !label || !dotRefs.current) return undefined;
    const dots = dotRefs.current;
    if (dots.length !== LEVELS.length) return undefined;

    let tier = 2;
    let raf = 0, t0 = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 계산 겹: 정다각형의 변 수(sides)와 각도(theta)로 그 방향의 반지름을 구하는 기하 공식.
    // theta 가 한 변의 중심에서 멀어질수록(꼭짓점에 가까울수록) 반지름이 길어진다
    function polygonRadius(theta: number, sides: number) {
      const seg = (2 * Math.PI) / sides;
      const a = ((theta % seg) + seg) % seg - seg / 2;
      return R * Math.cos(seg / 2) / Math.cos(a);
    }
    function angleAt(i: number) { return (i / POINTS) * Math.PI * 2 - Math.PI / 2; }
    function radiiFor(sides: number) {
      const out: number[] = [];
      for (let i = 0; i < POINTS; i++) out.push(polygonRadius(angleAt(i), sides));
      return out;
    }
    function buildPath(radii: number[]) {
      let d = '';
      for (let i = 0; i < POINTS; i++) {
        const a = angleAt(i);
        const x = CX + radii[i] * Math.cos(a);
        const y = CY + radii[i] * Math.sin(a);
        d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2) + ' ';
      }
      return d + 'Z';
    }
    let currentR = radiiFor(SIDES[tier]);
    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function morphTo(sides: number) {
      cancelAnimationFrame(raf);
      const target = radiiFor(sides);
      if (reduce) { currentR = target; path!.setAttribute('d', buildPath(currentR)); return; }
      const fromR = currentR.slice();
      t0 = performance.now();
      function step(now: number) {
        const t = Math.min(1, (now - t0) / MORPH_MS);
        const e = 1 - Math.pow(1 - t, 3);
        currentR = fromR.map((r, i) => lerp(r, target[i], e));
        path!.setAttribute('d', buildPath(currentR));
        if (t < 1) raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
    }
    let timer = 0;
    function human() { root!.classList.remove(styles['is-demo']); window.clearInterval(timer); }
    function select(i: number) {
      tier = i;
      dots.forEach((d, idx) => {
        d.setAttribute('aria-checked', idx === i ? 'true' : 'false');
        d.setAttribute('tabindex', idx === i ? '0' : '-1');
      });
      label!.textContent = LEVELS[i];
      morphTo(SIDES[i]);
    }

    const offs = dots.map((d, i) => {
      function onClick() { human(); select(i); }
      function onKey(e: KeyboardEvent) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); human(); select(Math.min(LEVELS.length - 1, tier + 1)); dots[tier].focus({ preventScroll: true }); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); human(); select(Math.max(0, tier - 1)); dots[tier].focus({ preventScroll: true }); }
      }
      d.addEventListener('click', onClick);
      d.addEventListener('keydown', onKey);
      return () => { d.removeEventListener('click', onClick); d.removeEventListener('keydown', onKey); };
    });

    let si = 0;
    function tick() { select(SEQUENCE[si % SEQUENCE.length]); si++; }
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    path.setAttribute('d', buildPath(currentR));

    return () => { offs.forEach((off) => off()); cancelAnimationFrame(raf); window.clearInterval(timer); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ims + ' ' + styles['is-demo']} ref={rootRef}>
        <svg className={styles.imsIcon} viewBox="0 0 80 80" width={64} height={64} aria-hidden="true">
          <path ref={pathRef} className={styles.imsShape} />
        </svg>
        <div className={styles.imsRow} ref={rowRef} role="radiogroup" aria-label="난이도">
          {LEVELS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={styles.imsDot}
              ref={(el: HTMLButtonElement | null) => { if (el && dotRefs.current) dotRefs.current[i] = el; }}
              role="radio"
              aria-checked={i === 2 ? 'true' : 'false'}
              aria-label={label}
              data-i={i}
              tabIndex={i === 0 ? 0 : -1}
            />
          ))}
        </div>
        <p className={styles.imsLabel} ref={labelRef}>어려움</p>
      </div>
    </main>
  );
}
