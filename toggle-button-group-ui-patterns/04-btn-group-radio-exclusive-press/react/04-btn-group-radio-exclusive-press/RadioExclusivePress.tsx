// RadioExclusivePress — vanilla 판(run/369/demo/04-btn-group-radio-exclusive-press/index.html) 의 React 포트.
// 버튼마다 눌림 깊이(depth)를 감쇠 스프링으로 적분한다. 한 버튼이 켜지는 순간 나머지가 동시에
// 0으로 되돌아가고, 켜지는 버튼은 depth 1을 살짝 넘겼다가 정착한다(오버슛).
import { useEffect, useRef } from "react";
import styles from "./RadioExclusivePress.module.scss";

type Box<T> = { current: T };

const LABELS = ["목록형", "격자형", "보드형"];

export default function RadioExclusivePress() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const btnRefs = useRef([]) as unknown as Box<HTMLButtonElement[]>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const CYCLE_MS = 950;
    const STIFF = 320; // 계산 겹 상수: 눌림 깊이 스프링 강성
    const DAMP = 14; // 계산 겹 상수: 감쇠
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const btns = btnRefs.current;
    if (!root || btns.length === 0) return;

    let isDemo = true;
    let checkedIdx = 0;
    const depth = btns.map(() => 0);
    const vel = btns.map(() => 0);
    const target = btns.map((_, i) => (i === 0 ? 1 : 0));

    function setChecked(idx: number) {
      checkedIdx = idx;
      btns.forEach((b, i) => {
        const on = i === idx;
        b.setAttribute("aria-checked", String(on));
        b.setAttribute("tabindex", on ? "0" : "-1");
        target[i] = on ? 1 : 0;
        if (reduce) { depth[i] = target[i]; vel[i] = 0; }
      });
    }

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    const clicks: (() => void)[] = [];
    btns.forEach((b, i) => {
      const fn = () => { human(); setChecked(i); b.focus({ preventScroll: true }); };
      b.addEventListener("click", fn);
      clicks.push(fn);
    });

    function onKeydown(e: KeyboardEvent) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      human();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = (checkedIdx + dir + btns.length) % btns.length;
      setChecked(next);
      btns[next].focus({ preventScroll: true });
      e.preventDefault();
    }
    root.addEventListener("keydown", onKeydown);

    function render(i: number) {
      const d = depth[i];
      const y = d * 3 + (d > 1 ? (d - 1) * 4 : 0);
      const blur = 14 - d * 8;
      const offY = 8 - d * 6;
      btns[i].style.transform = "translateY(" + y.toFixed(2) + "px)";
      btns[i].style.boxShadow = "0 " + Math.max(1, offY).toFixed(1) + "px " + Math.max(4, blur).toFixed(1) + "px rgba(23,20,26,.34)";
      btns[i].classList.toggle(styles.btnOn, d > 0.5);
    }

    let cycleStart = 0, lastIdx = -1;
    function loop(ts: number) {
      if (!cycleStart) cycleStart = ts;
      if (isDemo && !reduce) {
        const idx = Math.floor((ts - cycleStart) / CYCLE_MS) % btns.length;
        if (idx !== lastIdx) { lastIdx = idx; setChecked(idx); }
      }

      for (let i = 0; i < btns.length; i++) {
        const acc = STIFF * (target[i] - depth[i]) - DAMP * vel[i];
        vel[i] += acc * (1 / 60);
        depth[i] += vel[i] * (1 / 60);
        render(i);
      }

      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      btns.forEach((b, i) => b.removeEventListener("click", clicks[i]));
      root.removeEventListener("keydown", onKeydown);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.rep + " " + styles.isDemo} ref={rootRef} role="radiogroup" aria-label="보기 방식">
        {LABELS.map((label, i) => (
          <button
            key={label}
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
    </main>
  );
}
