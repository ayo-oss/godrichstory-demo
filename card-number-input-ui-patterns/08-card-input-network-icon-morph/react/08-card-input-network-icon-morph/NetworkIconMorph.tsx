import { useEffect, useRef } from "react";
import styles from "./NetworkIconMorph.module.scss";

type Box<T> = { current: T };

const MORPH_MS = 420; // 계산 겹: 앞자리 패턴 값이 바뀔 때 도형 점을 이만큼 동안 보간한다

// 가상 도형 3종(A/B/C) — 실제 카드사 로고·BIN 범위와 무관한 중립 라벨.
const SHAPES: Record<string, number[][]> = {
  A: [[20, 4], [33.9, 12], [33.9, 28], [20, 36], [6.1, 28], [6.1, 12]],
  B: [[29, 4.4], [33, 20], [29, 35.6], [13.5, 31.3], [2, 20], [13.5, 8.7]],
  C: [[20, 1], [26.9, 16], [36.5, 29.5], [20, 28], [3.5, 29.5], [13.1, 16]],
  N: [[20, 10], [28, 15], [28, 25], [20, 30], [12, 25], [12, 15]],
};
const PREFIX_MAP: Record<string, string> = { "3": "C", "4": "A", "5": "B" };

export default function NetworkIconMorph() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const poly = root.querySelector(`.${styles.poly}`) as SVGPolygonElement | null;
    const tag = root.querySelector(`.${styles.tag}`) as HTMLElement | null;
    if (!input || !poly || !tag) return;

    let current = SHAPES.N.map((p) => p.slice());
    let raf: number | null = null;

    function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }

    function morphTo(key: string) {
      const target = SHAPES[key];
      const start = current.map((p) => p.slice());
      const t0 = performance.now();
      if (raf !== null) cancelAnimationFrame(raf);
      function step(now: number) {
        const t = Math.min((now - t0) / MORPH_MS, 1);
        const e = easeOut(t);
        const pts = start.map((p, i) => {
          const x = p[0] + (target[i][0] - p[0]) * e;
          const y = p[1] + (target[i][1] - p[1]) * e;
          return x.toFixed(1) + "," + y.toFixed(1);
        });
        poly!.setAttribute("points", pts.join(" "));
        if (t < 1) { raf = requestAnimationFrame(step); }
        else { current = target.map((p) => p.slice()); }
      }
      raf = requestAnimationFrame(step);
    }

    let lastKey = "N";
    function paint(value: string) {
      const lead = value.charAt(0);
      const key = PREFIX_MAP[lead] || "N";
      if (key !== lastKey) {
        morphTo(key);
        lastKey = key;
      }
      tag!.textContent = key === "N" ? "패턴 미인식" : "패턴 " + key;
    }

    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      input!.value = input!.value.replace(/\D/g, "").slice(0, 16);
      paint(input!.value);
    }
    input.addEventListener("input", onInput);

    // 자동 루프: 앞자리 값을 바꿔가며 세 패턴을 순서대로 보여준다.
    const SEQ = ["", "9999999999999995", "5399148803436467", "3739148803436", "", "9999999999999995"];
    let si = 0;
    let autoTimer: number | null = null;
    function autoTick() {
      input!.value = SEQ[si];
      paint(SEQ[si]);
      si = (si + 1) % SEQ.length;
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 1100); autoTick(); }
    else { input.value = SEQ[1]; paint(SEQ[1]); }

    return () => {
      stopAutoplay();
      input.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.cn} ${styles["is-demo"]}`}>
      <label className={styles.field}>
        <input className={styles.input} type="text" inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={16} defaultValue="" />
      </label>
      <div className={styles.shapeBox}>
        <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
          <polygon className={styles.poly} points="20,10 28,15 28,25 20,30 12,25 12,15" />
        </svg>
        <span className={styles.tag}>패턴 미인식</span>
      </div>
    </div>
  );
}
