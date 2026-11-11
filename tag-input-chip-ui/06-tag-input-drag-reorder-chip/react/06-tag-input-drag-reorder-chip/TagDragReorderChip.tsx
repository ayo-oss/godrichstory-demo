// TagDragReorderChip — vanilla 판(run/397/demo/06-tag-input-drag-reorder-chip/index.html) 의 React 포트.
// 계산 겹(드래그 중심 x 대 이웃 중심 x 비교 + 순서 교체 시 위치 보정)은 vanilla 와 같은 값.
// 실사용 경로는 pointerdown/pointermove/pointerup — navigator.clipboard 등 금지 API 는 쓰지 않는다.
import { useEffect, useRef, useState } from "react";
import styles from "./TagDragReorderChip.module.scss";

type Box<T> = { current: T };
type PointerEvt = { clientX: number; isTrusted?: boolean; preventDefault(): void };
type KeyEvt = { key: string };

type Chip = { id: number; word: string };
const WORDS = ["기획", "디자인", "개발", "QA"];
const HOLD_MS = 700, BACK_MS = 700, PAUSE_MS = 500;

export default function TagDragReorderChip() {
  const rowRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const chipRefs = useRef({} as { [id: number]: HTMLLIElement }) as unknown as Box<{ [id: number]: HTMLLIElement }>;
  const orderRef = useRef(WORDS.map((w, i) => ({ id: i, word: w }))) as unknown as Box<Chip[]>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const dragIdRef = useRef(-1) as unknown as Box<number>;
  const startClientXRef = useRef(0) as unknown as Box<number>;
  const swapCompRef = useRef(0) as unknown as Box<number>;
  const lastDxRef = useRef(0) as unknown as Box<number>;
  const timerRef = useRef(0) as unknown as Box<number>;

  const [chips, setChips] = useState<Chip[]>(orderRef.current);
  const [draggingId, setDraggingId] = useState(-1);
  const [isDemo, setIsDemo] = useState(true);
  const [live, setLive] = useState("");

  function human() {
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function orderText(list: Chip[]) { return list.map((c) => c.word).join(", "); }

  function applyTransform(dx: number) {
    lastDxRef.current = dx;
    const el = chipRefs.current[dragIdRef.current];
    if (el) el.style.transform = "translateX(" + (dx + swapCompRef.current) + "px)";
  }

  function checkSwap() {
    const el = chipRefs.current[dragIdRef.current];
    if (!el) return;
    const dr = el.getBoundingClientRect();
    const dragCenter = dr.left + dr.width / 2;
    const list = orderRef.current;
    const idx = list.findIndex((c) => c.id === dragIdRef.current);
    if (idx > 0) {
      const prevEl = chipRefs.current[list[idx - 1].id];
      const pr = prevEl.getBoundingClientRect();
      if (dragCenter < pr.left + pr.width / 2) { doSwap(idx, idx - 1); return; }
    }
    if (idx < list.length - 1) {
      const nextEl = chipRefs.current[list[idx + 1].id];
      const nr = nextEl.getBoundingClientRect();
      if (dragCenter > nr.left + nr.width / 2) { doSwap(idx, idx + 1); return; }
    }
  }

  function doSwap(a: number, b: number) {
    const el = chipRefs.current[dragIdRef.current];
    const oldLeft = el.offsetLeft;
    const list = orderRef.current.slice();
    const tmp = list[a]; list[a] = list[b]; list[b] = tmp;
    orderRef.current = list;
    setChips(list);
    setLive(orderText(list));
    // 레이아웃 반영 뒤(다음 tick) 위치 보정 — DOM 순서가 실제로 바뀐 뒤라야 offsetLeft 가 새 값이다
    requestAnimationFrame(() => {
      const newLeft = el.offsetLeft;
      swapCompRef.current += oldLeft - newLeft;
      applyTransform(lastDxRef.current);
    });
  }

  function onPointerMove(e: PointerEvt) {
    if (dragIdRef.current < 0) return;
    e.preventDefault();
    applyTransform(e.clientX - startClientXRef.current);
    checkSwap();
  }

  function onPointerUp() {
    if (dragIdRef.current < 0) return;
    const el = chipRefs.current[dragIdRef.current];
    if (el) el.style.transform = "";
    dragIdRef.current = -1;
    setDraggingId(-1);
    swapCompRef.current = 0;
    window.removeEventListener("pointermove", onPointerMove as unknown as EventListener);
    window.removeEventListener("pointerup", onPointerUp as unknown as EventListener);
  }

  function startDrag(id: number, clientX: number, trusted: boolean) {
    if (trusted) human();
    dragIdRef.current = id;
    setDraggingId(id);
    startClientXRef.current = clientX;
    swapCompRef.current = 0;
    window.addEventListener("pointermove", onPointerMove as unknown as EventListener);
    window.addEventListener("pointerup", onPointerUp as unknown as EventListener);
  }

  function onKeyDown(chip: Chip, e: KeyEvt) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    human();
    const list = orderRef.current;
    const idx = list.findIndex((c) => c.id === chip.id);
    const j = e.key === "ArrowLeft" ? idx - 1 : idx + 1;
    if (j < 0 || j >= list.length) return;
    const next = list.slice();
    const tmp = next[idx]; next[idx] = next[j]; next[j] = tmp;
    orderRef.current = next;
    setChips(next);
    setLive(orderText(next));
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function simFrom(id: number, fromX: number, toX: number, ms: number, cb: () => void) {
      let t0 = 0;
      function step(ts: number) {
        if (!isDemoRef.current) return;
        if (!t0) t0 = ts;
        const p = Math.min(1, (ts - t0) / ms);
        const x = fromX + (toX - fromX) * p;
        onPointerMove({ clientX: x, isTrusted: false, preventDefault: () => {} });
        if (p < 1) requestAnimationFrame(step); else cb();
      }
      requestAnimationFrame(step);
    }

    function loop() {
      if (!isDemoRef.current) return;
      const first = orderRef.current[0];
      const el = chipRefs.current[first.id];
      if (!el) return;
      const r0 = el.getBoundingClientRect();
      const startX = r0.left + r0.width / 2;
      const endX = startX + 170;
      startDrag(first.id, startX, false);
      simFrom(first.id, startX, endX, HOLD_MS, () => {
        onPointerUp();
        timerRef.current = window.setTimeout(() => {
          if (!isDemoRef.current) return;
          const list = orderRef.current;
          const last = list[list.length - 1];
          const elB = chipRefs.current[last.id];
          if (!elB) return;
          const rb = elB.getBoundingClientRect();
          const bStart = rb.left + rb.width / 2;
          const bEnd = bStart - 170;
          startDrag(last.id, bStart, false);
          simFrom(last.id, bStart, bEnd, BACK_MS, () => {
            onPointerUp();
            timerRef.current = window.setTimeout(loop, PAUSE_MS);
          });
        }, PAUSE_MS);
      });
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(loop, 300);
    } else {
      isDemoRef.current = false;
      setIsDemo(false);
    }
    return () => {
      window.clearTimeout(timerRef.current);
      window.removeEventListener("pointermove", onPointerMove as unknown as EventListener);
      window.removeEventListener("pointerup", onPointerUp as unknown as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.dr + " " + (isDemo ? styles.isDemo : "")}>
        <ul className={styles.row} ref={rowRef} role="listbox" aria-label="태그 순서, 드래그로 바꾸기">
          {chips.map((c) => (
            <li
              key={c.id}
              ref={(el: HTMLLIElement | null) => { if (el) chipRefs.current[c.id] = el; }}
              className={styles.chip + " " + (draggingId === c.id ? styles.chipDragging : "")}
              role="option" aria-selected="false" tabIndex={0}
              onPointerDown={(e: PointerEvt) => startDrag(c.id, e.clientX, !!e.isTrusted)}
              onKeyDown={(e: KeyEvt) => onKeyDown(c, e)}
            >
              {c.word}
            </li>
          ))}
        </ul>
        <p className={styles.meta}>순서: <b>{orderText(chips)}</b></p>
        <p className={styles.sr} role="status">{live}</p>
      </div>
    </main>
  );
}
