import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CrosshairTooltip.module.scss";

export type CrosshairTooltipProps = {
  title?: string;
  hint?: string;
  unit?: string;
  dayLabel?: (i: number) => string;
  chartLabel?: string;
  hotLabel?: string;
  tableCaption?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--i"?: string;
  "--y"?: string;
};
// ambient 타입에 React 이벤트 제네릭이 없어 필요한 모양만 직접 적는다
type PointerLike = { clientX: number; currentTarget: { getBoundingClientRect(): DOMRect } };
type KeyEvt = { key: string; preventDefault(): void };

const XS = [14, 40, 66, 92, 118, 144, 170, 196, 222, 248, 274, 300];
const YS = [66, 54, 58, 47, 27, 39, 53, 42, 29, 45, 36, 25];
const NUMS = [220, 268, 254, 305, 398, 342, 287, 331, 376, 309, 352, 401];
const N = NUMS.length;

export default function CrosshairTooltip({
  title = "Weekly visits",
  hint = "Move across the line and it snaps to the nearest day",
  unit = "",
  dayLabel = (i: number) => `Day ${i + 1}`,
  chartLabel = "Visitor trend over 12 days. Day 5 at 398 and day 12 at 401 are the peaks",
  hotLabel = "Move across the line to read each day",
  tableCaption = "Visitors over 12 days",
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: CrosshairTooltipProps) {
  const [demo, setDemo] = useState(true);
  const [i, setI] = useState(4);

  // 칸 번호와 그 점의 높이 두 값만 CSS 로 내보낸다 — 세로선·고리·툴팁이 같은 그룹 안에서 그 값을 읽는다
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--i": String(i),
    "--y": `${YS[i]}px`,
  };

  function snap(next: number) {
    setDemo(false);
    setI(Math.min(Math.max(next, 0), N - 1));
  }
  function onMove(e: PointerLike) {
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    snap(Math.round(t * (N - 1)));
  }
  function onKey(e: KeyEvt) {
    if (e.key === "ArrowRight") { e.preventDefault(); snap(i + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); snap(i - 1); }
    if (e.key === "Home") { e.preventDefault(); snap(0); }
    if (e.key === "End") { e.preventDefault(); snap(N - 1); }
  }

  const points = XS.map((x, k) => `${x},${YS[k]}`).join(" ");

  return (
    <figure className={`${styles.ch} ${demo ? styles.isDemo : ""}`} style={vars}>
      <figcaption className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.val} aria-live="polite">
          {dayLabel(i)} · {NUMS[i]}{unit}
        </span>
      </figcaption>
      <div className={styles.plot}>
        <svg className={styles.svg} viewBox="0 0 320 132" role="img" aria-label={chartLabel}>
          <g className={styles.grid} aria-hidden="true">
            <line x1="0" y1="24" x2="320" y2="24" /><line x1="0" y1="60" x2="320" y2="60" /><line x1="0" y1="96" x2="320" y2="96" />
          </g>
          <polyline className={styles.line} points={points} />
          <g className={styles.dots} aria-hidden="true">
            {XS.map((x, k) => <circle key={x} cx={x} cy={YS[k]} r="3" />)}
          </g>
          <g className={styles.cursor} aria-hidden="true">
            <line className={styles.x} x1="0" y1="6" x2="0" y2="112" />
            <g className={styles.mark}><circle className={styles.ring} r="7" /></g>
            <g className={styles.tip}>
              <g className={styles.tipbox}>
                <rect x="-31" y="-32" width="62" height="24" rx="6" />
                <text x="0" y="-15" textAnchor="middle">{NUMS[i]}{unit}</text>
              </g>
            </g>
          </g>
        </svg>
        <button className={styles.hot} type="button" aria-label={hotLabel} onPointerMove={onMove} onKeyDown={onKey} />
      </div>
      <p className={styles.hint}>{hint}</p>
      <div className={styles.sr}>
        <table>
          <caption>{tableCaption}</caption>
          <tbody>
            {NUMS.map((n, k) => <tr key={n + "-" + k}><th>{dayLabel(k)}</th><td>{n}</td></tr>)}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
