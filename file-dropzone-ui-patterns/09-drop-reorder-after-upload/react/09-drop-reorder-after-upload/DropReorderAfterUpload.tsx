// DropReorderAfterUpload — vanilla 판(run/337/demo/09-drop-reorder-after-upload/index.html) 의
// React 포트. FLIP(First-Last-Invert-Play) 로 재배치를 부드럽게 잇는다: 재배치 전 각 칩의
// getBoundingClientRect() 를 먼저 찍고, DOM 순서를 바꾼 뒤 새 위치와의 차(dx)를 역방향
// transform 으로 즉시 걸어 리플로우로 확정한 다음 그 transform 을 지워 CSS 전환이 0 으로
// 되돌아가며 애니메이션되게 한다.
import { useEffect, useRef } from "react";
import styles from "./DropReorderAfterUpload.module.scss";

export type DropReorderAfterUploadProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "업로드 완료 뒤에도 드래그로 순서를 바꿀 수 있습니다 — FLIP 으로 위치 이동을 계산해 잇습니다";
const ARIA_LABEL = "업로드 후 재정렬 드롭존";

function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0; a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const HEXES = ["#9fc9ec", "#93d9c0", "#b9a0ff", "#f6c6d3", "#cfd8f5"];
const NAMES = ["cover.png", "profile.jpg", "banner.png", "thumb.jpg"];
const MAX_CHIPS = 4;
const SETTLE_MS = 500;

type Chip = { name: string; state: "reading" | "done"; el: HTMLLIElement };

export default function DropReorderAfterUpload({
  duration = "240ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a"
}: DropReorderAfterUploadProps) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const tagRef = useRef<HTMLSpanElement | null>(null);
  const unitRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const zone = zoneRef.current;
    const input = inputRef.current;
    const listEl = listRef.current;
    const tagEl = tagRef.current;
    const unitEl = unitRef.current;
    if (!zone || !input || !listEl || !tagEl || !unitEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rnd = mulberry32(909);

    let chips: (Chip | null)[] = [];
    let order: number[] = [];
    const settleTimers: number[] = [];

    // FLIP — 재배치 전 rect 를 찍고, DOM 순서를 바꾼 뒤 이전 위치와의 차를 되돌려 걸었다가 지운다
    function relayout(): void {
      const rects = new Map<number, DOMRect>();
      order.forEach((idx) => {
        const c = chips[idx];
        if (c) rects.set(idx, c.el.getBoundingClientRect());
      });
      order.forEach((idx) => {
        const c = chips[idx];
        if (c) listEl!.appendChild(c.el);
      });
      order.forEach((idx) => {
        const c = chips[idx];
        if (!c) return;
        const before = rects.get(idx);
        if (!before) return;
        const now = c.el.getBoundingClientRect();
        const dx = before.left - now.left;
        if (Math.abs(dx) > 0.5 && !reduce) {
          c.el.style.transition = "none";
          c.el.style.transform = "translateX(" + dx + "px)";
          void c.el.offsetWidth;
          c.el.style.transition = "";
          c.el.style.transform = "";
        }
      });
      const doneCount = chips.filter((c) => c && c.state === "done").length;
      const alive = chips.filter((c): c is Chip => !!c);
      unitEl!.textContent = "order " + order.map((idx) => (chips[idx] ? chips[idx]!.name : "")).join(" › ");
      tagEl!.textContent = "done " + doneCount + "/" + alive.length;
    }

    function insertionIndex(x: number): number {
      for (let i = 0; i < order.length; i++) {
        const c = chips[order[i]];
        if (!c) continue;
        const r = c.el.getBoundingClientRect();
        const mid = r.left + r.width / 2;
        if (x < mid) return i;
      }
      return order.length;
    }

    function armDrag(el: HTMLLIElement, self: number): void {
      let dragging = false;
      function onDown(e: PointerEvent): void {
        const c = chips[self];
        if (!c || c.state !== "done") return;
        dragging = true;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        el.classList.add(styles.chipDrag);
        el.addEventListener("pointermove", onMove as EventListener);
        el.addEventListener("pointerup", onUp as EventListener);
        el.addEventListener("pointercancel", onUp as EventListener);
      }
      function onMove(e: PointerEvent): void {
        if (!dragging) return;
        const to = insertionIndex(e.clientX);
        const from = order.indexOf(self);
        if (to !== from && to !== from + 1) {
          const moved = order.splice(from, 1)[0];
          const adj = to > from ? to - 1 : to;
          order.splice(adj, 0, moved);
          relayout();
        }
      }
      function onUp(): void {
        dragging = false;
        el.classList.remove(styles.chipDrag);
        el.removeEventListener("pointermove", onMove as EventListener);
        el.removeEventListener("pointerup", onUp as EventListener);
        el.removeEventListener("pointercancel", onUp as EventListener);
      }
      el.addEventListener("pointerdown", onDown as EventListener);
    }

    function addChip(name: string): void {
      if (chips.filter((c) => c).length >= MAX_CHIPS) {
        const oldestIdx = order.shift();
        if (oldestIdx !== undefined) {
          const old = chips[oldestIdx];
          if (old) old.el.remove();
          chips[oldestIdx] = null;
        }
      }
      const idx = chips.length;
      const li = document.createElement("li");
      li.className = styles.chip + " " + styles.chipReading;
      const dot = document.createElement("span");
      dot.className = styles.dot;
      dot.style.background = HEXES[Math.floor(rnd() * HEXES.length)];
      const nm = document.createElement("span");
      nm.className = styles.name;
      nm.textContent = name;
      const badge = document.createElement("span");
      badge.className = styles.badge;
      badge.textContent = "읽는 중";
      li.appendChild(dot); li.appendChild(nm); li.appendChild(badge);
      const chip: Chip = { name, state: "reading", el: li };
      chips.push(chip);
      order.push(idx);
      listEl!.appendChild(li);
      relayout();
      armDrag(li, idx);
      const settle = (): void => {
        chip.state = "done";
        li.className = styles.chip + " " + styles.chipDone;
        badge.textContent = "done";
        relayout();
      };
      if (reduce) settle();
      else settleTimers.push(window.setTimeout(settle, SETTLE_MS));
    }

    function onOver(e: DragEvent): void {
      e.preventDefault();
      zone!.classList.add(styles.zoneOver);
    }
    function onLeave(): void {
      zone!.classList.remove(styles.zoneOver);
    }
    function onDrop(e: DragEvent): void {
      e.preventDefault();
      zone!.classList.remove(styles.zoneOver);
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files) Array.prototype.slice.call(files, 0, 2).forEach((f: File) => addChip(f.name));
    }
    function onChange(): void {
      const files = input!.files;
      if (files) Array.prototype.slice.call(files, 0, 2).forEach((f: File) => addChip(f.name));
      input!.value = "";
    }
    zone.addEventListener("dragover", onOver as EventListener);
    zone.addEventListener("dragleave", onLeave);
    zone.addEventListener("drop", onDrop as EventListener);
    input.addEventListener("change", onChange);

    if (reduce) {
      addChip(NAMES[0]);
      addChip(NAMES[1]);
      window.setTimeout(() => {
        order.reverse();
        relayout();
      }, 40);
    } else {
      let phase = 0;
      let nextAt = 0;
      const step = (now: number): void => {
        if (now >= nextAt) {
          if (phase < 4) {
            nextAt = now + 640;
            addChip(NAMES[phase % NAMES.length]);
            phase++;
          } else {
            nextAt = now + 900;
            const alive = order.filter((idx) => chips[idx]);
            if (alive.length > 1) {
              const from = 1 + Math.floor(rnd() * (order.length - 1));
              const moved = order.splice(from, 1)[0];
              order.splice(0, 0, moved);
              relayout();
            }
            phase++;
          }
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      settleTimers.forEach((id) => window.clearTimeout(id));
      zone.removeEventListener("dragover", onOver as EventListener);
      zone.removeEventListener("dragleave", onLeave);
      zone.removeEventListener("drop", onDrop as EventListener);
      input.removeEventListener("change", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.rq}>
        <p className={styles.hint} id="rqHintReact">{HINT}</p>
        <div
          className={styles.zone}
          ref={zoneRef}
          role="button"
          tabIndex={0}
          aria-describedby="rqHintReact"
          aria-label={ARIA_LABEL}
        >
          <input type="file" multiple className={styles.file} ref={inputRef} aria-label="파일 선택" />
          <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M208 32v192a16 16 0 0 1-16 16H64a16 16 0 0 1-16-16V32a16 16 0 0 1 16-16h128a16 16 0 0 1 16 16" opacity=".2" />
              <path d="M104 60a12 12 0 1 1-12-12a12 12 0 0 1 12 12m60 12a12 12 0 1 0-12-12a12 12 0 0 0 12 12m-72 44a12 12 0 1 0 12 12a12 12 0 0 0-12-12m72 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12m-72 68a12 12 0 1 0 12 12a12 12 0 0 0-12-12m72 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12" />
            </g>
          </svg>
        </div>
        <ul className={styles.list} ref={listRef} aria-live="polite" />
        <p className={styles.meta}>
          <span className={styles.tag} ref={tagRef} style={{ color }}>done 0/0</span>
          <span className={styles.unit} ref={unitRef}>order</span>
        </p>
      </div>
    </main>
  );
}
