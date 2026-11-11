import { useEffect, useRef } from 'react';
import styles from './DisabledRippleBlock.module.scss';

type Box<T> = { current: T };

type Item = { label: string; disabled: boolean };

const ITEMS: Item[] = [
  { label: '삭제', disabled: true },
  { label: '승인', disabled: false },
  { label: '잠금 해제', disabled: true },
  { label: '내보내기', disabled: false }
];
const CYCLE_MS = 650; // 데모 자동 시도 간격
const HALT_RATIO = 0.5; // 계산 겹 상수: 리플이 최대 반경의 이 비율까지만 번지고 멈춘다
const SHAKE_MS = 420;
const SHAKE_FREQ = 26; // rad/s 대역 — 데모용 가정값
const SHAKE_DECAY = 6.5;
const SHAKE_AMPLITUDE = 6; // px, 데모용 가정값

type Cell = { btn: HTMLButtonElement; ripple: HTMLSpanElement; disabled: boolean; raf: number };

export default function DisabledRippleBlock() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const btnRefs = useRef([]) as unknown as Box<HTMLButtonElement[]>;
  const rippleRefs = useRef([]) as unknown as Box<HTMLSpanElement[]>;

  useEffect(() => {
    const root = rootRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let isDemo = true;

    function human() {
      if (isDemo) { root.classList.remove(styles.isDemo); isDemo = false; }
    }

    const cells: Cell[] = ITEMS.map((item, i) => ({
      btn: btnRefs.current[i],
      ripple: rippleRefs.current[i],
      disabled: item.disabled,
      raf: 0
    }));

    // 계산 겹 1: 리플이 버튼 대각선의 절반(HALT_RATIO)까지만 실측 확산되다 멈춘다(막힘의 시각화).
    // 계산 겹 2: 흔들림은 캔버스 키프레임이 아니라 rAF 로 sin(진동) × exp(감쇠) 를 매 프레임 적분한다.
    function attempt(cell: Cell) {
      if (!cell.disabled) return;
      const r = cell.btn.getBoundingClientRect();
      const maxR = Math.hypot(r.width, r.height) / 2;
      const haltR = maxR * HALT_RATIO;

      if (reduce) {
        cell.ripple.style.transform = `translate(-50%,-50%) scale(${haltR / 4})`;
        cell.ripple.style.opacity = '0.001';
        cell.btn.style.transform = 'translate(0,0)';
        return;
      }

      if (cell.raf) cancelAnimationFrame(cell.raf);
      let t0 = 0;
      const dur = Math.max(260, SHAKE_MS);
      function step(ts: number) {
        if (!t0) t0 = ts;
        const t = (ts - t0) / 1000;
        const tt = Math.min(1, (ts - t0) / dur);

        const spread = haltR * (1 - Math.pow(1 - Math.min(1, tt * 1.6), 2));
        cell.ripple.style.transform = `translate(-50%,-50%) scale(${Math.max(0.001, spread / 4)})`;
        cell.ripple.style.opacity = String(Math.max(0, 1 - tt));

        const shakeT = Math.min(t, SHAKE_MS / 1000);
        const dx = SHAKE_AMPLITUDE * Math.sin(SHAKE_FREQ * shakeT) * Math.exp(-SHAKE_DECAY * shakeT);
        cell.btn.style.transform = `translate(${dx.toFixed(2)}px,0)`;

        if (tt < 1) cell.raf = requestAnimationFrame(step);
        else { cell.raf = 0; cell.btn.style.transform = 'translate(0,0)'; }
      }
      cell.raf = requestAnimationFrame(step);
    }

    const cleanups: Array<() => void> = [];
    cells.forEach((cell) => {
      const onDown = () => { human(); attempt(cell); };
      cell.btn.addEventListener('pointerdown', onDown);
      cleanups.push(() => cell.btn.removeEventListener('pointerdown', onDown));
    });

    const disabledIdx = cells.map((c, i) => (c.disabled ? i : -1)).filter((i) => i >= 0);
    let idx = 0;
    let start = 0;
    let raf = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      if (isDemo && !reduce) {
        const slot = Math.floor((ts - start) / CYCLE_MS) % disabledIdx.length;
        if (slot !== idx) { idx = slot; attempt(cells[disabledIdx[idx]]); }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      cells.forEach((c) => { if (c.raf) cancelAnimationFrame(c.raf); });
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <div className={`${styles.drb} ${styles.isDemo}`} role="group" aria-label="일괄 작업" ref={(el: HTMLDivElement | null) => { if (el) rootRef.current = el; }}>
      {ITEMS.map((item, i) => (
        <button
          key={item.label}
          type="button"
          className={styles.btn}
          aria-disabled={item.disabled || undefined}
          ref={(el: HTMLButtonElement | null) => { if (el) btnRefs.current[i] = el; }}
        >
          {item.label}
          <span className={styles.ripple} ref={(el: HTMLSpanElement | null) => { if (el) rippleRefs.current[i] = el; }} />
        </button>
      ))}
    </div>
  );
}
