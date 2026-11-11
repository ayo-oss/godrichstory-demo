// StartMenu — vanilla 판(run/023/demo/06-os-start-menu-accordion/index.html) 의 React 포트.
// 세로 띠가 붙은 메뉴가 작업줄 위에서 아래로 열린다. 화살표 줄에 올리면 하위 메뉴가 오른쪽으로,
// 펼친 뒤 실측해 오른쪽이 화면을 나갈 방향이면 왼쪽으로 접어 넣는다(useEffect 에서 재 측정).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./StartMenu.module.scss";

export type StartMenuProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 타입에 React 이벤트 제네릭이 없다 — 쓰는 것만 로컬 타입으로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type ClickEvt = { stopPropagation(): void };
type SubBox = { current: Array<HTMLDivElement | null> };
type RootBox = { current: HTMLDivElement | null };

const MENU_ARIA = "시작 메뉴";
const START = "시작";
const HINT = "화살표가 있는 줄에 올리면 하위 메뉴가 오른쪽으로 이어 열리고, 그 방향이 화면을 나가면 왼쪽으로 접어 넣습니다";
const CONSOLE = "관리 콘솔";

// 줄: 화살표가 있으면 sub 인덱스, 없으면 null
const ROWS: Array<{ icon: string; t: string; sub: number | null }> = [
  { icon: "folder", t: "프로그램", sub: 0 },
  { icon: "image", t: "문서", sub: null },
  { icon: "gear", t: "설정", sub: 1 },
  { icon: "power", t: "전원", sub: null }
];
const SUBS: Array<Array<string>> = [
  ["메모장", "그림판", "계산기"],
  ["디스플레이", "사용자", "네트워크"]
];

const SVG: { [k: string]: ReactNode } = {
  folder: <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M128 80H32V56a8 8 0 0 1 8-8h52.69a8 8 0 0 1 5.65 2.34Z" opacity=".2" /><path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16M92.69 56l16 16H40V56ZM216 200H40V88h176Z" /></g></svg>,
  image: <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M224 56v122.06l-39.72-39.72a8 8 0 0 0-11.31 0L147.31 164l-49.65-49.66a8 8 0 0 0-11.32 0L32 168.69V56a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8" opacity=".2" /><path d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m0 16v102.75l-26.07-26.06a16 16 0 0 0-22.63 0l-20 20l-44-44a16 16 0 0 0-22.62 0L40 149.37V56ZM40 172l52-52l80 80H40Zm176 28h-21.37l-36-36l20-20L216 181.38zm-72-100a12 12 0 1 1 12 12a12 12 0 0 1-12-12" /></g></svg>,
  gear: <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="m230.1 108.76l-31.85-18.14c-.64-1.16-1.31-2.29-2-3.41l-.12-36A104.6 104.6 0 0 0 162 32l-32 17.89h-4L94 32a104.6 104.6 0 0 0-34.11 19.25l-.16 36c-.7 1.12-1.37 2.26-2 3.41l-31.84 18.1a99.2 99.2 0 0 0 0 38.46l31.85 18.14c.64 1.16 1.31 2.29 2 3.41l.12 36A104.6 104.6 0 0 0 94 224l32-17.87h4L162 224a104.6 104.6 0 0 0 34.08-19.25l.16-36c.7-1.12 1.37-2.26 2-3.41l31.84-18.1a99.2 99.2 0 0 0 .02-38.48M128 168a40 40 0 1 1 40-40a40 40 0 0 1-40 40" opacity=".2" /><path d="M128 80a48 48 0 1 0 48 48a48.05 48.05 0 0 0-48-48m0 80a32 32 0 1 1 32-32a32 32 0 0 1-32 32m109.94-52.79a8 8 0 0 0-3.89-5.4l-29.83-17l-.12-33.62a8 8 0 0 0-2.83-6.08a111.9 111.9 0 0 0-36.72-20.67a8 8 0 0 0-6.46.59L128 41.85L97.88 25a8 8 0 0 0-6.47-.6a111.9 111.9 0 0 0-36.68 20.75a8 8 0 0 0-2.83 6.07l-.15 33.65l-29.83 17a8 8 0 0 0-3.89 5.4a106.5 106.5 0 0 0 0 41.56a8 8 0 0 0 3.89 5.4l29.83 17l.12 33.63a8 8 0 0 0 2.83 6.08a111.9 111.9 0 0 0 36.72 20.67a8 8 0 0 0 6.46-.59L128 214.15L158.12 231a7.9 7.9 0 0 0 3.9 1a8.1 8.1 0 0 0 2.57-.42a112.1 112.1 0 0 0 36.68-20.73a8 8 0 0 0 2.83-6.07l.15-33.65l29.83-17a8 8 0 0 0 3.89-5.4a106.5 106.5 0 0 0-.03-41.52m-15 34.91l-28.57 16.25a8 8 0 0 0-3 3c-.58 1-1.19 2.06-1.81 3.06a7.94 7.94 0 0 0-1.22 4.21l-.15 32.25a95.9 95.9 0 0 1-25.37 14.3L134 199.13a8 8 0 0 0-3.91-1h-3.83a8.1 8.1 0 0 0-4.1 1l-28.84 16.1A96 96 0 0 1 67.88 201l-.11-32.2a8 8 0 0 0-1.22-4.22c-.62-1-1.23-2-1.8-3.06a8.1 8.1 0 0 0-3-3.06l-28.6-16.29a90.5 90.5 0 0 1 0-28.26l28.52-16.28a8 8 0 0 0 3-3c.58-1 1.19-2.06 1.81-3.06a7.94 7.94 0 0 0 1.22-4.21l.15-32.25a95.9 95.9 0 0 1 25.37-14.3L122 56.87a8 8 0 0 0 4.1 1h3.64a8 8 0 0 0 4.1-1l28.84-16.1A96 96 0 0 1 188.12 55l.11 32.2a8 8 0 0 0 1.22 4.22c.62 1 1.23 2 1.8 3.06a8.1 8.1 0 0 0 3 3.06l28.6 16.29a90.5 90.5 0 0 1 .05 28.29Z" /></g></svg>,
  power: <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" /><path d="M120 128V48a8 8 0 0 1 16 0v80a8 8 0 0 1-16 0m60.37-78.7a8 8 0 0 0-8.74 13.4C194.74 77.77 208 101.57 208 128a80 80 0 0 1-160 0c0-26.43 13.26-50.23 36.37-65.3a8 8 0 0 0-8.74-13.4C47.9 67.38 32 96.06 32 128a96 96 0 0 0 192 0c0-31.94-15.9-60.62-43.63-78.7" /></g></svg>,
  cpu: <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M200 48H56a8 8 0 0 0-8 8v144a8 8 0 0 0 8 8h144a8 8 0 0 0 8-8V56a8 8 0 0 0-8-8m-48 104h-48v-48h48Z" opacity=".2" /><path d="M152 96h-48a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8h48a8 8 0 0 0 8-8v-48a8 8 0 0 0-8-8m-8 48h-32v-32h32Zm88 0h-16v-32h16a8 8 0 0 0 0-16h-16V56a16 16 0 0 0-16-16h-40V24a8 8 0 0 0-16 0v16h-32V24a8 8 0 0 0-16 0v16H56a16 16 0 0 0-16 16v40H24a8 8 0 0 0 0 16h16v32H24a8 8 0 0 0 0 16h16v40a16 16 0 0 0 16 16h40v16a8 8 0 0 0 16 0v-16h32v16a8 8 0 0 0 16 0v-16h40a16 16 0 0 0 16-16v-40h16a8 8 0 0 0 0-16m-32 56H56V56h144z" /></g></svg>,
  user: <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M192 96a64 64 0 1 1-64-64a64 64 0 0 1 64 64" opacity=".2" /><path d="M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8M72 96a56 56 0 1 1 56 56a56.06 56.06 0 0 1-56-56" /></g></svg>,
  win: <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M128 144h80v72l-80-14.55Zm-96 40l64 11.64V144H32Zm96-129.45V112h80V40ZM32 112h64V60.36L32 72Z" opacity=".2" /><path d="M208 136h-80a8 8 0 0 0-8 8v57.45a8 8 0 0 0 6.57 7.88l80 14.54a7.6 7.6 0 0 0 1.43.13a8 8 0 0 0 8-8v-72a8 8 0 0 0-8-8m-8 70.41l-64-11.63V152h64ZM96 136H32a8 8 0 0 0-8 8v40a8 8 0 0 0 6.57 7.87l64 11.64a8.5 8.5 0 0 0 1.43.13a8 8 0 0 0 8-8V144a8 8 0 0 0-8-8m-8 50.05l-48-8.73V152h48ZM213.13 33.86a8 8 0 0 0-6.56-1.73l-80 14.55a8 8 0 0 0-6.57 7.87V112a8 8 0 0 0 8 8h80a8 8 0 0 0 8-8V40a8 8 0 0 0-2.87-6.14M200 104h-64V61.22l64-11.63Zm-98.87-49.78a8 8 0 0 0-6.56-1.73l-64 11.64A8 8 0 0 0 24 72v40a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8V60.36a8 8 0 0 0-2.87-6.14M88 104H40V78.68L88 70Z" /></g></svg>,
  caret: <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="m176 128l-80 80V48Z" opacity=".2" /><path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z" /></g></svg>
};

export default function StartMenu(props: StartMenuProps) {
  const duration = props.duration ?? 300;
  const easing = props.easing ?? "ease-out";
  const color = props.color ?? "#0a4fe8";
  const [preview, setPreview] = useState(true);
  const [open, setOpen] = useState(false);
  const [subOn, setSubOn] = useState<number | null>(null);
  const [flip, setFlip] = useState(false);
  const subBox = useRef<Array<HTMLDivElement | null>>([]) as SubBox;
  const rootBox = useRef<HTMLDivElement>(null) as RootBox;

  // 하위 메뉴를 펼친 뒤 실측해 오른쪽이 화면 밖으로 나가면 왼쪽으로 접어 넣는다
  useEffect(() => {
    if (subOn === null) return;
    const el = subBox.current[subOn];
    if (!el) return;
    if (el.getBoundingClientRect().right > window.innerWidth - 8) setFlip(true);
    else setFlip(false);
  }, [subOn]);
  // 왼쪽마저 잘리면 원래 방향을 지킨다
  useEffect(() => {
    if (!flip || subOn === null) return;
    const el = subBox.current[subOn];
    if (el && el.getBoundingClientRect().left < 8) setFlip(false);
  }, [flip]);
  // 바깥 클릭과 Esc 로 닫는다
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootBox.current && e.target instanceof Node && !rootBox.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const activate = (rowIdx: number) => {
    if (!open) return;
    const sub = ROWS[rowIdx].sub;
    if (sub === null) setSubOn(null);
    else setSubOn(sub);
  };
  const toggleMenu = () => {
    setPreview(false);
    const next = !open;
    setOpen(next);
    if (!next) setSubOn(null);
  };
  const onRowKey = (e: KeyEvt) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    let k = 0;
    rowBtns.forEach((b, i) => { if (b === document.activeElement) k = i; });
    const n = (k + (e.key === "ArrowDown" ? 1 : -1) + rowBtns.length) % rowBtns.length;
    if (rowBtns[n]) rowBtns[n].focus({ preventScroll: true });
  };
  // 줄 단추들을 담아 두는 배열 — roving 초점용
  const rowBtns: Array<HTMLButtonElement | null> = [];

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div ref={rootBox} className={styles.root + (preview ? " " + styles.isDemo : "")} style={vars}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.desk} aria-hidden="true">
          <div className={styles.dwin}>
            <div className={styles.dttl}>{CONSOLE}</div>
            <div className={styles.drow}></div>
            <div className={styles.drow + " " + styles.drowS}></div>
            <div className={styles.drow + " " + styles.drowM}></div>
          </div>
        </div>
        <nav className={styles.menu + (open ? " " + styles.isOpen : "")} aria-label={MENU_ARIA}>
          <div className={styles.band} aria-hidden="true">GODRICH 98</div>
          <div className={styles.rows} onKeyDown={onRowKey}>
            {ROWS.map((row, i) => [
              i === ROWS.length - 1 ? (
                <div key={"sep" + i} className={styles.sep} aria-hidden="true"></div>
              ) : null,
              <button
                key={i}
                type="button"
                ref={(el: HTMLButtonElement | null) => { rowBtns[i] = el; }}
                className={styles.row + (row.icon === "power" ? " " + styles.power : "")}
                onClick={(e: ClickEvt) => {
                  setPreview(false);
                  if (!open) setOpen(true);
                  const sub = ROWS[i].sub;
                  if (sub === null) setSubOn(null); else setSubOn(sub);
                  e.stopPropagation();
                }}
                onPointerEnter={() => activate(i)}
                onFocus={() => activate(i)}
              >
                <span className={styles.rico} aria-hidden="true">{SVG[row.icon]}</span>
                <span className={styles.rtxt}>{row.t}</span>
                {row.sub !== null ? <span className={styles.rarr} aria-hidden="true">{SVG.caret}</span> : null}
              </button>
            ])}
          </div>
          {SUBS.map((items, i) => (
            <div
              key={i}
              ref={(el: HTMLDivElement | null) => { subBox.current[i] = el; }}
              className={styles.sub + " " + styles["sub" + (i + 1)] + (subOn === i ? " " + styles.on : "") + (subOn === i && flip ? " " + styles.flipped : "")}
            >
              {items.map((t, j) => (
                <button key={j} type="button" className={styles.sitem}>{t}</button>
              ))}
            </div>
          ))}
        </nav>
        <div className={styles.bar}>
          <span className={styles.app} aria-hidden="true">{SVG.cpu}</span>
          <span className={styles.app} aria-hidden="true">{SVG.user}</span>
          <button
            type="button"
            className={styles.start}
            aria-expanded={open}
            aria-haspopup="true"
            onClick={toggleMenu}
          >
            <span className={styles.sico} aria-hidden="true">{SVG.win}</span>
            <span className={styles.stxt}>{START}</span>
          </button>
          <span className={styles.grow} aria-hidden="true"></span>
          <span className={styles.clock} aria-hidden="true">12:04</span>
        </div>
      </div>
    </main>
  );
}
