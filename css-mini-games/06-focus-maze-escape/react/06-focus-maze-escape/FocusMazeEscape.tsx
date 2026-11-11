// FocusMazeEscape — vanilla 판(run/301/demo/06-focus-maze-escape) 의 React 포트.
// 통로 칸은 button, 벽은 div — 벽이 포커스를 못 받는 것이 곧 "막힌다" 는 규칙이다.
// keydown 이 인접 통로 칸으로 focus({preventScroll:true}) 를 옮기고 캐릭터는 :focus 칸에 나타난다.
// duration·easing·accentColor 는 props → CSS 변수로 들어온다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FocusMazeEscape.module.scss";

export type FocusMazeEscapeProps = {
  duration?: string;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };

const BEST_KEY = "p301-06-best";
const STEP_FMT = "{n} 걸음";
const CELL_LABEL = "{c}열 {r}행 통로";
const START_LABEL = "출발 칸";
const GOAL_LABEL = "출구 칸";
const TITLE_TEXT = "포커스 미로 탈출";
const MAZE_LABEL = "7×5 미로. 방향키로 움직이세요";
const STEPS_LABEL = "걸음";
const AGAIN_LABEL = "다시 시작";
const DONE_TITLE = "탈출!";
const HINT_TEXT = "방향키로 칸을 옮겨 깃발까지 가세요 · 벽은 포커스를 받지 않아 저절로 막힙니다";

// 7×5 미로 — . 은 통로, # 은 벽, S 는 출발, G 는 출구.
// grid-template-areas 문자(module.scss)와 같은 배치다.
const MAZE: string[] = [
  "S.#...G",
  ".#..#.#",
  "...#..#",
  "#.##..#",
  "......#",
];
const COLS = 7, ROWS = 5;
// 미리보기가 걷는 경로 — 출발에서 출구까지의 최단 정답 한 벌 [열, 행] (10 걸음)
const DEMO_PATH: number[][] = [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [3, 1], [3, 0], [4, 0], [5, 0], [6, 0]];

function at(c: number, r: number): string { return (MAZE[r] || "")[c] || "#"; }
function isOpen(c: number, r: number): boolean {
  return c >= 0 && c < COLS && r >= 0 && r < ROWS && at(c, r) !== "#";
}
function cellKey(c: number, r: number): string { return "fme-cell-" + c + "-" + r; }

export default function FocusMazeEscape({ duration, easing, accentColor }: FocusMazeEscapeProps) {
  const [isDemo, setIsDemo] = useState(true);
  const [steps, setSteps] = useState(0);
  const [best, setBest] = useState(0);
  const [cleared, setCleared] = useState(false);
  const [demoIdx, setDemoIdx] = useState(0);

  const g = useRef({ steps: 0, cleared: false, best: 0, demoIdx: 0, autoFocus: false }) as
    Box<{ steps: number; cleared: boolean; best: number; demoIdx: number; autoFocus: boolean }>;

  useEffect(() => {
    try { g.current.best = Number(window.localStorage.getItem(BEST_KEY)) || 0; setBest(g.current.best); }
    catch (e) { g.current.best = 0; setBest(0); }
    // 시작 칸에 캐릭터를 올려 둔다 — 사람이 탭으로 들어와도 첫 칸이 이미 살아 있다
    window.requestAnimationFrame(() => { focusCell(0, 0); });
  }, []);

  const focusCell = (c: number, r: number): boolean => {
    const el = document.getElementById(cellKey(c, r));
    if (!el) { return false; }
    g.current.autoFocus = true;
    // iframe 안에서 무가드 focus 는 부모 페이지를 끌어당긴다 — 언제나 preventScroll
    el.focus({ preventScroll: true });
    g.current.autoFocus = false;
    return true;
  };
  const currentCell = (): number[] | null => {
    const a = document.activeElement as HTMLElement | null;
    if (a && a.hasAttribute("data-c")) {
      return [Number(a.getAttribute("data-c")), Number(a.getAttribute("data-r"))];
    }
    return null;
  };
  const saveBest = (n: number) => {
    if (g.current.best && n >= g.current.best) { return; }
    g.current.best = n;
    setBest(n);
    try { window.localStorage.setItem(BEST_KEY, String(n)); } catch (e) { /* 저장이 막힌 창에서는 넘어간다 */ }
  };
  const reach = (c: number, r: number) => {
    if (at(c, r) !== "G" || g.current.cleared) { return; }
    g.current.cleared = true;
    setCleared(true);
    saveBest(g.current.steps);
  };
  const move = (dc: number, dr: number) => {
    const cur = currentCell();
    if (!cur) { focusCell(0, 0); return; }
    const nc = cur[0] + dc, nr = cur[1] + dr;
    if (!isOpen(nc, nr) || !focusCell(nc, nr)) { return; }
    g.current.steps += 1;
    setSteps(g.current.steps);
    reach(nc, nr);
  };
  const reset = () => {
    setIsDemo(false);
    g.current.cleared = false;
    g.current.steps = 0;
    setCleared(false);
    setSteps(0);
    focusCell(0, 0);
  };

  useEffect(() => {
    const onKey = (e: KeyEvt) => {
      let dc = 0, dr = 0;
      if (e.key === "ArrowLeft") { dc = -1; }
      else if (e.key === "ArrowRight") { dc = 1; }
      else if (e.key === "ArrowUp") { dr = -1; }
      else if (e.key === "ArrowDown") { dr = 1; }
      else { return; }
      e.preventDefault();
      if (g.current.autoFocus) { return; }
      if (isDemoRef.current) { reset(); return; }
      move(dc, dr);
    };
    const handler = onKey as unknown as (e: Event) => void;
    window.addEventListener("keydown", handler);
    return () => { window.removeEventListener("keydown", handler); };
  }, []);

  const isDemoRef = useRef(true) as Box<boolean>;
  useEffect(() => { isDemoRef.current = isDemo; }, [isDemo]);

  // 미리보기 — 타이머가 정답 경로를 따라 포커스를 옮겨 캐릭터가 미로를 걷는다.
  // 사람이 키를 누르거나 칸을 누르면 reset() 이 미리보기를 뗀다.
  useEffect(() => {
    if (!isDemo) { return; }
    const id = window.setInterval(() => {
      const p = DEMO_PATH[g.current.demoIdx % DEMO_PATH.length];
      g.current.demoIdx += 1;
      focusCell(p[0], p[1]);
      setDemoIdx(g.current.demoIdx);
    }, 133);
    return () => { window.clearInterval(id); };
  }, [isDemo]);

  // 사람이 탭으로 미로에 들어오면 미리보기를 접는다 (스크립트가 옮긴 포커스는 그대로 둔다)
  const onFocusIn = () => {
    if (!g.current.autoFocus && isDemoRef.current) { reset(); }
  };

  const vars: Vars = {};
  if (duration) { vars["--duration"] = duration; }
  if (easing) { vars["--easing"] = easing; }
  if (accentColor) { vars["--color"] = accentColor; }

  const grid: { c: number; r: number; ch: string }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) { grid.push({ c, r, ch: at(c, r) }); }
  }
  const pathIdx = (c: number, r: number): number => {
    for (let i = 0; i < DEMO_PATH.length; i++) {
      if (DEMO_PATH[i][0] === c && DEMO_PATH[i][1] === r) { return i; }
    }
    return -1;
  };

  return (
    <div className={[styles.root, isDemo ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
      <header className={styles.bar}>
        <p className={styles.title}>
          <svg className={styles.ico} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M216.86 207.57a28 28 0 0 1-24.66-7.77L150.09 152H172a51.94 51.94 0 0 0 51.2-61l16.36 84.17a28 28 0 0 1-22.7 32.4" opacity=".2" />
            <path d="M176 112h-24a8 8 0 0 1 0-16h24a8 8 0 0 1 0 16m-72-16h-8v-8a8 8 0 0 0-16 0v8h-8a8 8 0 0 0 0 16h8v8a8 8 0 0 0 16 0v-8h8a8 8 0 0 0 0-16m137.48 104.65a36 36 0 0 1-54.94 4.81c-.12-.12-.24-.24-.35-.37L146.48 160h-37l-39.67 45.09l-.35.37A36.08 36.08 0 0 1 44 216a36 36 0 0 1-35.44-42.25a.7.7 0 0 1 0-.14l16.37-84.09A59.88 59.88 0 0 1 83.89 40H172a60.08 60.08 0 0 1 59 49.25v.18l16.37 84.17a.7.7 0 0 1 0 .14a35.74 35.74 0 0 1-5.89 26.91M172 144a44 44 0 0 0 0-88H83.89a43.9 43.9 0 0 0-43.21 36.37v.13L24.3 176.59A20 20 0 0 0 58 194.3l41.92-47.59a8 8 0 0 1 6-2.71Zm59.7 32.59l-8.74-45A60 60 0 0 1 172 160h-4.2l30.2 34.31a20.09 20.09 0 0 0 17.46 5.39a20 20 0 0 0 16.23-23.11Z" />
          </svg>
          <span>{TITLE_TEXT}</span>
        </p>
        <p className={styles.pill}><span className={styles.label}>{STEPS_LABEL}</span><b className={styles.num}>{steps}</b></p>
        <p className={styles.pill}>
          <svg className={styles.icoSm} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M200 48v63.1c0 39.7-31.75 72.6-71.45 72.9A72 72 0 0 1 56 112V48Z" opacity=".2" />
            <path d="M232 64h-24V48a8 8 0 0 0-8-8H56a8 8 0 0 0-8 8v16H24A16 16 0 0 0 8 80v16a40 40 0 0 0 40 40h3.65A80.13 80.13 0 0 0 120 191.61V216H96a8 8 0 0 0 0 16h64a8 8 0 0 0 0-16h-24v-24.42c31.94-3.23 58.44-25.64 68.08-55.58H208a40 40 0 0 0 40-40V80a16 16 0 0 0-16-16M48 120a24 24 0 0 1-24-24V80h24v32q0 4 .39 8Zm144-8.9c0 35.52-29 64.64-64 64.9a64 64 0 0 1-64-64V56h128ZM232 96a24 24 0 0 1-24 24h-.5a82 82 0 0 0 .5-8.9V80h24Z" />
          </svg>
          <b className={styles.num}>{best ? STEP_FMT.replace("{n}", String(best)) : "-"}</b>
        </p>
        <button className={styles.btn} type="button" aria-label={AGAIN_LABEL} onClick={reset}>
          <svg className={styles.icoSm} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" />
            <path d="M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0" />
          </svg>
        </button>
      </header>

      <div className={styles.mazeWrap}>
        <div className={styles.maze} role="group" aria-label={MAZE_LABEL} onFocus={onFocusIn}
             onPointerDown={() => { if (isDemoRef.current) { reset(); } }}>
          {grid.map(({ c, r, ch }) => {
            const area = { gridArea: "c" + c + "r" + r } as CSSProperties;
            if (ch === "#") {
              return <div className={styles.wall} key={c + "-" + r} aria-hidden="true" style={area} />;
            }
            const pi = pathIdx(c, r);
            const cls = [styles.cell,
              ch === "S" ? styles.start : "",
              ch === "G" ? styles.goal : "",
              isDemo && pi >= 0 ? styles.path : ""].filter(Boolean).join(" ");
            const label = ch === "S" ? START_LABEL : (ch === "G" ? GOAL_LABEL : CELL_LABEL.replace("{c}", String(c + 1)).replace("{r}", String(r + 1)));
            const style: CSSProperties = pi >= 0 ? Object.assign({}, area, { "--i": pi } as CSSProperties) : area;
            return (
              <button key={c + "-" + r} id={cellKey(c, r)} type="button" className={cls}
                      aria-label={label} data-c={c} data-r={r} style={style}>
                <svg className={styles.char} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                  <path d="M176 48a24 24 0 1 1-24-24a24 24 0 0 1 24 24" opacity=".2" />
                  <path d="M152 80a32 32 0 1 0-32-32a32 32 0 0 0 32 32m0-48a16 16 0 1 1-16 16a16 16 0 0 1 16-16m64 112a8 8 0 0 1-8 8c-35.31 0-52.95-17.81-67.12-32.12c-2.74-2.77-5.36-5.4-8-7.84l-13.43 30.88l37.2 26.57A8 8 0 0 1 160 176v56a8 8 0 0 1-16 0v-51.88l-31.07-22.2l-33.59 77.27A8 8 0 0 1 72 240a7.8 7.8 0 0 1-3.19-.67a8 8 0 0 1-4.15-10.52l54.08-124.37c-9.31-1.65-20.92 1.2-34.7 8.58a164 164 0 0 0-30.57 21.77a8 8 0 0 1-10.95-11.66c2.5-2.35 61.69-57.22 98.72-25.08c3.83 3.32 7.48 7 11 10.58C166.19 122.7 179.36 136 208 136a8 8 0 0 1 8 8" />
                </svg>
              </button>
            );
          })}
        </div>

        <div className={styles.done} hidden={!cleared}>
          <div className={styles.donePanel}>
            <p className={styles.doneTitle}>
              <svg className={styles.icoSm} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                <path d="M224 56v60c-19.89 17.23-38.23 18.39-56 13.48v-60c17.76 4.91 36.11 3.75 56-13.48m-120 46.52v-60C86.24 37.61 67.89 38.77 48 56v60c19.89-17.22 38.23-18.39 56-13.48v60c21.62 6 42.38 21 64 27v-60c-21.62-6-42.38-21-64-27" opacity=".2" />
                <path d="M227.32 48.75a8 8 0 0 0-8.56 1.25c-28 24.22-51.72 12.48-79.21-1.13C111.07 34.76 78.78 18.79 42.76 50A8 8 0 0 0 40 56v168a8 8 0 0 0 16 0v-44.23c26.79-21.16 49.87-9.75 76.45 3.41c28.49 14.09 60.77 30.06 96.79-1.13a8 8 0 0 0 2.76-6V56a8 8 0 0 0-4.68-7.25M216 71.6v40.65c-14 11.06-27 13.22-40 10.88V79.34a60.05 60.05 0 0 0 40-7.74m-56 3.76v43c-6.66-2.67-13.43-6-20.45-9.48c-8.82-4.37-18-8.91-27.55-12.18v-43c6.66 2.66 13.43 6 20.45 9.48c8.82 4.37 18.01 8.91 27.55 12.18M96 48.91v43.78a60.06 60.06 0 0 0-40 7.75V59.78c14-11.06 27-13.21 40-10.87M86.58 152A60.06 60.06 0 0 0 56 160.43v-40.65c14-11.06 27-13.22 40-10.88v43.8a65.6 65.6 0 0 0-9.42-.7m25.42 4.67v-43c6.66 2.66 13.43 6 20.45 9.48c8.82 4.37 18 8.9 27.55 12.17v43c-6.66-2.67-13.43-6-20.45-9.48c-8.82-4.37-18.01-8.9-27.55-12.17m64 26.45v-43.8a65.6 65.6 0 0 0 9.42.72a60.1 60.1 0 0 0 30.58-8.47v40.68c-14 11.06-27 13.21-40 10.87" />
              </svg>
              <span>{DONE_TITLE}</span>
            </p>
            <p className={styles.doneLine}>{STEP_FMT.replace("{n}", String(steps))}</p>
            <button className={styles.again} type="button" onClick={reset}>
              <svg className={styles.icoSm} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                <path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" />
                <path d="M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0" />
              </svg>
              <span>{AGAIN_LABEL}</span>
            </button>
          </div>
        </div>
      </div>

      <p className={styles.hint}>{HINT_TEXT}</p>
    </div>
  );
}
