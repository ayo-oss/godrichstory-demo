import { useEffect, useRef } from 'react';
import styles from './OverflowCollapseMore.module.scss';

type Box<T> = { current: T };

const LABELS = ['굵게', '기울임', '밑줄', '취소선', '정렬', '색상', '링크'];
const OVERFLOW_BUFFER = 24; // 계산 겹 상수: 더보기 버튼 폭까지 계산한 뒤 남기는 안전 여유(px)
const MIN_W = 150;
const MAX_W = 320;
const GAP = 8;

export default function OverflowCollapseMore() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const boxRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const moreRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const menuRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const handleRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const btnRefs = useRef([]) as unknown as Box<HTMLButtonElement[]>;

  useEffect(() => {
    const root = rootRef.current;
    const box = boxRef.current;
    const track = trackRef.current;
    const more = moreRef.current;
    const menu = menuRef.current;
    const handle = handleRef.current;
    const btns = btnRefs.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let isDemo = true;

    // 계산 겹: 각 버튼의 실제 폭을 한 번 실측해 캐시한다(추측 px 를 쓰지 않는다) — 넘치는 만큼만 더보기로 옮긴다.
    const widths = btns.map((b) => b.getBoundingClientRect().width);
    let moreWidth = 0;

    function recompute() {
      const avail = box.getBoundingClientRect().width - OVERFLOW_BUFFER;
      if (!moreWidth) {
        more.hidden = false;
        moreWidth = more.getBoundingClientRect().width;
        more.hidden = true;
      }

      const sumAll = widths.reduce((s, w) => s + w, 0) + GAP * (widths.length - 1);
      let cutoff = widths.length;
      if (sumAll > avail) {
        let sum = 0;
        cutoff = 0;
        for (let i = 0; i < widths.length; i++) {
          const add = widths[i] + (i > 0 ? GAP : 0);
          if (sum + add + moreWidth > avail) break;
          sum += add;
          cutoff = i + 1;
        }
        cutoff = Math.max(1, cutoff);
      }

      btns.forEach((b, i) => { b.hidden = i >= cutoff; });
      const overflowCount = widths.length - cutoff;
      more.hidden = overflowCount === 0;
      more.textContent = `더보기 ▾ (${overflowCount})`;

      menu.innerHTML = '';
      for (let j = cutoff; j < widths.length; j++) {
        const li = document.createElement('li');
        const mb = document.createElement('button');
        mb.type = 'button';
        mb.className = styles.menuBtn;
        mb.textContent = LABELS[j];
        li.appendChild(mb);
        menu.appendChild(li);
      }
    }

    function human() {
      if (isDemo) { root.classList.remove(styles.isDemo); isDemo = false; }
    }

    function onMoreClick() {
      human();
      const open = menu.hidden;
      menu.hidden = !open;
      more.setAttribute('aria-expanded', String(open));
    }
    more.addEventListener('click', onMoreClick);

    let dragging = false;
    let dragStartX = 0;
    let dragStartW = 0;
    function onPointerDown(e: PointerEvent) {
      human();
      dragging = true;
      dragStartX = e.clientX;
      dragStartW = box.getBoundingClientRect().width;
      handle.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const w = Math.min(MAX_W, Math.max(MIN_W, dragStartW + (e.clientX - dragStartX)));
      box.style.width = w + 'px';
      recompute();
    }
    function onPointerUp() { dragging = false; }
    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);

    const ro = new ResizeObserver(() => recompute());
    ro.observe(box);

    let start = 0;
    function demoWidth(ts: number) {
      const t = (ts - start) / 1900;
      const wave = (Math.sin(t * Math.PI * 2) + 1) / 2; // 0~1
      return MIN_W + wave * (MAX_W - MIN_W);
    }

    let raf = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      if (isDemo && !reduce) {
        box.style.width = demoWidth(ts).toFixed(1) + 'px';
        recompute();
      }
      raf = requestAnimationFrame(loop);
    }

    recompute();
    if (reduce) { box.style.width = MAX_W + 'px'; recompute(); }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      more.removeEventListener('click', onMoreClick);
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  return (
    <div className={`${styles.ovm} ${styles.isDemo}`} ref={(el: HTMLDivElement | null) => { if (el) rootRef.current = el; }}>
      <div
        className={styles.resizer}
        style={{ width: '260px' }}
        ref={(el: HTMLDivElement | null) => { if (el) boxRef.current = el; }}
      >
        <div
          className={styles.track}
          role="toolbar"
          aria-label="서식 도구"
          ref={(el: HTMLDivElement | null) => { if (el) trackRef.current = el; }}
        >
          {LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={styles.btn}
              ref={(el: HTMLButtonElement | null) => { if (el) btnRefs.current[i] = el; }}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.more}
          aria-haspopup="true"
          aria-expanded="false"
          hidden
          ref={(el: HTMLButtonElement | null) => { if (el) moreRef.current = el; }}
        >
          더보기 ▾
        </button>
        <ul
          className={styles.menu}
          hidden
          ref={(el: HTMLUListElement | null) => { if (el) menuRef.current = el; }}
        />
      </div>
      <span
        className={styles.handle}
        aria-hidden="true"
        ref={(el: HTMLSpanElement | null) => { if (el) handleRef.current = el; }}
      />
    </div>
  );
}
