import { useEffect, useRef } from 'react';
import styles from './OrientMorph.module.scss';

type Box<T> = { current: T };

const LABELS = ['굵게', '기울임', '밑줄', '정렬'];
const CYCLE_MS = 700; // 데모 자동 전환 주기 — 측정 창(2s) 안에 전환이 여러 번 들어오게 짧게 잡음
const FLIP_MS = 480;

export default function OrientMorph() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const groupRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const toggleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const btnRefs = useRef([]) as unknown as Box<HTMLButtonElement[]>;

  useEffect(() => {
    const root = rootRef.current;
    const toggle = toggleRef.current;
    const btns = btnRefs.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let isDemo = true;
    let vertical = false;

    function human() {
      if (isDemo) { root.classList.remove(styles.isDemo); isDemo = false; }
    }

    // 계산 겹: FLIP — 전환 전(First) 각 버튼의 실측 좌표를 재고, 전환 후(Last) 좌표와의 차이(Invert)를
    // transform 으로 순간 상쇄한 뒤, 다음 프레임에 transform 을 0 으로 되돌려(Play) 자연스럽게 이어붙인다.
    function flip(apply: () => void) {
      const first = btns.map((b) => b.getBoundingClientRect());
      apply();
      const last = btns.map((b) => b.getBoundingClientRect());

      if (reduce) return; // 계산은 유지하되 즉시 반영, 애니메이션 생략

      btns.forEach((b, i) => {
        const dx = first[i].left - last[i].left;
        const dy = first[i].top - last[i].top;
        if (!dx && !dy) return;
        b.style.transition = 'none';
        b.style.transform = `translate(${dx}px,${dy}px)`;
        b.getBoundingClientRect();
        requestAnimationFrame(() => {
          b.style.transition = `transform ${FLIP_MS}ms cubic-bezier(.22,.9,.32,1)`;
          b.style.transform = 'translate(0,0)';
        });
      });
    }

    function setOrientation(v: boolean) {
      flip(() => {
        vertical = v;
        root.classList.toggle(styles.vertical, vertical);
        toggle.setAttribute('aria-pressed', String(vertical));
      });
    }

    function onToggleClick() {
      human();
      setOrientation(!vertical);
    }
    toggle.addEventListener('click', onToggleClick);

    let start = 0;
    let raf = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      if (isDemo && !reduce) {
        const phaseVertical = (ts - start) % (CYCLE_MS * 2) >= CYCLE_MS;
        if (phaseVertical !== vertical) setOrientation(phaseVertical);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      toggle.removeEventListener('click', onToggleClick);
    };
  }, []);

  return (
    <div className={`${styles.vhm} ${styles.isDemo}`} ref={(el: HTMLDivElement | null) => { if (el) rootRef.current = el; }}>
      <div
        className={styles.group}
        role="group"
        aria-label="편집 도구"
        ref={(el: HTMLDivElement | null) => { if (el) groupRef.current = el; }}
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
        className={styles.toggle}
        aria-pressed="false"
        ref={(el: HTMLButtonElement | null) => { if (el) toggleRef.current = el; }}
      >
        방향 전환 ⤢
      </button>
    </div>
  );
}
