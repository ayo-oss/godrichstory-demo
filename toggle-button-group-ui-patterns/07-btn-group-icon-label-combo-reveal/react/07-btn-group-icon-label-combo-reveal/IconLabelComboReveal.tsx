import { useEffect, useRef } from 'react';
import styles from './IconLabelComboReveal.module.scss';

type Box<T> = { current: T };

type Item = { icon: string; label: string };

const ITEMS: Item[] = [
  { icon: '＋', label: '새로 만들기' },
  { icon: '⎘', label: '복제' },
  { icon: '↧', label: '내보내기' },
  { icon: '⌘', label: '단축키' }
];
const CYCLE_MS = 900; // 데모 자동 순회 간격 — 측정 창(2s) 안에 전환이 여러 번 들어오게 짧게 잡음

type Cell = {
  reveal: HTMLSpanElement;
  label: HTMLSpanElement;
  progress: number;
  raf: number;
  fullW: number;
};

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

export default function IconLabelComboReveal() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const revealRefs = useRef([]) as unknown as Box<HTMLSpanElement[]>;
  const labelRefs = useRef([]) as unknown as Box<HTMLSpanElement[]>;
  const btnRefs = useRef([]) as unknown as Box<HTMLButtonElement[]>;

  useEffect(() => {
    const root = rootRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let isDemo = true;

    function human() {
      if (isDemo) { root.classList.remove(styles.isDemo); isDemo = false; }
    }

    // 계산 겹: 각 라벨의 실측 텍스트 폭(fullW)을 한 번 재고, reveal 트랙 폭을 그 값에 고정한 뒤
    // clip-path 를 0→fullW 사이에서 이징으로 보간해 진행률을 그린다 — width 는 다시 애니메이션하지 않는다.
    const cells: Cell[] = ITEMS.map((_, i) => {
      const reveal = revealRefs.current[i];
      const label = labelRefs.current[i];
      const fullW = label.getBoundingClientRect().width;
      reveal.style.width = fullW + 'px';
      return { reveal, label, progress: 0, raf: 0, fullW };
    });

    function render(cell: Cell) {
      const pct = (1 - cell.progress) * 100;
      cell.reveal.style.clipPath = `inset(0 ${pct.toFixed(2)}% 0 0)`;
      cell.label.style.opacity = String(cell.progress);
    }

    function animate(cell: Cell, to: number) {
      const from = cell.progress;
      if (reduce) { cell.progress = to; render(cell); return; }
      if (cell.raf) cancelAnimationFrame(cell.raf);
      const dur = 400;
      let t0 = 0;
      function step(ts: number) {
        if (!t0) t0 = ts;
        const t = Math.min(1, (ts - t0) / dur);
        cell.progress = from + (to - from) * easeOutCubic(t);
        render(cell);
        if (t < 1) cell.raf = requestAnimationFrame(step);
        else cell.raf = 0;
      }
      cell.raf = requestAnimationFrame(step);
    }

    const cleanups: Array<() => void> = [];
    cells.forEach((cell, i) => {
      render(cell);
      const btn = btnRefs.current[i];
      const onEnter = () => { human(); animate(cell, 1); };
      const onLeave = () => { if (!isDemo) animate(cell, 0); };
      const onFocus = () => { human(); animate(cell, 1); };
      const onBlur = () => { if (!isDemo) animate(cell, 0); };
      btn.addEventListener('pointerenter', onEnter);
      btn.addEventListener('pointerleave', onLeave);
      btn.addEventListener('focus', onFocus);
      btn.addEventListener('blur', onBlur);
      cleanups.push(() => {
        btn.removeEventListener('pointerenter', onEnter);
        btn.removeEventListener('pointerleave', onLeave);
        btn.removeEventListener('focus', onFocus);
        btn.removeEventListener('blur', onBlur);
      });
    });

    let active = -1;
    let start = 0;
    let raf = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      if (isDemo && !reduce) {
        const idx = Math.floor((ts - start) / CYCLE_MS) % cells.length;
        if (idx !== active) {
          if (active >= 0) animate(cells[active], 0);
          active = idx;
          animate(cells[active], 1);
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      cells.forEach((cell) => { if (cell.raf) cancelAnimationFrame(cell.raf); });
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <div
      className={`${styles.clr} ${styles.isDemo}`}
      role="group"
      aria-label="빠른 작업"
      ref={(el: HTMLDivElement | null) => { if (el) rootRef.current = el; }}
    >
      {ITEMS.map((item, i) => (
        <button
          key={item.label}
          type="button"
          className={styles.btn}
          ref={(el: HTMLButtonElement | null) => { if (el) btnRefs.current[i] = el; }}
        >
          <span className={styles.icon} aria-hidden="true">{item.icon}</span>
          <span
            className={styles.reveal}
            ref={(el: HTMLSpanElement | null) => { if (el) revealRefs.current[i] = el; }}
          >
            <span
              className={styles.label}
              ref={(el: HTMLSpanElement | null) => { if (el) labelRefs.current[i] = el; }}
            >
              {item.label}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
