import { useEffect, useRef } from "react";
import styles from "./TableRowInlineEditMorph.module.scss";

type Box<T> = { current: T };

export default function TableRowInlineEditMorph() {
  const rootRef = useRef(null) as unknown as Box<HTMLTableElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // 상수: 모프 보간 속도 · 자동 루프 간격
    const LERP = 0.25;
    const AUTO_TOGGLE_MS = 1200;

    const cells = [0, 1, 2].map((i) => ({
      cell: root.querySelector(`.${styles["cell" + i]}`) as HTMLElement,
      box: root.querySelector(`.${styles["box" + i]}`) as HTMLElement,
      text: root.querySelector(`.${styles["text" + i]}`) as HTMLElement,
      input: root.querySelector(`.${styles["input" + i]}`) as HTMLInputElement,
      editing: false,
      prog: 0,
    }));
    if (cells.some((c) => !c.cell || !c.box || !c.text || !c.input)) return;

    let stopped = false;
    let rafId = 0;
    let autoTimer = 0;
    const cleanups: Array<() => void> = [];

    // 계산 겹: 문구 값의 자연 크기와 입력 칸 값의 자연 크기를 실측(getBoundingClientRect)해
    // 편집 상태 값의 진행도(prog)만큼 두 크기 사이를 보간한 박스를 그린다
    function measure(c: typeof cells[number]) {
      const tr = c.text.getBoundingClientRect();
      const ir = c.input.getBoundingClientRect();
      const pr = c.cell.getBoundingClientRect();
      return {
        textRect: { l: tr.left - pr.left, t: tr.top - pr.top, w: tr.width, h: tr.height },
        inputRect: { l: ir.left - pr.left, t: ir.top - pr.top, w: ir.width, h: ir.height },
      };
    }

    function tick() {
      if (stopped) return;
      cells.forEach((c) => {
        const target = c.editing ? 1 : 0;
        c.prog += (target - c.prog) * LERP;
        if (Math.abs(target - c.prog) < 0.01) c.prog = target;
        const m = measure(c);
        const t = m.textRect, i = m.inputRect;
        const l = t.l + (i.l - t.l) * c.prog;
        const top = t.t + (i.t - t.t) * c.prog;
        const w = t.w + (i.w - t.w) * c.prog;
        const h = t.h + (i.h - t.h) * c.prog;
        c.box.style.transform = "translate(" + l.toFixed(1) + "px," + top.toFixed(1) + "px)";
        c.box.style.width = w.toFixed(1) + "px";
        c.box.style.height = h.toFixed(1) + "px";
        c.text.style.opacity = (1 - c.prog).toFixed(2);
        c.input.style.opacity = c.prog.toFixed(2);
        c.input.style.pointerEvents = c.prog > 0.6 ? "auto" : "none";
      });
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    cells.forEach((c) => {
      function onCellClick() {
        if (c.editing) return;
        root!.classList.remove(styles["is-demo"]);
        c.editing = true;
      }
      function onBlur() { c.editing = false; }
      function onKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") c.input.blur();
      }
      c.cell.addEventListener("click", onCellClick);
      c.input.addEventListener("blur", onBlur);
      c.input.addEventListener("keydown", onKeydown);
      cleanups.push(() => {
        c.cell.removeEventListener("click", onCellClick);
        c.input.removeEventListener("blur", onBlur);
        c.input.removeEventListener("keydown", onKeydown);
      });
    });

    let autoI = 0;
    function autoStep() {
      if (stopped) return;
      if (root!.classList.contains(styles["is-demo"])) {
        const c = cells[autoI % cells.length];
        c.editing = !c.editing;
      }
      autoI++;
      autoTimer = window.setTimeout(autoStep, AUTO_TOGGLE_MS);
    }
    autoTimer = window.setTimeout(autoStep, AUTO_TOGGLE_MS);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(autoTimer);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <table ref={rootRef} className={`${styles.stage} ${styles.tie} ${styles["is-demo"]}`}>
      <tbody>
        <tr className={styles.row}>
          <td className={styles.label}>상품 A</td>
          <td className={`${styles.editcell} ${styles.cell0}`}>
            <span className={`${styles.box} ${styles.box0}`} />
            <span className={`${styles.text} ${styles.text0}`}>12</span>
            <input className={`${styles.input} ${styles.input0}`} type="text" defaultValue="12" />
          </td>
        </tr>
        <tr className={styles.row}>
          <td className={styles.label}>상품 B</td>
          <td className={`${styles.editcell} ${styles.cell1}`}>
            <span className={`${styles.box} ${styles.box1}`} />
            <span className={`${styles.text} ${styles.text1}`}>7</span>
            <input className={`${styles.input} ${styles.input1}`} type="text" defaultValue="7" />
          </td>
        </tr>
        <tr className={styles.row}>
          <td className={styles.label}>상품 C</td>
          <td className={`${styles.editcell} ${styles.cell2}`}>
            <span className={`${styles.box} ${styles.box2}`} />
            <span className={`${styles.text} ${styles.text2}`}>30</span>
            <input className={`${styles.input} ${styles.input2}`} type="text" defaultValue="30" />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
