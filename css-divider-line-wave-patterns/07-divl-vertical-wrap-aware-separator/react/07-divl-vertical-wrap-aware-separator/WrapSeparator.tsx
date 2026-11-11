// WrapSeparator — vanilla 판(07-divl-vertical-wrap-aware-separator) 의 React 포트.
// 항목 앞 세로 선은 줄 맨 앞 항목(is-first)에서만 JS 가 offsetTop 비교로 숨긴다.
import { useEffect, useRef } from "react";
import styles from "./WrapSeparator.module.scss";

type Box<T> = { current: T };

const SEP_GAP = 12;
const SEP_H_PX = 20;
const CYCLE_MS = 2000;
const NARROW_PX = 150;
const WIDE_PX = 336;
const LABELS: string[] = ["홈", "디자인", "코드", "예제", "후기", "문의", "더보기"];

export default function WrapSeparator() {
  const cardRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const listRef = useRef<HTMLUListElement | null>(null) as Box<HTMLUListElement | null>;
  const rangeRef = useRef<HTMLInputElement | null>(null) as Box<HTMLInputElement | null>;
  const rowsRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;

  useEffect(() => {
    const card = cardRef.current;
    const list = listRef.current;
    const range = rangeRef.current;
    const rowsEl = rowsRef.current;
    if (!card || !list || !range || !rowsEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = Array.from(list.children) as HTMLElement[];
    const firstClass = styles.first;
    let demo = !reduce;
    let t0: number | null = null;
    let raf = 0;

    const mark = (): void => {
      let rows = 0;
      let lastTop: number | null = null;
      items.forEach((li) => {
        const top = li.offsetTop;
        const first = lastTop === null || top !== lastTop;
        if (first) rows += 1;
        li.classList.toggle(firstClass, first);
        lastTop = top;
      });
      rowsEl.textContent = String(rows);
    };
    const setWidth = (px: number): void => {
      card.style.width = px.toFixed(1) + "px";
      range.value = String(Math.round(px));
      mark();
    };
    const onInput = (): void => {
      demo = false;
      setWidth(Number(range.value));
    };
    range.addEventListener("input", onInput);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      if (demo) {
        const phase = ((ts - t0) % CYCLE_MS) / CYCLE_MS;
        const wave = 0.5 + 0.5 * Math.cos(phase * Math.PI * 2);
        setWidth(NARROW_PX + (WIDE_PX - NARROW_PX) * wave);
      }
      raf = requestAnimationFrame(tick);
    }

    card.style.setProperty("--sep-gap", SEP_GAP + "px");
    card.style.setProperty("--sep-h", SEP_H_PX + "px");
    setWidth(WIDE_PX);
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      range.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <div className={styles.dv}>
      <div className={styles.card} ref={cardRef}>
        <ul className={styles.list} ref={listRef}>
          {LABELS.map((label) => (
            <li key={label} className={styles.item}>{label}</li>
          ))}
        </ul>
      </div>
      <label className={styles.ctrl}>
        <span>폭</span>
        <input type="range" min={150} max={336} defaultValue={336} ref={rangeRef} />
        <span className={styles.meta}>
          <span className={styles.tag}>ROWS</span> <b ref={rowsRef}>1</b>
        </span>
      </label>
    </div>
  );
}
