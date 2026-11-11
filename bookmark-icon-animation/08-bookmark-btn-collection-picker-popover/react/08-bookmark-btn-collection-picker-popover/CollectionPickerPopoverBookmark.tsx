// CollectionPickerPopoverBookmark — vanilla 판(run/416/demo/08-bookmark-btn-collection-picker-popover/index.html) 의 React 포트.
// 값 하나: 팝오버가 열린 뒤 경과 시간 → 항목 인덱스 × POPOVER_STAGGER_MS 지연을 지나면 그 항목이 뜬다.
import { useEffect, useRef, useState } from "react";
import styles from "./CollectionPickerPopoverBookmark.module.scss";

type Box<T> = { current: T };

const LONGPRESS_MS = 420;
const POPOVER_STAGGER_MS = 45;
const POPOVER_ITEM_MS = 210;
const CYCLE_S = 2;

const NAMES = ["읽기 목록", "나중에 볼 글", "요리 레시피"];

export default function CollectionPickerPopoverBookmark() {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([null, null, null]) as Box<Array<HTMLButtonElement | null>>;
  const openStartRef = useRef<number | null>(null);
  const pressStartRef = useRef<number | null>(null);
  const pressingRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [pressed, setPressed] = useState(false);
  const [status, setStatus] = useState("저장 전");
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function setOpen(v: boolean, now: number): void {
    if (btnRef.current) btnRef.current.setAttribute("aria-expanded", String(v));
    if (panelRef.current) panelRef.current.classList.toggle(styles.panelOpen, v);
    openStartRef.current = v ? now : null;
  }

  function renderPanel(now: number): void {
    const items = itemRefs.current;
    if (openStartRef.current === null) {
      items.forEach((el) => {
        if (!el) return;
        el.style.opacity = "0";
        el.style.transform = "translateY(6px)";
      });
      return;
    }
    const elapsed = now - openStartRef.current;
    items.forEach((el, i) => {
      if (!el) return;
      const delay = i * POPOVER_STAGGER_MS;
      const raw = (elapsed - delay) / POPOVER_ITEM_MS;
      const p = Math.max(0, Math.min(1, reduce ? 1 : raw));
      const eased = 1 - Math.pow(1 - p, 3);
      el.style.opacity = eased.toFixed(3);
      el.style.transform = "translateY(" + ((1 - eased) * 6).toFixed(2) + "px)";
    });
  }

  function selectCollection(now: number): void {
    setStatus("저장됨");
    setPressed(true);
    setOpen(false, now);
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    let start = 0;
    let prevT = 0;
    let cycleOpened = false;
    let cyclePicked = false;
    function loop(now: number): void {
      if (start === 0) start = now;
      if (pressingRef.current && pressStartRef.current === null) { pressStartRef.current = now; }
      if (pressingRef.current && pressStartRef.current !== null && openStartRef.current === null && (now - pressStartRef.current) > LONGPRESS_MS) {
        setOpen(true, now);
      }
      const t = ((now - start) / 1000) % CYCLE_S;
      if (t < prevT) { cycleOpened = false; cyclePicked = false; }
      prevT = t;
      if (!reduce && demo) {
        if (!cycleOpened && t > 0.15) { cycleOpened = true; setOpen(true, now); }
        if (!cyclePicked && t > 1.0) { cyclePicked = true; selectCollection(now); }
      }
      renderPanel(now);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce, demo]);

  function onItemClick(now: number): void {
    setDemo(false);
    selectCollection(now);
    btnRef.current?.focus({ preventScroll: true });
  }

  function focusItem(i: number): void {
    const items = itemRefs.current;
    const idx = ((i % items.length) + items.length) % items.length;
    items[idx]?.focus({ preventScroll: true });
  }

  function shortSave(): void {
    const v = !pressed;
    setPressed(v);
    setStatus(v ? "저장됨" : "저장 전");
  }

  function onPointerDown(): void {
    setDemo(false);
    pressingRef.current = true;
    pressStartRef.current = null;
  }

  function onPointerUp(): void {
    if (pressingRef.current && openStartRef.current === null) { shortSave(); }
    pressingRef.current = false;
    pressStartRef.current = null;
  }

  function onPointerLeave(): void {
    pressingRef.current = false;
    pressStartRef.current = null;
  }

  function onBtnClick(event: { detail: number; preventDefault: () => void }): void {
    if (openStartRef.current !== null) { event.preventDefault(); return; }
    // 키보드(Enter/Space) 로 발생한 click 은 pointerup 경로를 거치지 않으므로 여기서 저장 토글
    if (event.detail === 0) { setDemo(false); shortSave(); }
  }

  function onBtnKeyDown(event: { key: string; shiftKey: boolean; preventDefault: () => void }): void {
    // 롱프레스(포인터 전용) 대안: Shift+Enter 또는 ArrowDown 으로 팝오버를 열고 첫 항목으로 이동
    if (event.key === "ArrowDown" || (event.key === "Enter" && event.shiftKey)) {
      event.preventDefault();
      setDemo(false);
      if (openStartRef.current === null) { setOpen(true, performance.now()); }
      focusItem(0);
    } else if (event.key === "Escape" && openStartRef.current !== null) {
      event.preventDefault();
      setDemo(false);
      setOpen(false, performance.now());
    }
  }

  function onItemKeyDown(i: number, event: { key: string; preventDefault: () => void }): void {
    if (event.key === "ArrowDown") { event.preventDefault(); focusItem(i + 1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); focusItem(i - 1); }
    else if (event.key === "Escape") {
      event.preventDefault();
      setDemo(false);
      setOpen(false, performance.now());
      btnRef.current?.focus({ preventScroll: true });
    }
  }

  return (
    <main className={styles.stage}>
      <div className={styles.cp}>
        <p className={styles.caption}>폴더에 저장</p>
        <div className={styles.scene}>
          <button
            className={styles.btn}
            ref={btnRef}
            type="button"
            aria-pressed={pressed}
            aria-expanded={false}
            aria-haspopup="true"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            onClick={onBtnClick}
            onKeyDown={onBtnKeyDown}
          >
            <svg className={styles.icon} viewBox="0 0 24 24" width={28} height={28} aria-hidden="true" focusable="false">
              <path className={styles.shape} d="M6.5 3A1.5 1.5 0 0 1 8 1.5h8A1.5 1.5 0 0 1 17.5 3v18.2a.9.9 0 0 1-1.38.76L12 19.1l-4.12 2.86A.9.9 0 0 1 6.5 21.2Z" />
            </svg>
          </button>
          <div className={styles.panel} ref={panelRef} role="menu">
            <p className={styles.panelTitle}>저장할 목록 고르기</p>
            {NAMES.map((name, i) => (
              <button
                key={name}
                className={styles.item}
                type="button"
                role="menuitem"
                ref={(el: HTMLButtonElement | null) => { itemRefs.current[i] = el; }}
                onClick={() => onItemClick(performance.now())}
                onKeyDown={(event: { key: string; preventDefault: () => void }) => onItemKeyDown(i, event)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
      </div>
    </main>
  );
}
