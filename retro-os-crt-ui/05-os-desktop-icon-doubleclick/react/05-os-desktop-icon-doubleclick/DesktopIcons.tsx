// DesktopIcons — vanilla 판(run/023/demo/05-os-desktop-icon-doubleclick/index.html) 의 React 포트.
// 한 번 누르면 이름표만 선택 샅, 짧은 사이 두 번 누르면 아이콘이 한 번 커졌다가 창이 열린다.
// 두 번 누르기 판정은 click 이벤트의 e.detail — 터치는 시간차(400ms)로 보조한다.
// 방향키로 선택이 옮겨 다니고 Enter 로 연다.
import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./DesktopIcons.module.scss";

export type DesktopIconsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 타입에 React 이벤트 제네릭이 없다 — 쓰는 것만 로컬 타입으로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type ClickEvt = { detail: number; stopPropagation(): void };
type PtrEvt = { target: Node | null; currentTarget: Node | null };
type BtnBox = { current: Array<HTMLButtonElement | null> };
type NumBox = { current: number };

const LIST_ARIA = "바탕화면 아이콘";
const CLOSE_ARIA = "창 닫기";
const HINT = "한 번 누르면 선택, 빠르게 두 번 누르면 열립니다. 방향키로도 옮깁니다";
const META = [
  { icon: "folder", t: "내 문서", b: "문서 아이콘을 두 번 눌러 연 창입니다" },
  { icon: "image", t: "사진첩", b: "사진첩 아이콘을 두 번 눌러 연 창입니다" },
  { icon: "gear", t: "설정", b: "설정 아이콘을 두 번 눌러 연 창입니다" }
];

const ICONS: { [k: string]: ReactNode } = {
  folder: (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M128 80H32V56a8 8 0 0 1 8-8h52.69a8 8 0 0 1 5.65 2.34Z" opacity=".2" /><path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16M92.69 56l16 16H40V56ZM216 200H40V88h176Z" /></g></svg>
  ),
  image: (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M224 56v122.06l-39.72-39.72a8 8 0 0 0-11.31 0L147.31 164l-49.65-49.66a8 8 0 0 0-11.32 0L32 168.69V56a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8" opacity=".2" /><path d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m0 16v102.75l-26.07-26.06a16 16 0 0 0-22.63 0l-20 20l-44-44a16 16 0 0 0-22.62 0L40 149.37V56ZM40 172l52-52l80 80H40Zm176 28h-21.37l-36-36l20-20L216 181.38zm-72-100a12 12 0 1 1 12 12a12 12 0 0 1-12-12" /></g></svg>
  ),
  gear: (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="m230.1 108.76l-31.85-18.14c-.64-1.16-1.31-2.29-2-3.41l-.12-36A104.6 104.6 0 0 0 162 32l-32 17.89h-4L94 32a104.6 104.6 0 0 0-34.11 19.25l-.16 36c-.7 1.12-1.37 2.26-2 3.41l-31.84 18.1a99.2 99.2 0 0 0 0 38.46l31.85 18.14c.64 1.16 1.31 2.29 2 3.41l.12 36A104.6 104.6 0 0 0 94 224l32-17.87h4L162 224a104.6 104.6 0 0 0 34.08-19.25l.16-36c.7-1.12 1.37-2.26 2-3.41l31.84-18.1a99.2 99.2 0 0 0 .02-38.48M128 168a40 40 0 1 1 40-40a40 40 0 0 1-40 40" opacity=".2" /><path d="M128 80a48 48 0 1 0 48 48a48.05 48.05 0 0 0-48-48m0 80a32 32 0 1 1 32-32a32 32 0 0 1-32 32m109.94-52.79a8 8 0 0 0-3.89-5.4l-29.83-17l-.12-33.62a8 8 0 0 0-2.83-6.08a111.9 111.9 0 0 0-36.72-20.67a8 8 0 0 0-6.46.59L128 41.85L97.88 25a8 8 0 0 0-6.47-.6a111.9 111.9 0 0 0-36.68 20.75a8 8 0 0 0-2.83 6.07l-.15 33.65l-29.83 17a8 8 0 0 0-3.89 5.4a106.5 106.5 0 0 0 0 41.56a8 8 0 0 0 3.89 5.4l29.83 17l.12 33.63a8 8 0 0 0 2.83 6.08a111.9 111.9 0 0 0 36.72 20.67a8 8 0 0 0 6.46-.59L128 214.15L158.12 231a7.9 7.9 0 0 0 3.9 1a8.1 8.1 0 0 0 2.57-.42a112.1 112.1 0 0 0 36.68-20.73a8 8 0 0 0 2.83-6.07l.15-33.65l29.83-17a8 8 0 0 0 3.89-5.4a106.5 106.5 0 0 0-.03-41.52m-15 34.91l-28.57 16.25a8 8 0 0 0-3 3c-.58 1-1.19 2.06-1.81 3.06a7.94 7.94 0 0 0-1.22 4.21l-.15 32.25a95.9 95.9 0 0 1-25.37 14.3L134 199.13a8 8 0 0 0-3.91-1h-3.83a8.1 8.1 0 0 0-4.1 1l-28.84 16.1A96 96 0 0 1 67.88 201l-.11-32.2a8 8 0 0 0-1.22-4.22c-.62-1-1.23-2-1.8-3.06a8.1 8.1 0 0 0-3-3.06l-28.6-16.29a90.5 90.5 0 0 1 0-28.26l28.52-16.28a8 8 0 0 0 3-3c.58-1 1.19-2.06 1.81-3.06a7.94 7.94 0 0 0 1.22-4.21l.15-32.25a95.9 95.9 0 0 1 25.37-14.3L122 56.87a8 8 0 0 0 4.1 1h3.64a8 8 0 0 0 4.1-1l28.84-16.1A96 96 0 0 1 188.12 55l.11 32.2a8 8 0 0 0 1.22 4.22c.62 1 1.23 2 1.8 3.06a8.1 8.1 0 0 0 3 3.06l28.6 16.29a90.5 90.5 0 0 1 .05 28.29Z" /></g></svg>
  )
};

export default function DesktopIcons(props: DesktopIconsProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
  const color = props.color ?? "#0a4fe8";
  const [preview, setPreview] = useState(true);
  const [sel, setSel] = useState(-1);
  const [winIdx, setWinIdx] = useState(-1);
  const [pop, setPop] = useState({ idx: -1, key: 0 });
  const btnBox = useRef<Array<HTMLButtonElement | null>>([]) as BtnBox;
  const lastTap = useRef(0) as NumBox;
  const lastIdx = useRef(-1) as NumBox;
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  const select = (i: number, grab: boolean) => {
    setSel(i);
    if (grab && btnBox.current[i]) btnBox.current[i].focus({ preventScroll: true });
  };
  const openWin = (i: number) => {
    setWinIdx(i);
    setPop((p: { idx: number; key: number }) => ({ idx: i, key: p.key + 1 }));
  };
  const closeWin = () => setWinIdx(-1);

  const onClick = (i: number, e: ClickEvt) => {
    setPreview(false);
    select(i, false);
    // e.detail 은 같은 자리에서 연달아 누른 횟수 — 2 이상이면 두 번 누르기다
    if (e.detail >= 2 || (i === lastIdx.current && Date.now() - lastTap.current < 400)) openWin(i);
    lastTap.current = Date.now();
    lastIdx.current = i;
  };

  const onKeyDown = (e: KeyEvt) => {
    setPreview(false);
    const k = e.key;
    if (k === "ArrowDown" || k === "ArrowRight") {
      e.preventDefault();
      select((sel + 1) % META.length, true);
    } else if (k === "ArrowUp" || k === "ArrowLeft") {
      e.preventDefault();
      select((sel - 1 + META.length) % META.length, true);
    } else if (k === "Enter" || k === " ") {
      e.preventDefault();
      const cur = sel < 0 ? 0 : sel;
      select(cur, false);
      openWin(cur);
    } else if (k === "Escape") {
      closeWin();
    }
  };

  return (
    <main className={styles.stage}>
      <div
        className={styles.root + (preview ? " " + styles.isDemo : "")}
        style={vars}
        onPointerDown={(e: PtrEvt) => {
          if (e.target === e.currentTarget) {
            setPreview(false);
            select(-1, false);
            closeWin();
          }
        }}
      >
        <div className={styles.icons} role="listbox" aria-label={LIST_ARIA} tabIndex={0} onKeyDown={onKeyDown}>
          {META.map((m, i) => (
            <button
              key={i}
              type="button"
              ref={(el: HTMLButtonElement | null) => { btnBox.current[i] = el; }}
              className={styles.ico + " " + styles["i" + i]}
              role="option"
              aria-selected={sel === i}
              tabIndex={-1}
              onClick={(e: ClickEvt) => onClick(i, e)}
            >
              <span key={pop.idx === i ? pop.key : "idle"} className={styles.glyph + (pop.idx === i ? " " + styles.isPop : "")} aria-hidden="true">
                {ICONS[m.icon]}
              </span>
              <span className={styles.label}>{m.t}</span>
            </button>
          ))}
        </div>
        <section className={styles.win + (winIdx >= 0 ? " " + styles.isOpen : "")} aria-hidden={winIdx < 0}>
          <header className={styles.tbar}>
            <span className={styles.tico} aria-hidden="true">{ICONS.folder}</span>
            <span className={styles.ttl}>{winIdx >= 0 ? META[winIdx].t : META[0].t}</span>
            <button type="button" className={styles.x} aria-label={CLOSE_ARIA} onClick={closeWin}>
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" /><path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" /></g></svg>
            </button>
          </header>
          <p className={styles.body}>{winIdx >= 0 ? META[winIdx].b : META[0].b}</p>
        </section>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
