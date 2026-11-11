import { useEffect, useRef } from "react";
import styles from "./DragPhysLassoSelect.module.scss";

type Box<T> = { current: T };
type Rect = { left: number; top: number; right: number; bottom: number };

export default function DragPhysLassoSelect() {
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const lassoRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<HTMLButtonElement[]>([]);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const field = fieldRef.current;
    const lasso = lassoRef.current;
    const caption = captionRef.current;
    const items = (itemRefs.current || []).filter(Boolean);
    if (!root || !field || !lasso || !caption || items.length !== 6) return;

    const LASSO_MIN_DRAG_PX = 4;
    const selected: boolean[] = items.map(() => false);
    let lassoing = false;
    let lassoStart: { x: number; y: number } | null = null;
    let focusIdx = 0;

    function setSelected(idx: number, on: boolean) {
      selected[idx] = on;
      items[idx].classList.toggle(styles.isSelected, on);
      items[idx].setAttribute("aria-selected", on ? "true" : "false");
    }

    function rectsIntersect(a: Rect, b: Rect) {
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    function updateLassoSelection(rect: Rect) {
      items.forEach(function (el, idx) {
        const r = el.getBoundingClientRect();
        setSelected(idx, rectsIntersect(rect, r));
      });
    }

    function drawLasso(x0: number, y0: number, x1: number, y1: number): Rect {
      const left = Math.min(x0, x1), top = Math.min(y0, y1);
      const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
      const fieldRect = field!.getBoundingClientRect();
      lasso!.style.left = left - fieldRect.left + "px";
      lasso!.style.top = top - fieldRect.top + "px";
      lasso!.style.width = w + "px";
      lasso!.style.height = h + "px";
      lasso!.style.opacity = "1";
      return { left: left, top: top, right: left + w, bottom: top + h };
    }

    function updateCountCaption() {
      const count = selected.filter(Boolean).length;
      caption!.textContent = count > 0 ? count + "개 골랐어요" : "빈 곳을 끌면 사각형과 겹친 카드가 골라져요";
    }

    function beginLasso(clientX: number, clientY: number) {
      lassoing = true;
      lassoStart = { x: clientX, y: clientY };
      root!.classList.add(styles.isDragging);
      caption!.textContent = "겹치는 카드가 실시간으로 골라져요";
    }

    function moveLasso(clientX: number, clientY: number) {
      if (!lassoing || !lassoStart) return;
      const rect = drawLasso(lassoStart.x, lassoStart.y, clientX, clientY);
      if (Math.abs(clientX - lassoStart.x) > LASSO_MIN_DRAG_PX || Math.abs(clientY - lassoStart.y) > LASSO_MIN_DRAG_PX) {
        updateLassoSelection(rect);
      }
    }

    function endLasso() {
      lassoing = false;
      root!.classList.remove(styles.isDragging);
      lasso!.style.opacity = "0";
      updateCountCaption();
    }

    function onFieldPointerDown(e: PointerEvent) {
      root!.classList.remove("is-demo");
      if ((e.target as HTMLElement).classList.contains(styles.item)) return;
      field!.setPointerCapture(e.pointerId);
      beginLasso(e.clientX, e.clientY);
      e.preventDefault();
    }
    function onFieldPointerMove(e: PointerEvent) {
      if (!lassoing) return;
      moveLasso(e.clientX, e.clientY);
      e.preventDefault();
    }
    function onFieldPointerUp(e: PointerEvent) {
      if (!lassoing) return;
      endLasso();
      e.preventDefault();
    }
    field.addEventListener("pointerdown", onFieldPointerDown);
    field.addEventListener("pointermove", onFieldPointerMove);
    field.addEventListener("pointerup", onFieldPointerUp);

    const itemHandlers: { el: HTMLButtonElement; down: (e: PointerEvent) => void; click: () => void; key: (e: KeyboardEvent) => void }[] = [];
    items.forEach(function (el, idx) {
      function down(e: PointerEvent) {
        root!.classList.remove("is-demo");
        e.stopPropagation();
      }
      function click() {
        root!.classList.remove("is-demo");
        setSelected(idx, !selected[idx]);
        updateCountCaption();
      }
      function key(e: KeyboardEvent) {
        root!.classList.remove("is-demo");
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSelected(idx, !selected[idx]);
          updateCountCaption();
          return;
        }
        let dir = 0;
        if (e.key === "ArrowRight") dir = 1;
        else if (e.key === "ArrowLeft") dir = -1;
        else if (e.key === "ArrowDown") dir = 3;
        else if (e.key === "ArrowUp") dir = -3;
        else if (e.key === "Escape") {
          e.preventDefault();
          items.forEach(function (elx, i) { setSelected(i, false); });
          updateCountCaption();
          return;
        } else { return; }
        e.preventDefault();
        focusIdx = Math.max(0, Math.min(items.length - 1, idx + dir));
        items[focusIdx].focus({ preventScroll: true });
      }
      el.addEventListener("pointerdown", down);
      el.addEventListener("click", click);
      el.addEventListener("keydown", key);
      itemHandlers.push({ el, down, click, key });
    });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demoRaf = 0;
    if (reduce) {
      root.classList.remove("is-demo");
    } else {
      const fieldRect0 = field.getBoundingClientRect();
      const startX = fieldRect0.left + fieldRect0.width * 0.08;
      const startY = fieldRect0.top + fieldRect0.height * 0.14;
      const endX = fieldRect0.left + fieldRect0.width * 0.62;
      const endY = fieldRect0.top + fieldRect0.height * 0.68;
      let demoStart: number | null = null;
      function demoTick(ts: number) {
        if (demoStart === null) demoStart = ts;
        const t = ts - demoStart;
        if (t < 200) {
          // 대기
        } else if (t < 1100) {
          const p = Math.min(1, (t - 200) / 900);
          const ease = 1 - Math.pow(1 - p, 2);
          const cx = startX + (endX - startX) * ease;
          const cy = startY + (endY - startY) * ease;
          if (t < 220) beginLasso(startX, startY);
          moveLasso(cx, cy);
        } else if (t < 1450) {
          // 선택 결과 관찰
        } else if (t < 1480) {
          endLasso();
        } else {
          if (t > 1900) demoStart = ts - 60;
        }
        demoRaf = requestAnimationFrame(demoTick);
      }
      demoRaf = requestAnimationFrame(demoTick);
    }

    return () => {
      field.removeEventListener("pointerdown", onFieldPointerDown);
      field.removeEventListener("pointermove", onFieldPointerMove);
      field.removeEventListener("pointerup", onFieldPointerUp);
      itemHandlers.forEach(function (h) {
        h.el.removeEventListener("pointerdown", h.down);
        h.el.removeEventListener("click", h.click);
        h.el.removeEventListener("keydown", h.key);
      });
      cancelAnimationFrame(demoRaf);
    };
  }, []);

  const labels = ["1", "2", "3", "4", "5", "6"];

  return (
    <main className={styles.stage}>
      <div className={`${styles.ls} is-demo`} ref={rootRef}>
        <div
          className={styles.field}
          ref={fieldRef}
          role="listbox"
          aria-multiselectable="true"
          aria-label="드래그해서 여러 카드를 한 번에 고르는 영역. 카드에 포커스한 뒤 Enter 로 하나씩 고를 수도 있습니다"
        >
          {labels.map(function (label, idx) {
            return (
              <button
                key={label}
                type="button"
                className={styles.item}
                role="option"
                aria-selected="false"
                ref={function (el: HTMLButtonElement | null) { if (el) itemRefs.current![idx] = el; }}
              >{label}</button>
            );
          })}
          <div className={styles.lasso} ref={lassoRef}></div>
        </div>
        <p className={styles.caption} ref={captionRef}>빈 곳을 끌면 사각형과 겹친 카드가 골라져요</p>
      </div>
    </main>
  );
}
