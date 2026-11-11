// SharedBorderMerge — vanilla 판(run/369/demo/01-btn-group-shared-border-merge/index.html) 의 React 포트.
// getBoundingClientRect 로 버튼 사이 공유 경계선의 실측 좌표를 재고, 클릭 파동을 그 좌표 + BLEED_PX
// 만큼만 이웃으로 번지도록 clip-path 로 매 프레임 계산해 자른다.
import { useEffect, useRef } from "react";
import styles from "./SharedBorderMerge.module.scss";

type Box<T> = { current: T };
type RippleState = { el: HTMLSpanElement; start: number; to: number; minClip: number; maxClip: number; originX: number };

const ALIGNS = ["left", "center", "right", "justify"] as const;
const LABELS: Record<string, string> = { left: "왼쪽", center: "중앙", right: "오른쪽", justify: "양쪽" };

export default function SharedBorderMerge() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const btnRefs = useRef([]) as unknown as Box<HTMLButtonElement[]>;
  const seamRefs = useRef([]) as unknown as Box<HTMLSpanElement[]>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const CYCLE_MS = 900;
    const BLEED_PX = 6; // 계산 겹 상수: 파동이 이웃 경계선을 넘어 번질 수 있는 최대 여유(px)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const RIPPLE_MS = reduce ? 1 : 420;

    const root = rootRef.current;
    const btns = btnRefs.current;
    const seams = seamRefs.current;
    if (!root || btns.length === 0) return;

    let isDemo = true;
    const ripples: RippleState[] = [];

    function measureSeams() {
      const rootRect = root.getBoundingClientRect();
      for (let i = 0; i < seams.length; i++) {
        const a = btns[i].getBoundingClientRect();
        const b = btns[i + 1].getBoundingClientRect();
        const seamX = (a.right + b.left) / 2 - rootRect.left;
        seams[i].style.setProperty("--seam-x", seamX.toFixed(2) + "px");
      }
    }

    function setActive(btn: HTMLButtonElement) {
      btns.forEach((b) => {
        b.setAttribute("aria-pressed", String(b === btn));
        b.classList.toggle(styles.btnOn, b === btn);
      });
    }

    function spawnRipple(btn: HTMLButtonElement, clientX: number | null) {
      const idx = btns.indexOf(btn);
      const rect = btn.getBoundingClientRect();
      const originX = (clientX == null ? rect.left + rect.width / 2 : clientX) - rect.left;
      const leftSeam = idx > 0 ? btns[idx - 1].getBoundingClientRect().right - rect.left : null;
      const rightSeam = idx < btns.length - 1 ? btns[idx + 1].getBoundingClientRect().left - rect.left : null;
      const span = document.createElement("span");
      span.className = styles.ripple;
      span.style.left = originX + "px";
      span.style.top = rect.height / 2 + "px";
      btn.appendChild(span);
      ripples.push({
        el: span, start: performance.now(), to: Math.max(rect.width, rect.height) * 1.3,
        minClip: leftSeam == null ? -9999 : leftSeam - BLEED_PX,
        maxClip: rightSeam == null ? 9999 : rightSeam + BLEED_PX,
        originX,
      });
    }

    function easeOutQuad(t: number) { return 1 - (1 - t) * (1 - t); }

    function tickRipples(ts: number) {
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        const t = Math.min(1, (ts - r.start) / RIPPLE_MS);
        const radius = r.to * easeOutQuad(t);
        const left = Math.max(r.minClip, r.originX - radius);
        const right = Math.min(r.maxClip, r.originX + radius);
        r.el.style.width = radius * 2 + "px";
        r.el.style.height = radius * 2 + "px";
        r.el.style.marginLeft = -radius + "px";
        r.el.style.marginTop = -radius + "px";
        r.el.style.opacity = String(1 - t);
        r.el.style.clipPath = "inset(-9999px " + Math.max(0, r.originX + radius - right) + "px -9999px " + Math.max(0, left - (r.originX - radius)) + "px)";
        if (t >= 1) { r.el.remove(); ripples.splice(i, 1); }
      }
    }

    function human() { if (isDemo) { root.classList.remove(styles.isDemo); isDemo = false; } }

    function onClick(this: HTMLButtonElement, e: MouseEvent) {
      human();
      setActive(this);
      spawnRipple(this, reduce ? null : e.clientX);
    }
    btns.forEach((b) => b.addEventListener("click", onClick as unknown as EventListener));

    window.addEventListener("resize", measureSeams);
    measureSeams();

    let cycleStart = 0, lastIdx = -1;
    function loop(ts: number) {
      if (!cycleStart) cycleStart = ts;
      if (isDemo && !reduce) {
        const idx = Math.floor((ts - cycleStart) / CYCLE_MS) % btns.length;
        if (idx !== lastIdx) { lastIdx = idx; setActive(btns[idx]); spawnRipple(btns[idx], null); }
      }
      tickRipples(ts);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      btns.forEach((b) => b.removeEventListener("click", onClick as unknown as EventListener));
      window.removeEventListener("resize", measureSeams);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.bg + " " + styles.isDemo} ref={rootRef} role="group" aria-label="텍스트 정렬">
        {ALIGNS.map((align, i) => (
          <button
            key={align}
            className={styles.btn}
            data-align={align}
            aria-pressed={i === 0}
            ref={(el: HTMLButtonElement | null) => { if (el) btnRefs.current[i] = el; }}
          >
            {LABELS[align]}
          </button>
        ))}
        {[0, 1, 2].map((i) => (
          <span key={i} className={styles.seam} ref={(el: HTMLSpanElement | null) => { if (el) seamRefs.current[i] = el; }} aria-hidden="true" />
        ))}
      </div>
    </main>
  );
}
