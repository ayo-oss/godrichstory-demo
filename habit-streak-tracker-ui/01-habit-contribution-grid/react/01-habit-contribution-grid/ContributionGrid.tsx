// ContributionGrid — vanilla 판(run/297/demo/01-habit-contribution-grid/index.html) 의 React 포트.
// 53주 × 7일 칸을 시드 고정 난수로 채우고 오늘 칸만 localStorage 값으로 덮는다. 값·수치는 vanilla 와 같다.
// 사람이 격자에 손을 대거나 버튼을 누르면 미리보기 루프를 떼고 정적 표시로 넘어간다.
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./ContributionGrid.module.scss";

export type ContributionGridProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type CellVars = CSSProperties & { "--c"?: string };

const WEEKS = 53;
const DAYS = 7;
const TOTAL = WEEKS * DAYS;
const STORE = "godrich-habit-grid";
const HINT = "칸에 손을 올리면 날짜와 횟수가 보입니다";
const GRID_LABEL = "최근 1년 습관 기록 격자";
const LEGEND_LABEL = "하루 완료 수";
const ADD_TEXT = "오늘 칸 올리기";
const CELL_LABEL = "{m}월 {d}일 · {n}회";
const TODAY_TEXT = "오늘 {n}회";

// 가짜 기록은 시드 고정 난수 — 새로 고쳐도 같은 잔디가 나온다 (mulberry32)
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function baseLevels(): number[] {
  const rnd = seeded(20260912);
  const out: number[] = [];
  for (let i = 0; i < TOTAL; i++) {
    const v = rnd();
    out.push(v > 0.82 ? 4 : v > 0.68 ? 3 : v > 0.48 ? 2 : v > 0.3 ? 1 : 0);
  }
  return out;
}
function dateOf(index: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - (TOTAL - 1 - index));
  return d;
}
function label(index: number, level: number): string {
  const d = dateOf(index);
  return CELL_LABEL.replace("{m}", String(d.getMonth() + 1))
    .replace("{d}", String(d.getDate()))
    .replace("{n}", String(level));
}

export default function ContributionGrid({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffd23f",
}: ContributionGridProps) {
  const base = useMemo(baseLevels, []);
  const [today, setToday] = useState(0);
  const [tip, setTip] = useState("");
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE);
      if (raw) { setToday(Number(raw) || 0); }
    } catch (e) { /* 시크릿 창에서는 기본값 그대로 간다 */ }
  }, []);

  function levelAt(index: number): number {
    return index === TOTAL - 1 ? today : base[index];
  }
  function save(n: number) {
    try { window.localStorage.setItem(STORE, String(n)); } catch (e) { /* 저장만 건너뛴다 */ }
  }
  function raise() {
    setDemo(false);
    const next = today >= 4 ? 0 : today + 1;
    setToday(next);
    save(next);
    setTip(TODAY_TEXT.replace("{n}", String(next)));
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    setDemo(false);
    const el = event.target as HTMLElement;
    const raw = el.getAttribute("data-index");
    if (raw === null) { return; }
    const index = Number(raw);
    setTip(label(index, levelAt(index)));
  }

  const levelClass = [styles.cell, styles.l1, styles.l2, styles.l3, styles.l4];
  const keyClass = [styles.key0, styles.key1, styles.key2, styles.key3, styles.key4];
  const rows: number[] = [0, 1, 2, 3, 4, 5, 6];
  const weeks: number[] = [];
  for (let c = 0; c < WEEKS; c++) { weeks.push(c); }
  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const cellVars = (c: number): CellVars => ({ "--c": String(c) });

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-calendar-check" viewBox="0 0 256 256" fill="currentColor"><g><path d="M216 48v40H40V48a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2"/><path d="M208 32h-24v-8a8 8 0 0 0-16 0v8H88v-8a8 8 0 0 0-16 0v8H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16M72 48v8a8 8 0 0 0 16 0v-8h80v8a8 8 0 0 0 16 0v-8h24v32H48V48Zm136 160H48V96h160zm-38.34-85.66a8 8 0 0 1 0 11.32l-48 48a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L116 164.69l42.34-42.35a8 8 0 0 1 11.32 0"/></g></symbol>
          <symbol id="ico-plus-circle" viewBox="0 0 256 256" fill="currentColor"><g><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M176 128a8 8 0 0 1-8 8h-32v32a8 8 0 0 1-16 0v-32H88a8 8 0 0 1 0-16h32V88a8 8 0 0 1 16 0v32h32a8 8 0 0 1 8 8m56 0A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-calendar-check" /></svg>
          <span>{HINT}</span>
        </p>
        <div className={styles.wrap}>
          <span className={styles.tip} role="status" aria-live="polite">{tip}</span>
          <div className={styles.grid} role="grid" aria-label={GRID_LABEL} onPointerMove={onPointerMove}>
            {rows.map((r) => (
              <div className={styles.row} role="row" key={r}>
                {weeks.map((c) => {
                  const index = c * DAYS + r;
                  const level = levelAt(index);
                  const isToday = index === TOTAL - 1;
                  const cn = [levelClass[0], level > 0 ? levelClass[level] : "", isToday ? styles.today : ""]
                    .filter(Boolean).join(" ");
                  return (
                    <span
                      className={cn}
                      key={c}
                      role="gridcell"
                      data-index={index}
                      aria-label={label(index, level)}
                      style={cellVars(c)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.bar}>
          <p className={styles.legend}>
            <span className={styles.legendLabel}>{LEGEND_LABEL}</span>
            {[0, 1, 2, 3, 4].map((n) => (
              <span className={styles.keyItem} key={n}>
                <i className={`${styles.key} ${keyClass[n]}`} />
                <b className={styles.keyNum}>{n}</b>
              </span>
            ))}
          </p>
          <button className={styles.add} type="button" onClick={raise}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-plus-circle" /></svg>
            <span>{ADD_TEXT}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
