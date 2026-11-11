import { useEffect, useRef } from 'react';
import styles from './KeyboardArrowFocusSlide.module.scss';

type Box<T> = { current: T };
type Rect = { x: number; y: number; w: number; h: number };

const LABELS = ['그리드 보기', '리스트 보기', '타임라인 보기', '보드 보기'];
const CYCLE_MS = 500; // 데모 자동 순회 간격 — 측정 창(2s) 안에 전환이 여러 번 들어오게 짧게 잡음
const FOCUS_EASE = 'easeInOut'; // 변형: easeInOut → linear (등속)
const EASES: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
};

export default function KeyboardArrowFocusSlide() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const groupRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const ringRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const btnRefs = useRef([]) as unknown as Box<HTMLButtonElement[]>;

  useEffect(() => {
    const root = rootRef.current;
    const group = groupRef.current;
    const ring = ringRef.current;
    const btns = btnRefs.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let isDemo = true;
    let current = 0;
    let raf = 0;
    let from: Rect | null = null;

    function human() {
      if (isDemo) { root.classList.remove(styles.isDemo); isDemo = false; }
    }

    // 계산 겹: 포커스 링을 목표 버튼의 실측 좌표(getBoundingClientRect, 그룹 기준 상대값)로 진행률 t 를
    // FOCUS_EASE 로 보간해 translate·리사이즈한다 — % 나 고정폭이 아니라 매번 실측한다.
    function measure(i: number): Rect {
      const r = btns[i].getBoundingClientRect();
      const gr = group.getBoundingClientRect();
      return { x: r.left - gr.left, y: r.top - gr.top, w: r.width, h: r.height };
    }

    function render(box: Rect) {
      ring.style.transform = `translate(${box.x}px,${box.y}px)`;
      ring.style.width = box.w + 'px';
      ring.style.height = box.h + 'px';
    }

    function moveRing(toIdx: number) {
      const to = measure(toIdx);
      if (reduce || !from) { render(to); from = to; return; }
      const start = from;
      const dur = 260;
      let t0 = 0;
      const ease = EASES[FOCUS_EASE] || EASES.linear;
      if (raf) cancelAnimationFrame(raf);
      function step(ts: number) {
        if (!t0) t0 = ts;
        const t = Math.min(1, (ts - t0) / dur);
        const e = ease(t);
        render({
          x: start.x + (to.x - start.x) * e,
          y: start.y + (to.y - start.y) * e,
          w: start.w + (to.w - start.w) * e,
          h: start.h + (to.h - start.h) * e
        });
        if (t < 1) raf = requestAnimationFrame(step);
        else { raf = 0; from = to; }
      }
      raf = requestAnimationFrame(step);
    }

    function select(i: number, focus: boolean) {
      btns.forEach((b, j) => {
        b.setAttribute('aria-checked', String(j === i));
        b.tabIndex = j === i ? 0 : -1;
      });
      current = i;
      moveRing(i);
      if (focus) btns[i].focus({ preventScroll: true });
    }

    const cleanups: Array<() => void> = [];
    btns.forEach((b, i) => {
      const onClick = () => { human(); select(i, false); };
      const onKeydown = (e: KeyboardEvent) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        human();
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        select((current + dir + btns.length) % btns.length, true);
      };
      b.addEventListener('click', onClick);
      b.addEventListener('keydown', onKeydown);
      cleanups.push(() => {
        b.removeEventListener('click', onClick);
        b.removeEventListener('keydown', onKeydown);
      });
    });

    from = measure(0);
    render(from);

    let start0 = 0;
    let loopRaf = 0;
    function loop(ts: number) {
      if (!start0) start0 = ts;
      if (isDemo && !reduce) {
        const idx = Math.floor((ts - start0) / CYCLE_MS) % btns.length;
        if (idx !== current) select(idx, false);
      }
      loopRaf = requestAnimationFrame(loop);
    }
    loopRaf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(loopRaf);
      if (raf) cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <div className={`${styles.kfs} ${styles.isDemo}`} ref={(el: HTMLDivElement | null) => { if (el) rootRef.current = el; }}>
      <div
        className={styles.group}
        role="radiogroup"
        aria-label="보기 모드"
        ref={(el: HTMLDivElement | null) => { if (el) groupRef.current = el; }}
      >
        {LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={styles.btn}
            role="radio"
            aria-checked={i === 0}
            tabIndex={i === 0 ? 0 : -1}
            ref={(el: HTMLButtonElement | null) => { if (el) btnRefs.current[i] = el; }}
          >
            {label}
          </button>
        ))}
      </div>
      <span className={styles.ring} aria-hidden="true" ref={(el: HTMLSpanElement | null) => { if (el) ringRef.current = el; }} />
    </div>
  );
}
