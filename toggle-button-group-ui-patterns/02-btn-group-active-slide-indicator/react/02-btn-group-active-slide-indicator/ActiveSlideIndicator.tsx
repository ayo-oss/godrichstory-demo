// ActiveSlideIndicator — vanilla 판(run/369/demo/02-btn-group-active-slide-indicator/index.html) 의 React 포트.
// getBoundingClientRect 로 활성 버튼의 실측 좌표·폭을 재고, 감쇠 스프링 방정식을 매 프레임 적분해
// 표시자를 오버슛 후 정착시킨다. 폭 변화는 transform: scaleX 비율로만 표현한다.
import { useEffect, useRef } from "react";
import styles from "./ActiveSlideIndicator.module.scss";

type Box<T> = { current: T };

const LABELS = ["최신순", "인기순", "가격순", "평점 높은순"];

export default function ActiveSlideIndicator() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const indicatorRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const btnRefs = useRef([]) as unknown as Box<HTMLButtonElement[]>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const CYCLE_MS = 1100;
    const STIFF = 210; // 계산 겹 상수: 스프링 강성(k)
    const DAMP = 18; // 계산 겹 상수: 감쇠(c)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const indicator = indicatorRef.current;
    const btns = btnRefs.current;
    if (!root || !indicator || btns.length === 0) return;

    let isDemo = true;
    let x = 0, w = 0, vx = 0, vw = 0, targetX = 0, targetW = 0, last = 0, activeIdx = 0;
    let maxW = 0;

    btns.forEach((b) => { maxW = Math.max(maxW, b.getBoundingClientRect().width); });
    indicator.style.width = maxW + "px";

    function measure(idx: number) {
      const rootRect = root!.getBoundingClientRect();
      const r = btns[idx].getBoundingClientRect();
      return { x: r.left - rootRect.left, w: r.width };
    }

    function goTo(idx: number) {
      activeIdx = idx;
      btns.forEach((b, i) => {
        b.classList.toggle(styles.btnOn, i === idx);
        b.setAttribute("aria-pressed", String(i === idx));
      });
      const m = measure(idx);
      targetX = m.x; targetW = m.w;
      if (reduce) { x = targetX; w = targetW; vx = 0; vw = 0; }
    }

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function onResize() { const m = measure(activeIdx); targetX = m.x; targetW = m.w; }
    window.addEventListener("resize", onResize);

    const clicks: (() => void)[] = [];
    btns.forEach((b, i) => {
      const fn = () => { human(); goTo(i); };
      b.addEventListener("click", fn);
      clicks.push(fn);
    });

    function render() {
      const scale = maxW > 0 ? w / maxW : 1;
      indicator!.style.transform = "translateX(" + x.toFixed(2) + "px) scaleX(" + scale.toFixed(4) + ")";
    }

    let cycleStart = 0, lastIdx = -1;
    function loop(ts: number) {
      if (!last) last = ts;
      const dt = Math.min(0.032, (ts - last) / 1000);
      last = ts;

      if (!cycleStart) cycleStart = ts;
      if (isDemo && !reduce) {
        const idx = Math.floor((ts - cycleStart) / CYCLE_MS) % btns.length;
        if (idx !== lastIdx) { lastIdx = idx; goTo(idx); }
      }

      const ax = STIFF * (targetX - x) - DAMP * vx;
      const aw = STIFF * (targetW - w) - DAMP * vw;
      vx += ax * dt; x += vx * dt;
      vw += aw * dt; w += vw * dt;
      render();

      rafRef.current = requestAnimationFrame(loop);
    }

    requestAnimationFrame(() => { const m = measure(0); x = targetX = m.x; w = targetW = m.w; render(); });
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", onResize);
      btns.forEach((b, i) => b.removeEventListener("click", clicks[i]));
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.asiWrap}>
        <div className={styles.asi + " " + styles.isDemo} ref={rootRef} role="group" aria-label="정렬 기준">
          <span className={styles.indicator} ref={indicatorRef} aria-hidden="true" />
          {LABELS.map((label, i) => (
            <button
              key={label}
              className={styles.btn + (i === 0 ? " " + styles.btnOn : "")}
              aria-pressed={i === 0}
              ref={(el: HTMLButtonElement | null) => { if (el) btnRefs.current[i] = el; }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
