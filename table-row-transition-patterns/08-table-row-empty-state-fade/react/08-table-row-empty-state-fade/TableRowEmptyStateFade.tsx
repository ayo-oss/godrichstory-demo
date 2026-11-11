import { useEffect, useRef } from "react";
import styles from "./TableRowEmptyStateFade.module.scss";

type Box<T> = { current: T };

type Row = { el: HTMLDivElement; removing: boolean; h: number };

export default function TableRowEmptyStateFade() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;
  const listRef = useRef(null) as unknown as Box<HTMLDivElement | null>;
  const emptyRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    const empty = emptyRef.current;
    if (!root || !list || !empty) return;

    // 상수: 행 높이(px) · 등장 값 보간 속도 · 자동 루프 간격
    const ROW_H = 32;
    const LERP = 0.2;
    const AUTO_STEP_MS = 900;
    const REFILL_LABELS = ["재고 A", "재고 B", "재고 C"];

    let rows: Row[] = [];
    let emptyProg = 0;
    let stopped = false;
    let rafId = 0;
    let autoTimer = 0;

    function makeRow(label: string): Row {
      const el = document.createElement("div");
      el.className = styles.row;
      el.textContent = label;
      list!.appendChild(el);
      return { el, removing: false, h: ROW_H };
    }

    function refill() {
      REFILL_LABELS.forEach((label) => rows.push(makeRow(label)));
    }
    refill();

    function removeLast() {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (!rows[i].removing) { rows[i].removing = true; return; }
      }
    }

    // 계산 겹: 행이 하나도 없는 상태 값이 켜지면 빈 화면 문구의 등장 값(emptyProg)이 0에서
    // 매 프레임 남은 거리의 20%씩 올라간다
    function tick() {
      if (stopped) return;
      for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        const targetH = r.removing ? 0 : ROW_H;
        r.h += (targetH - r.h) * LERP;
        r.el.style.height = Math.max(0, r.h).toFixed(1) + "px";
        r.el.style.opacity = (r.h / ROW_H).toFixed(2);
        if (r.removing && r.h < 0.5) {
          r.el.remove();
          rows.splice(i, 1);
        }
      }
      const noRows = rows.length === 0;
      const target = noRows ? 1 : 0;
      emptyProg += (target - emptyProg) * LERP;
      empty!.style.opacity = emptyProg.toFixed(2);
      empty!.style.transform = "translateY(" + ((1 - emptyProg) * 10).toFixed(1) + "px)";
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      if (rows.length) removeLast(); else refill();
    }
    root.addEventListener("click", onClick);

    function autoStep() {
      if (stopped) return;
      if (root!.classList.contains(styles["is-demo"])) {
        if (rows.length) removeLast();
        else refill();
      }
      autoTimer = window.setTimeout(autoStep, AUTO_STEP_MS);
    }
    autoTimer = window.setTimeout(autoStep, AUTO_STEP_MS);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(autoTimer);
      root!.removeEventListener("click", onClick);
      rows.forEach((r) => r.el.remove());
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.tef} ${styles["is-demo"]}`}>
      <div ref={listRef} className={styles.list} />
      <div ref={emptyRef} className={styles.empty}>표시할 항목이 없습니다</div>
    </div>
  );
}
