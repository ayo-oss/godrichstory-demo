import { useEffect, useRef } from "react";
import styles from "./TableRowInsertSlideIn.module.scss";

type Box<T> = { current: T };

type Row = { el: HTMLDivElement; order: number; y: number };

export default function TableRowInsertSlideIn() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // 상수: 행 높이(px) · 보간 속도 · 표시 슬롯 수 · 자동 삽입 간격
    const ROW_H = 34;
    const LERP = 0.24;
    const SLOTS = 4;
    const AUTO_INSERT_MS = 1200;

    let seq = 100;
    const rows: Row[] = [];
    let stopped = false;
    let rafId = 0;
    let autoTimer = 0;

    function makeRow(label: number, amount: number) {
      const el = document.createElement("div");
      el.className = styles.row;
      el.setAttribute("role", "row");
      const c1 = document.createElement("span");
      c1.className = styles.cell;
      c1.setAttribute("role", "cell");
      c1.textContent = "주문 " + label;
      const c2 = document.createElement("span");
      c2.className = `${styles.cell} ${styles.cellNum}`;
      c2.setAttribute("role", "cell");
      c2.textContent = String(amount);
      el.appendChild(c1);
      el.appendChild(c2);
      root!.appendChild(el);
      return el;
    }

    function insert() {
      seq++;
      const el = makeRow(seq, ((seq % 7) + 1) * 1000);
      const entry: Row = { el, order: -1, y: -ROW_H };
      // 계산 겹: 기존 행의 슬롯(순서) 값을 하나씩 뒤로 밀어 목표 y 를 다시 계산한다
      rows.forEach((r) => { r.order += 1; });
      rows.unshift(entry);
      entry.order = 0;
      el.style.transform = "translateY(" + entry.y.toFixed(1) + "px)";
    }

    function tick() {
      if (stopped) return;
      rows.forEach((r) => {
        const target = r.order * ROW_H;
        r.y += (target - r.y) * LERP;
        const opacity = r.order >= SLOTS ? Math.max(0, 1 - (r.y - (SLOTS - 1) * ROW_H) / ROW_H) : 1;
        r.el.style.transform = "translateY(" + r.y.toFixed(1) + "px)";
        r.el.style.opacity = opacity.toFixed(2);
      });
      for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        if (r.order >= SLOTS && Math.abs(r.order * ROW_H - r.y) < 1) {
          r.el.remove();
          rows.splice(i, 1);
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    insert(); insert(); insert(); insert();
    rows.forEach((r) => { r.y = r.order * ROW_H; r.el.style.transform = "translateY(" + r.y + "px)"; });

    root.style.height = (SLOTS * ROW_H) + "px";

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      insert();
    }
    root.addEventListener("click", onClick);

    function autoStep() {
      if (stopped) return;
      if (root!.classList.contains(styles["is-demo"])) insert();
      autoTimer = window.setTimeout(autoStep, AUTO_INSERT_MS);
    }
    autoTimer = window.setTimeout(autoStep, AUTO_INSERT_MS);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(autoTimer);
      root!.removeEventListener("click", onClick);
      rows.forEach((r) => r.el.remove());
    };
  }, []);

  return <div ref={rootRef} className={`${styles.stage} ${styles.tis} ${styles["is-demo"]}`} role="table" aria-label="신규 주문 표" />;
}
