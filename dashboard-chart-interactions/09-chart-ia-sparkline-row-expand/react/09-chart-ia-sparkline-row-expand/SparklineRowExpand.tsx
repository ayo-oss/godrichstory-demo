import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SparklineRowExpand.module.scss";

// 편 264 · 09 — 표 안의 작은 선이 카드로 커진다 (vanilla 와 같은 동작)
// 열린 행은 data-open 하나로 나가고 CSS 가 grid-template-rows 세 트랙을 움직인다.
export type SparklineRowExpandProps = {
  title?: string;
  liveInitial?: string;
  hint?: string;
  caption?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type KeyEvt = { key: string; preventDefault(): void };
type Btn = { focus(o: { preventScroll: boolean }): void };

type Row = {
  name: string;
  points: string;
  peakX: number;
  peakLabel: string;
  peakAnchor: "end";
  value: string;
  unit: string;
  delta: string;
  label: string;
  sparkLabel: string;
  max: string;
  min: string;
};

const ROWS: Row[] = [
  {
    name: "검색", points: "6,46 14,38 22,42 30,33 38,27 46,30 54,22 62,17 70,20 78,13 86,16 94,8",
    peakX: 88, peakLabel: "최고 180", peakAnchor: "end",
    value: "180", unit: "만원", delta: "+50.0%",
    label: "검색 12주 매출, 현재 180만원",
    sparkLabel: "검색 추이 꺾은선, 최고 180만원, 최저 120만원",
    max: "180", min: "120",
  },
  {
    name: "직접", points: "6,46 14,40 22,31 30,35 38,22 46,8 54,14 62,25 70,19 78,27 86,34 94,42",
    peakX: 40, peakLabel: "최고 134", peakAnchor: "end",
    value: "102", unit: "만원", delta: "+4.1%",
    label: "직접 12주 매출, 현재 102만원",
    sparkLabel: "직접 추이 꺾은선, 최고 134만원, 최저 98만원",
    max: "134", min: "98",
  },
  {
    name: "추천", points: "6,46 14,39 22,42 30,32 38,35 46,29 54,22 62,26 70,19 78,13 86,17 94,8",
    peakX: 88, peakLabel: "최고 118", peakAnchor: "end",
    value: "118", unit: "만원", delta: "+55.3%",
    label: "추천 12주 매출, 현재 118만원",
    sparkLabel: "추천 추이 꺾은선, 최고 118만원, 최저 76만원",
    max: "118", min: "76",
  },
];

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SparklineRowExpand({
  title = "채널별 매출 추이",
  liveInitial = "행을 선택하면 카드로 확대됩니다",
  hint = "행에 올리거나 탭으로 닿으면 카드로 커집니다",
  caption = "채널별 12주 매출",
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SparklineRowExpandProps) {
  const [demo, setDemo] = useState(true);
  const [open, setOpen] = useState(0);          // 0 = 전부 접힘, 1..3 = 그 행 고정
  const [cur, setCur] = useState(0);
  const [live, setLive] = useState("");
  const btns: { current: Btn[] } = { current: [] };

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const liveText = live || liveInitial;

  function say(i: number) { setLive(ROWS[i].label); }
  function onKey(e: KeyEvt) {
    const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    setDemo(false);
    const n = Math.min(Math.max(cur + d, 0), ROWS.length - 1);
    setCur(n);
    const t = btns.current[n];
    if (t) t.focus({ preventScroll: true });
  }

  return (
    <figure className={`${styles.sp} ${demo ? styles.isDemo : ""}`} style={vars} onKeyDown={onKey}>
      <figcaption className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.val} aria-live="polite">{liveText}</span>
      </figcaption>
      <div className={styles.rows} data-open={String(open)}>
        {ROWS.map((r, i) => (
          <button
            key={i}
            ref={(el: Btn | null) => { if (el) btns.current[i] = el; }}
            className={styles.row}
            type="button"
            data-i={String(i)}
            aria-label={r.label}
            onMouseEnter={() => { setDemo(false); say(i); }}
            onClick={() => { setDemo(false); setOpen(open === i + 1 ? 0 : i + 1); say(i); }}
            onFocus={() => { setDemo(false); setCur(i); say(i); }}
            onBlur={() => setOpen(0)}
          >
            <span className={styles.name}>{r.name}</span>
            <svg className={styles.spark} viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet" role="img" aria-label={r.sparkLabel}>
              <g className={styles.axis} aria-hidden="true">
                <line x1="2" y1="29" x2="98" y2="29"/><line x1="6" y1="50" x2="6" y2="53"/><line x1="50" y1="50" x2="50" y2="53"/><line x1="94" y1="50" x2="94" y2="53"/>
              </g>
              <line className={styles.base} x1="2" y1="50" x2="98" y2="50" aria-hidden="true"/>
              <polyline className={styles.line} points={r.points}/>
              <g className={styles.peak} aria-hidden="true">
                <circle cx={r.peakX === 88 ? "94" : "46"} cy="8" r="3"/>
                <text x={String(r.peakX)} y="11" text-anchor={r.peakAnchor}>{r.peakLabel}</text>
              </g>
            </svg>
            <span className={styles.num}>{r.value}<small>{r.unit}</small><i className={styles.delta}>{r.delta}</i></span>
          </button>
        ))}
      </div>
      <p className={styles.hint}>{hint}</p>
      <div className={styles.sr}><table>
        <caption>{caption}</caption>
        <thead><tr><th>채널</th><th>현재</th><th>최고</th><th>최저</th></tr></thead>
        <tbody>{ROWS.map((r, i) => (<tr key={i}><th>{r.name}</th><td>{r.value}</td><td>{r.max}</td><td>{r.min}</td></tr>))}</tbody>
      </table></div>
    </figure>
  );
}
