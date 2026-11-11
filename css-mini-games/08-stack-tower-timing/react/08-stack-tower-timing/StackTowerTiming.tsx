// StackTowerTiming — vanilla 판(run/301/demo/08-stack-tower-timing/index.html) 의 React 포트.
// 좌우 왕복은 requestAnimationFrame, 블록 폭은 transform: scaleX, 잘린 조각의 낙하는 transition.
// 왕복 범위는 꼭대기 칸 기준 양쪽 대칭(칸과 MARGIN px 만큼 완전히 어긋난 양끝) — 값·규칙은 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import styles from "./StackTowerTiming.module.scss";

export type StackTowerTimingProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Row = { id: number; lx: number; w: number };
type Chip = { id: number; lx: number; w: number; by: number };
type Vars = { [k: string]: string | undefined };
// ambient.d.ts 의 useRef 는 { current: T | null } 을 돌려주므로 값 보관용 참조는 null 없는 상자로 단언한다
type Box<T> = { current: T };

const BEST_KEY = "p301-08-best";
const OVER_HEIGHT_TEXT = "{n}단 쌓았습니다";
const PERFECT_TEXT = "완벽!";
const FIELD_ARIA = "탑 쌓기 놀이판. 스페이스나 클릭으로 움직이는 블록을 멈춰 쌓습니다";
const HINT = "스페이스나 클릭으로 멈춰 쌓으세요";
const LABEL_HEIGHT = "높이";
const LABEL_COMBO = "콤보";
const LABEL_BEST = "최고기록";
const OVER_TITLE = "게임 끝";
const RESTART = "다시 시작";

const BASE_W = 128; // 기준 블록 폭
const HALF = BASE_W / 2; // lx(왼쪽 오프셋)와 시각 좌표(탑 중심 0)를 잇는 보정값
const STRIDE = 22;  // 칸 한 단의 세로 간격 (높이 18 + 틈 4)
const MARGIN = 20;  // 꼭대기 칸 양옆으로 완전히 벗어나는 여유 — 이 구간에서 놓으면 미스
const PERFECT_PX = 4;

function loadBest(): number {
  try { return Number(window.localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; }
}
function saveBest(n: number) {
  try { window.localStorage.setItem(BEST_KEY, String(n)); } catch (e) { /* 시크릿 창에서는 저장만 건너뛴다 */ }
}

export default function StackTowerTiming({
  duration = 2000,
  easing = "ease-out",
  accentColor = "#2f6df6",
}: StackTowerTimingProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const towerRef = useRef<HTMLDivElement | null>(null);
  const moverRef = useRef<HTMLDivElement | null>(null);
  const restartRef = useRef<HTMLButtonElement | null>(null);
  const rowsRef = useRef([{ id: 0, lx: 0, w: BASE_W }]) as Box<Row[]>;
  const moverRef2 = useRef({ lx: -36, w: BASE_W, dir: 1, speed: 170 }) as Box<{ lx: number; w: number; dir: number; speed: number }>;
  const rowId = useRef(0) as Box<number>;
  const g = useRef({ combo: 0, height: 0, best: 0, running: false, over: false }) as Box<{
    combo: number; height: number; best: number; running: boolean; over: boolean;
  }>;

  const [rows, setRows] = useState<Row[]>([{ id: 0, lx: 0, w: BASE_W }]);
  const [height, setHeight] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [demo, setDemo] = useState(true);
  const [chip, setChip] = useState<Chip | null>(null);
  const [chipFall, setChipFall] = useState(false);
  const [flashId, setFlashId] = useState(0);

  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--accent": accentColor };

  function topRow(): Row {
    return rowsRef.current[rowsRef.current.length - 1];
  }
  function minLx(): number { return topRow().lx - moverRef2.current.w - MARGIN; }
  function maxLx(): number { return topRow().lx + topRow().w + MARGIN; }
  function paintMover() {
    const el = moverRef.current;
    if (!el) { return; }
    el.style.setProperty("--lx", moverRef2.current.lx + "px");
    el.style.setProperty("--sx", String(moverRef2.current.w / BASE_W));
    el.style.setProperty("--by", rowsRef.current.length * STRIDE + "px");
  }
  function dropChip(lx: number, w: number, by: number) {
    setChipFall(false);
    setChip({ id: chip ? chip.id + 1 : 1, lx, w, by });
  }
  function camera() {
    const field = fieldRef.current, tower = towerRef.current;
    if (!field || !tower) { return; }
    const need = (rowsRef.current.length - 1) * STRIDE + 18 + 64;
    const shift = Math.max(0, need - field.clientHeight);
    tower.style.transform = "translateY(" + Math.round(shift) + "px)";
  }
  function nextMover() {
    const t = topRow();
    const m = moverRef2.current;
    m.w = t.w;
    m.speed = Math.min(330, 170 + rowsRef.current.length * 9);
    m.dir = rowsRef.current.length % 2 === 0 ? 1 : -1;
    m.lx = m.dir === 1 ? minLx() : maxLx();
    paintMover();
  }
  function endGame() {
    g.current.running = false;
    g.current.over = true;
    setRunning(false);
    setOver(true);
    saveBest(g.current.best);
  }
  function place() {
    const t = topRow();
    const tl = t.lx - HALF, tr = tl + t.w;
    const m = moverRef2.current;
    const ml = m.lx - HALF, mr = ml + m.w;
    const ovL = Math.max(ml, tl), ovR = Math.min(mr, tr);
    const ovW = ovR - ovL;
    if (ovW <= 0) { dropChip(ml + HALF, mr - ml, rowsRef.current.length * STRIDE); endGame(); return; }
    let row: Row;
    if (Math.abs(ml - tl) <= PERFECT_PX && Math.abs(mr - tr) <= PERFECT_PX) {
      g.current.combo += 1;
      setCombo(g.current.combo);
      // 완벽 일치 보너스: 폭을 기준 폭까지 되살리되 칸은 기준 블록 범위 안에 머문다.
      const c = t.lx - HALF + t.w / 2;
      const lo = Math.max(c - HALF, -HALF);
      const hi = Math.min(c + HALF, HALF);
      row = { id: ++rowId.current, lx: Math.round(lo + HALF), w: Math.round(hi - lo) };
      setFlashId(f => f + 1);
    } else {
      g.current.combo = 0;
      setCombo(0);
      row = { id: ++rowId.current, lx: ovL + HALF, w: ovW };
      if (ml < ovL) { dropChip(ml + HALF, ovL - ml, rowsRef.current.length * STRIDE); }
      else if (mr > ovR) { dropChip(ovR + HALF, mr - ovR, rowsRef.current.length * STRIDE); }
    }
    rowsRef.current = [...rowsRef.current, row];
    setRows(rowsRef.current);
    g.current.height = rowsRef.current.length - 1;
    setHeight(g.current.height);
    if (g.current.height > g.current.best) {
      g.current.best = g.current.height;
      setBest(g.current.best);
      saveBest(g.current.best);
    }
    camera();
    nextMover();
  }
  function startRun() {
    if (g.current.running) { return; }
    g.current.running = true;
    g.current.over = false;
    setDemo(false);
    setOver(false);
    setRunning(true);
    nextMover();
    const field = fieldRef.current;
    if (field) { field.focus({ preventScroll: true }); }
  }
  function act() {
    if (!g.current.running) { startRun(); return; }
    if (reduce) {
      // 왕복 대신 놓을 자리를 입력마다 무작위로 정한다(reduced-motion) — 겹침 절반 이상 보장 범위
      const t = topRow();
      moverRef2.current.lx = t.lx + (Math.random() - 0.5) * t.w;
      paintMover();
    }
    place();
  }
  function restart() {
    rowsRef.current = [{ id: 0, lx: 0, w: BASE_W }];
    setRows(rowsRef.current);
    g.current.combo = 0;
    g.current.height = 0;
    setCombo(0);
    setHeight(0);
    setChip(null);
    setChipFall(false);
    const tower = towerRef.current;
    if (tower) { tower.style.transform = "translateY(0px)"; }
    startRun();
  }

  // 최초 배치 + 키보드
  useEffect(() => {
    g.current.best = loadBest();
    setBest(g.current.best);
    paintMover();
    camera();
    const down = (e: KeyboardEvent) => {
      if (e.key !== " " && e.code !== "Space") { return; }
      if (document.activeElement === restartRef.current) { return; } // 버튼 포커스 중에는 기본 클릭에 맡긴다
      if (g.current.over) { return; }
      e.preventDefault();
      act();
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 왕복 루프 (reduced-motion 에서는 돌지 않는다)
  useEffect(() => {
    if (!running || reduce) { return; }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const m = moverRef2.current;
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      m.lx += m.dir * m.speed * dt;
      if (m.lx >= maxLx()) { m.lx = maxLx(); m.dir = -1; }
      if (m.lx <= minLx()) { m.lx = minLx(); m.dir = 1; }
      paintMover();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, reduce]);

  // 잘린 조각: 시작 상태가 화면에 확정된 뒤 끝 상태를 얹어 transition 으로 낙하시킨다
  useEffect(() => {
    if (!chip) { return; }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setChipFall(true));
    });
    const t = window.setTimeout(() => { setChip(null); setChipFall(false); }, 720);
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chip ? chip.id : 0]);

  // 게임 끝 오버레이가 열리면 다시 시작 버튼으로 포커스를 옮긴다
  useEffect(() => {
    if (over && restartRef.current) { restartRef.current.focus({ preventScroll: true }); }
  }, [over]);

  const rootCls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const chipCls = [styles.chip, chip ? styles.chipDrop : "", chipFall ? styles.chipFall : ""]
    .filter(Boolean).join(" ");
  const chipVars: Vars = chip
    ? { "--lx": `${chip.lx}px`, "--sx": String(chip.w / BASE_W), "--by": `${chip.by}px` }
    : {};
  const rowVars = (r: Row, i: number): Vars => ({
    "--lx": `${r.lx}px`, "--sx": String(r.w / BASE_W),
    "--by": `${i * STRIDE}px`,
  });

  function onFieldPointerDown() {
    if (g.current.over) { return; }
    act();
  }

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-cube" viewBox="0 0 256 256" fill="currentColor"><g><path d="M128 129.09V232a8 8 0 0 1-3.84-1l-88-48.16a8 8 0 0 1-4.16-7V80.2a8 8 0 0 1 .7-3.27Z" opacity=".2"/><path d="m223.68 66.15l-88-48.15a15.88 15.88 0 0 0-15.36 0l-88 48.17a16 16 0 0 0-8.32 14v95.64a16 16 0 0 0 8.32 14l88 48.17a15.88 15.88 0 0 0 15.36 0l88-48.17a16 16 0 0 0 8.32-14V80.18a16 16 0 0 0-8.32-14.03M128 32l80.34 44L128 120L47.66 76ZM40 90l80 43.78v85.79l-80-43.75Zm96 129.57v-85.75L216 90v85.78Z"/></g></symbol>
          <symbol id="ico-trophy" viewBox="0 0 256 256" fill="currentColor"><g><path d="M200 48v63.1c0 39.7-31.75 72.6-71.45 72.9A72 72 0 0 1 56 112V48Z" opacity=".2"/><path d="M232 64h-24V48a8 8 0 0 0-8-8H56a8 8 0 0 0-8 8v16H24A16 16 0 0 0 8 80v16a40 40 0 0 0 40 40h3.65A80.13 80.13 0 0 0 120 191.61V216H96a8 8 0 0 0 0 16h64a8 8 0 0 0 0-16h-24v-24.42c31.94-3.23 58.44-25.64 68.08-55.58H208a40 40 0 0 0 40-40V80a16 16 0 0 0-16-16M48 120a24 24 0 0 1-24-24V80h24v32q0 4 .39 8Zm144-8.9c0 35.52-29 64.64-64 64.9a64 64 0 0 1-64-64V56h128ZM232 96a24 24 0 0 1-24 24h-.5a82 82 0 0 0 .5-8.9V80h24Z"/></g></symbol>
          <symbol id="ico-restart" viewBox="0 0 256 256" fill="currentColor"><g><path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2"/><path d="M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0"/></g></symbol>
        </defs>
      </svg>
      <div className={rootCls} style={vars}>
        <header className={styles.hud}>
          <p className={styles.stat}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-cube" /></svg>
            <span className={styles.label}>{LABEL_HEIGHT}</span>
            <b className={styles.num} aria-live="polite">{height}</b>
          </p>
          <p className={styles.stat}>
            <span className={styles.label}>{LABEL_COMBO}</span>
            <b className={styles.num}>{combo}</b>
          </p>
          <p className={styles.stat}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-trophy" /></svg>
            <span className={styles.label}>{LABEL_BEST}</span>
            <b className={styles.num}>{best}</b>
          </p>
        </header>
        <div
          className={styles.field}
          ref={fieldRef}
          tabIndex={0}
          role="application"
          aria-label={FIELD_ARIA}
          onPointerDown={onFieldPointerDown}
        >
          <div className={styles.tower} ref={towerRef}>
            {rows.map((r, i) => (
              <div
                key={r.id}
                className={[styles.row, r.id === 0 ? styles.rowBase : styles.rowNew].filter(Boolean).join(" ")}
                style={rowVars(r, i)}
              />
            ))}
            <div
              className={[styles.mover, over ? styles.moverHidden : ""].filter(Boolean).join(" ")}
              ref={moverRef}
            />
            <i className={chipCls} style={chipVars} aria-hidden="true" />
            <p key={flashId} className={[styles.flash, flashId ? styles.flashShow : ""].filter(Boolean).join(" ")}>
              {PERFECT_TEXT}
            </p>
          </div>
          {!running && !over && <p className={styles.hint}>{HINT}</p>}
          {over && (
            <div className={styles.over}>
              <div className={styles.overPanel}>
                <p className={styles.overTitle}>{OVER_TITLE}</p>
                <p className={styles.overScore}>{OVER_HEIGHT_TEXT.replace("{n}", String(height))}</p>
                <button className={styles.restart} ref={restartRef} type="button" onClick={restart}>
                  <svg className={styles.ico} aria-hidden="true"><use href="#ico-restart" /></svg>
                  <span>{RESTART}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
