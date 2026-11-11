import { useEffect, useRef } from 'react';
import styles from './DifficultySelectorRadioCardGrid.module.scss';

const LEVELS = ['쉬움', '보통', '어려움'];
const BASE_Y = 6, Y_STEP = 9, BASE_BLUR = 14, BLUR_STEP = 12, BASE_LIFT = 2, LIFT_STEP = 5;
const TICK_MS = 700;

export default function DifficultySelectorRadioCardGrid() {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<HTMLButtonElement[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !cardRefs.current) return undefined;
    const cards = cardRefs.current;
    if (cards.length !== LEVELS.length) return undefined;

    let selected = 0;

    // 계산 겹: 카드 그림자의 y·blur·들뜬 높이를 고정값이 아니라 단계 번호(tier)에 비례해 구한다
    function shadowFor(tier: number) {
      return { y: BASE_Y + tier * Y_STEP, blur: BASE_BLUR + tier * BLUR_STEP, lift: BASE_LIFT + tier * LIFT_STEP };
    }
    function paint() {
      cards.forEach((c, i) => {
        const on = i === selected;
        c.setAttribute('aria-checked', on ? 'true' : 'false');
        c.setAttribute('tabindex', on ? '0' : '-1');
        if (on) {
          const s = shadowFor(i);
          c.style.boxShadow = '0 ' + s.y + 'px ' + s.blur + 'px rgba(23, 20, 26, .38)';
          c.style.transform = 'translateY(-' + s.lift + 'px)';
        } else {
          c.style.boxShadow = '';
          c.style.transform = '';
        }
      });
    }
    let timer = 0;
    function human() { root!.classList.remove(styles['is-demo']); window.clearInterval(timer); }
    function select(i: number) { selected = i; paint(); }

    const offs = cards.map((c, i) => {
      function onClick() { human(); select(i); }
      function onKey(e: KeyboardEvent) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); human(); select((selected + 1) % LEVELS.length); cards[selected].focus({ preventScroll: true }); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); human(); select((selected - 1 + LEVELS.length) % LEVELS.length); cards[selected].focus({ preventScroll: true }); }
      }
      c.addEventListener('click', onClick);
      c.addEventListener('keydown', onKey);
      return () => { c.removeEventListener('click', onClick); c.removeEventListener('keydown', onKey); };
    });

    let si = 0;
    function tick() { si = (si + 1) % LEVELS.length; select(si); }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    paint();

    return () => { offs.forEach((off) => off()); window.clearInterval(timer); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.rc + ' ' + styles['is-demo']} ref={rootRef} role="radiogroup" aria-label="난이도">
        {LEVELS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={styles.rcCard}
            ref={(el: HTMLButtonElement | null) => { if (el && cardRefs.current) cardRefs.current[i] = el; }}
            role="radio"
            aria-checked="false"
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
