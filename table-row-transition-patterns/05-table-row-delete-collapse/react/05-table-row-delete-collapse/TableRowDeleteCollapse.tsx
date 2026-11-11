import { useEffect, useRef } from "react";
import styles from "./TableRowDeleteCollapse.module.scss";

type Box<T> = { current: T };

type Row = { el: HTMLDivElement; inner: HTMLDivElement; order: number; y: number; h: number; removing: boolean };

export default function TableRowDeleteCollapse() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // 상수: 행 높이(px) · 위치 보간 속도 · 높이 보간 속도 · 슬롯 수 · 자동 삭제 간격
    const ROW_H = 34;
    const POS_LERP = 0.22;
    const H_LERP = 0.26;
    const SLOTS = 4;
    const AUTO_DELETE_MS = 1300;

    let seq = 0;
    const rows: Row[] = [];
    let stopped = false;
    let rafId = 0;
    let autoTimer = 0;
    const cleanups: Array<() => void> = [];

    function makeRow(label: number) {
      const el = document.createElement("div");
      el.className = styles.row;
      const inner = document.createElement("div");
      inner.className = styles.inner;
      const cell = document.createElement("span");
      cell.className = styles.cell;
      cell.textContent = "작업 " + label;
      const btn = document.createElement("button");
      btn.className = styles.x;
      btn.type = "button";
      btn.setAttribute("aria-label", "삭제");
      btn.textContent = "×";
      inner.appendChild(cell);
      inner.appendChild(btn);
      el.appendChild(inner);
      root!.appendChild(el);
      return { el, inner };
    }

    function remove(entry: Row) {
      if (entry.removing) return;
      entry.removing = true;
      rows.forEach((r) => {
        if (!r.removing && r.order > entry.order) r.order -= 1;
      });
    }

    function addRow(entering: boolean) {
      seq++;
      const made = makeRow(seq);
      const order = rows.filter((r) => !r.removing).length;
      const entry: Row = { el: made.el, inner: made.inner, order, y: order * ROW_H, h: entering ? 0 : ROW_H, removing: false };
      const btn = made.inner.querySelector(`.${styles.x}`) as HTMLButtonElement;
      function onClick(e: Event) {
        e.stopPropagation();
        root!.classList.remove(styles["is-demo"]);
        remove(entry);
      }
      btn.addEventListener("click", onClick);
      cleanups.push(() => btn.removeEventListener("click", onClick));
      rows.push(entry);
      return entry;
    }

    function tick() {
      if (stopped) return;
      for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        const targetY = r.order * ROW_H;
        r.y += (targetY - r.y) * POS_LERP;
        const targetH = r.removing ? 0 : ROW_H;
        r.h += (targetH - r.h) * H_LERP;
        r.el.style.transform = "translateY(" + r.y.toFixed(1) + "px)";
        r.inner.style.height = Math.max(0, r.h).toFixed(1) + "px";
        r.inner.style.opacity = (r.h / ROW_H).toFixed(2);
        if (r.removing && r.h < 0.5) {
          r.el.remove();
          rows.splice(i, 1);
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    addRow(false); addRow(false); addRow(false); addRow(false);
    root.style.height = (SLOTS * ROW_H) + "px";

    function autoStep() {
      if (stopped) return;
      if (root!.classList.contains(styles["is-demo"]) && rows.length) {
        remove(rows[0]);
        addRow(true);
      }
      autoTimer = window.setTimeout(autoStep, AUTO_DELETE_MS);
    }
    autoTimer = window.setTimeout(autoStep, AUTO_DELETE_MS);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(autoTimer);
      cleanups.forEach((fn) => fn());
      rows.forEach((r) => r.el.remove());
    };
  }, []);

  return <div ref={rootRef} className={`${styles.stage} ${styles.tdc} ${styles["is-demo"]}`} role="table" aria-label="삭제 가능한 작업 표" />;
}
