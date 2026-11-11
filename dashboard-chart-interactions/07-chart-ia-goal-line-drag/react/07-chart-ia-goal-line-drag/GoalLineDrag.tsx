import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GoalLineDrag.module.scss";

export type GoalLineDragProps = {
  title?: string;
  goalLabel?: string;
  hitLabel?: string;
  unit?: string;
  sliderLabel?: string;
  hint?: string;
  chartLabel?: string;
  tableCaption?: string;
  headDay?: string;
  headVisits?: string;
  days?: string[];
  values?: number[];
  min?: number;
  max?: number;
  initialGoal?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

// ambient 타입이 빈약해 포인터 이벤트는 파일 안 로컬 타입으로만 다룬다
type PointerLike = {
  clientY: number;
  pointerId: number;
  currentTarget: {
    setPointerCapture(id: number): void;
    hasPointerCapture(id: number): boolean;
    getBoundingClientRect(): DOMRect;
  };
};
type KeyEvt = { key: string; preventDefault(): void };

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--goal"?: string;
  "--gv"?: string;
  "--n"?: string;
};

const DATA = [245, 312, 198, 368, 276, 154, 332];   // 표와 같은 값 — 월화수목금토일

export default function GoalLineDrag({
  title = "일일 방문과 목표",
  goalLabel = "목표",
  hitLabel = "달성",
  unit = "명",
  sliderLabel = "목표선 끌기",
  hint = "목표선을 끌어올리면 넘은 막대만 색이 바뀝니다",
  chartLabel = "요일 7개 방문 막대와 목표선 300명. 월 245, 화 312, 수 198, 목 368, 금 276, 토 154, 일 332명",
  tableCaption = "요일별 방문자 수",
  headDay = "요일",
  headVisits = "방문",
  days = ["월", "화", "수", "목", "금", "토", "일"],
  values = DATA,
  min = 50,
  max = 400,
  initialGoal = 300,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: GoalLineDragProps) {
  const [demo, setDemo] = useState(true);
  const [goal, setGoal] = useState(initialGoal);
  // 목표값은 그래픽 좌표가 아니라 값으로 센다 — 손 위치는 차트 구역 rect 기준
  const zoneRef = useRef<{ getBoundingClientRect(): DOMRect } | null>(null);
  // 상태는 숫자 하나뿐 — 달성 개수·넘김 여부는 전부 여기서 파생한다
  const over = values.map((v) => v >= goal);
  const n = over.filter(Boolean).length;
  const vars: Vars = {
    "--duration": `${duration}ms`, "--easing": easing, "--color": color,
    "--goal": `${goal / 4}%`, "--gv": String(goal), "--n": String(n),
  };

  function apply(v: number) {
    setDemo(false);
    setGoal(Math.max(min, Math.min(max, Math.round(v))));
  }
  function fromPointer(e: PointerLike) {
    const z = zoneRef.current;
    if (!z) { return; }
    const r = z.getBoundingClientRect();
    apply((1 - (e.clientY - r.top) / r.height) * max);
  }
  function onKey(e: KeyEvt) {
    let v: number | null = null;
    if (e.key === "ArrowUp") v = goal + 10;
    if (e.key === "ArrowDown") v = goal - 10;
    if (e.key === "Home") v = min;
    if (e.key === "End") v = max;
    if (v !== null) { e.preventDefault(); apply(v); }
  }

  return (
    <div className={`${styles.gl} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.stat} aria-hidden="true">
          {goalLabel} <b className={styles.nV} />{unit} · {hitLabel} <b className={styles.nC} />/{values.length}
        </span>
      </div>

      <div className={styles.zone} ref={zoneRef}>
        <div className={styles.bars} role="img" aria-label={chartLabel}>
          {values.map((v, i) => (
            <span key={i} className={styles.bar} data-over={over[i] ? "1" : "0"} style={{ "--h": `${v / 4}%` } as CSSProperties} />
          ))}
        </div>
        <div className={styles.goal}>
          <span className={styles.rail} aria-hidden="true" />
          <button
            type="button"
            className={styles.grab}
            role="slider"
            aria-orientation="vertical"
            aria-label={sliderLabel}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={goal}
            aria-valuetext={`${goal}${unit}`}
            onPointerDown={(e: PointerLike) => { e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
            onPointerMove={(e: PointerLike) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e); }}
            onKeyDown={onKey}
          >
            <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M176 128a48 48 0 1 1-48-48a48 48 0 0 1 48 48" opacity=".2"/><path d="M221.87 83.16A104.1 104.1 0 1 1 195.67 49l22.67-22.68a8 8 0 0 1 11.32 11.32l-96 96a8 8 0 0 1-11.32-11.32l27.72-27.72a40 40 0 1 0 17.87 31.09a8 8 0 1 1 16-.9a56 56 0 1 1-22.38-41.65l22.75-22.75a87.88 87.88 0 1 0 23.13 29.67a8 8 0 0 1 14.44-6.9"/></g></svg>
          </button>
        </div>
      </div>

      <div className={styles.daysRow} aria-hidden="true">
        {days.map((d) => <span key={d}>{d}</span>)}
      </div>

      <p className={styles.hint}>{hint}</p>

      <div className={styles.sr}>
        <span aria-live="polite">{goalLabel} {goal}{unit}, {hitLabel} {n}개 중 {values.length}개</span>
        <table>
          <caption>{tableCaption}</caption>
          <thead><tr><th>{headDay}</th><th>{headVisits}</th></tr></thead>
          <tbody>
            {values.map((v, i) => <tr key={i}><th>{days[i]}</th><td>{v}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
