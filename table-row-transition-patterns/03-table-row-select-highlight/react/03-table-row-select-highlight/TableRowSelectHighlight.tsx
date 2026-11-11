import { useEffect, useRef } from "react";
import styles from "./TableRowSelectHighlight.module.scss";

type Box<T> = { current: T };

export default function TableRowSelectHighlight() {
  const rootRef = useRef(null) as unknown as Box<HTMLTableElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const rows = [0, 1, 2, 3].map((i) => root.querySelector(`.${styles["row" + i]}`) as HTMLElement | null);
    if (rows.some((el) => !el)) return;

    // 상수: 스프링 강성(k) · 감쇠(d) · 프레임당 시간 스텝 · 자동 루프 간격
    const REDUCE = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const K = REDUCE ? 1 : 0.26;
    const D = REDUCE ? 1 : 0.62;
    const DT = 1;
    const AUTO_SELECT_MS = 550;

    const selected = [false, false, false, false];
    const pos = [0, 0, 0, 0];
    const vel = [0, 0, 0, 0];
    let stopped = false;
    let rafId = 0;
    let autoTimer = 0;

    function baseColor() { return [35, 31, 40]; }
    function hiColor() { return [10, 79, 232]; }

    function tick() {
      if (stopped) return;
      for (let i = 0; i < 4; i++) {
        const target = selected[i] ? 1 : 0;
        const acc = -K * (pos[i] - target) - D * vel[i];
        vel[i] += acc * DT;
        pos[i] += vel[i] * DT;
        const clampedForColor = Math.max(0, Math.min(1, pos[i]));
        const over = Math.max(0, pos[i] - 1);
        const b = baseColor(), h = hiColor();
        const r = b[0] + (h[0] - b[0]) * clampedForColor;
        const g = b[1] + (h[1] - b[1]) * clampedForColor;
        const bl = b[2] + (h[2] - b[2]) * clampedForColor;
        rows[i]!.style.background = "rgb(" + r.toFixed(0) + "," + g.toFixed(0) + "," + bl.toFixed(0) + ")";
        rows[i]!.style.boxShadow = over > 0.001 ? ("inset 0 0 0 " + (over * 6).toFixed(1) + "px rgba(255,255,255," + Math.min(0.6, over).toFixed(2) + ")") : "none";
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    function select(i: number) {
      selected[i] = !selected[i];
    }

    const cleanups: Array<() => void> = [];
    rows.forEach((el, i) => {
      function onClick() {
        root!.classList.remove(styles["is-demo"]);
        select(i);
      }
      el!.addEventListener("click", onClick);
      cleanups.push(() => el!.removeEventListener("click", onClick));
    });

    let autoI = 0;
    const autoSeq = [0, 1, 2, 3, 0, 1, 2, 3];
    function autoStep() {
      if (stopped) return;
      if (root!.classList.contains(styles["is-demo"])) {
        select(autoSeq[autoI % autoSeq.length]);
      }
      autoI++;
      autoTimer = window.setTimeout(autoStep, AUTO_SELECT_MS);
    }
    autoTimer = window.setTimeout(autoStep, AUTO_SELECT_MS);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(autoTimer);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <table ref={rootRef} className={`${styles.stage} ${styles.tsh} ${styles["is-demo"]}`}>
      <tbody>
        <tr className={`${styles.row} ${styles.row0}`}><td className={styles.cell}>항목 A</td><td className={`${styles.cell} ${styles.cellNum}`}>14</td></tr>
        <tr className={`${styles.row} ${styles.row1}`}><td className={styles.cell}>항목 B</td><td className={`${styles.cell} ${styles.cellNum}`}>27</td></tr>
        <tr className={`${styles.row} ${styles.row2}`}><td className={styles.cell}>항목 C</td><td className={`${styles.cell} ${styles.cellNum}`}>9</td></tr>
        <tr className={`${styles.row} ${styles.row3}`}><td className={styles.cell}>항목 D</td><td className={`${styles.cell} ${styles.cellNum}`}>31</td></tr>
      </tbody>
    </table>
  );
}
