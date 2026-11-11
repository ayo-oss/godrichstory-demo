import { useEffect, useRef } from 'react';
import styles from './DifficultySelectorBadgeHueShift.module.scss';

const LEVELS = ['쉬움', '보통', '어려움', '매우 어려움', '최고'];
const BASE_HUE = 140, HUE_SPACING = 46, SAT = 45, LIGHT = 72;
const SEQUENCE = [4, 0, 3, 1, 2];
const TICK_MS = 700;

export default function DifficultySelectorBadgeHueShift() {
  const rootRef = useRef<HTMLDivElement>(null);
  const badgeRefs = useRef<HTMLButtonElement[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !badgeRefs.current) return undefined;
    const badges = badgeRefs.current;
    if (badges.length !== LEVELS.length) return undefined;

    let selected = 2;

    // 계산 겹: 배지 색을 고정 다섯 색이 아니라 단계 번호를 색상각 수식(기준 색상 + 번호*간격)에 넣어 구한다
    function badgeHue(i: number) { return (BASE_HUE + i * HUE_SPACING) % 360; }
    function badgeColor(i: number) { return 'hsl(' + badgeHue(i) + ', ' + SAT + '%, ' + LIGHT + '%)'; }
    function paint() {
      badges.forEach((b, i) => {
        b.style.background = badgeColor(i);
        b.setAttribute('aria-checked', i === selected ? 'true' : 'false');
        b.setAttribute('tabindex', i === selected ? '0' : '-1');
      });
    }
    let timer = 0;
    function human() { root!.classList.remove(styles['is-demo']); window.clearInterval(timer); }
    function select(i: number) { selected = i; paint(); }

    const offs = badges.map((b, i) => {
      function onClick() { human(); select(i); }
      function onKey(e: KeyboardEvent) {
        if (e.key === 'ArrowRight') { e.preventDefault(); human(); const n = Math.min(LEVELS.length - 1, selected + 1); select(n); badges[n].focus({ preventScroll: true }); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); human(); const p = Math.max(0, selected - 1); select(p); badges[p].focus({ preventScroll: true }); }
      }
      b.addEventListener('click', onClick);
      b.addEventListener('keydown', onKey);
      return () => { b.removeEventListener('click', onClick); b.removeEventListener('keydown', onKey); };
    });

    let si = 0;
    function tick() { select(SEQUENCE[si % SEQUENCE.length]); si++; }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    paint();

    return () => { offs.forEach((off) => off()); window.clearInterval(timer); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.bhs + ' ' + styles['is-demo']} ref={rootRef} role="radiogroup" aria-label="난이도">
        {LEVELS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={styles.bhsBadge}
            ref={(el: HTMLButtonElement | null) => { if (el && badgeRefs.current) badgeRefs.current[i] = el; }}
            role="radio"
            aria-checked={i === 2 ? 'true' : 'false'}
            data-i={i}
            tabIndex={i === 0 ? 0 : -1}
          >
            {label}
          </button>
        ))}
      </div>
    </main>
  );
}
