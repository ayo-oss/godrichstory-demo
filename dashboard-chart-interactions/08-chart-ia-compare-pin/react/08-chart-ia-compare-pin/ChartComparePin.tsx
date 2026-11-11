import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChartComparePin.module.scss";

// 편 264 · 08 — 두 점을 찍으면 그 사이 차이가 뜬다 (vanilla 와 같은 동작)
// 상태는 React state(a·b·cur) 에, 화면은 CSS 가 --ax/--ay/… 와 [data-b] 로 그린다.
export type ChartComparePinProps = {
  title?: string;
  liveInitial?: string;
  hint?: string;
  chartLabel?: string;
  caption?: string;
  weeks?: string[];
  unit?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type KeyEvt = { key: string; preventDefault(): void };
type Btn = { focus(o: { preventScroll: boolean }): void };

const XS = [20, 60, 100, 140, 180, 220, 260, 300];
const YS = [112, 97, 104, 76, 46, 62, 38, 28];
const VS = [128, 152, 141, 186, 233, 208, 246, 262];

type Vars = CSSProperties & {
  "--ax"?: string; "--ay"?: string; "--bx"?: string; "--by"?: string;
  "--mx"?: string; "--my"?: string;
  "--duration"?: string; "--easing"?: string; "--color"?: string;
};

export default function ChartComparePin({
  title = "주간 가입자",
  liveInitial = "두 점을 찍어 차이를 보세요",
  hint = "점을 찍어 기준을 정하고 다른 점을 찍으면 두 시점의 차이가 나타납니다",
  chartLabel = "8주간 가입자 추이, 1주 128명에서 8주 262명으로 증가",
  caption = "주간 가입자 수",
  weeks = ["1주", "2주", "3주", "4주", "5주", "6주", "7주", "8주"],
  unit = "명",
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: ChartComparePinProps) {
  const [demo, setDemo] = useState(true);
  const [a, setA] = useState(0);
  const [b, setB] = useState<number | null>(null);
  const [cur, setCur] = useState(0);
  const btns: { current: Btn[] } = { current: [] };

  const labels = weeks.map((w, i) => w + " " + VS[i] + unit);
  const pct =
    b === null
      ? null
      : ((VS[b] - VS[a]) / VS[a]) * 100;
  const pctText =
    pct === null ? "+104.7%" : (pct >= 0 ? "+" : "−") + Math.abs(pct).toFixed(1) + "%";
  const liveText =
    b === null
      ? labels[a]
      : labels[a] + " · " + labels[b] + " · " + pctText;

  const vars: Vars = {
    "--ax": XS[a] + "px", "--ay": YS[a] + "px",
    "--bx": XS[b === null ? 7 : b] + "px", "--by": YS[b === null ? 7 : b] + "px",
    "--mx": b === null ? "160px" : (XS[a] + XS[b]) / 2 + "px",
    "--my": b === null ? "70px" : (YS[a] + YS[b]) / 2 + "px",
    "--duration": duration + "ms", "--easing": easing, "--color": color,
  };

  // 세 번째 찍기는 기준 이동 + 둘째 핀 해제, 두 번째 찍기는 비교 핀
  function pin(i: number) {
    setDemo(false);
    if (b !== null) { setA(i); setB(null); }
    else if (i !== a) { setB(i); }
  }
  function onKey(e: KeyEvt) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    setDemo(false);
    const n = Math.min(Math.max(cur + d, 0), XS.length - 1);
    setCur(n);
    const t = btns.current[n];
    if (t) t.focus({ preventScroll: true });
  }

  return (
    <figure
      className={`${styles.cmp} ${demo ? styles.isDemo : ""}`}
      data-b={b === null ? undefined : "1"}
      style={vars}
      onKeyDown={onKey}
    >
      <figcaption className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.val} aria-live="polite">{demo ? liveInitial : liveText}</span>
      </figcaption>
      <div className={styles.plot}>
        <svg className={styles.svg} viewBox="0 0 320 136" role="img" aria-label={chartLabel}>
          <g className={styles.grid} aria-hidden="true">
            <line x1="0" y1="28" x2="320" y2="28"/><line x1="0" y1="68" x2="320" y2="68"/><line x1="0" y1="108" x2="320" y2="108"/>
          </g>
          <g className={styles.labels} aria-hidden="true">
            {weeks.map((w, i) => <text key={i} x={XS[i]} y="131">{w}</text>)}
          </g>
          <polyline className={styles.line} points="20,112 60,97 100,104 140,76 180,46 220,62 260,38 300,28"/>
          <g className={styles.link} aria-hidden="true">
            <g className={styles.linkpos}>
              <g className={styles.draw1}>
                <line className={styles.l1} x1="0" y1="0" x2={b === null ? 280 : XS[b] - XS[a]} y2={b === null ? -84 : YS[b] - YS[a]}/>
              </g>
              <g className={styles.draw2}>
                <line className={styles.l2} x1="0" y1="0" x2="-120" y2="18"/>
              </g>
            </g>
          </g>
          <g className={styles.pinB} aria-hidden="true">
            <g className={styles.pinBIn}><circle className={styles.bring} r="7"/><circle className={styles.bdot} r="2.5"/></g>
          </g>
          <g className={styles.badge1} aria-hidden="true">
            <g className={styles.badgeIn}><rect x="-34" y="-11" width="68" height="22" rx="8"/><text x="0" y="4" text-anchor="middle">{pctText}</text></g>
          </g>
          <g className={styles.badge2} aria-hidden="true">
            <g className={styles.badgeIn}><rect x="-34" y="-11" width="68" height="22" rx="8"/><text x="0" y="4" text-anchor="middle">−11.1%</text></g>
          </g>
          <g className={styles.base} aria-hidden="true">
            <g className={styles.baseIn}><circle className={styles.aring} r="7.5"/><circle className={styles.adot} r="2.5"/></g>
          </g>
        </svg>
        {labels.map((lab, i) => (
          <button
            key={i}
            ref={(el: Btn | null) => { if (el) btns.current[i] = el; }}
            className={styles.pt}
            type="button"
            tabIndex={i === cur ? 0 : -1}
            aria-pressed={i === a}
            aria-label={lab}
            style={{ left: (XS[i] / 320) * 100 + "%", top: (YS[i] / 136) * 100 + "%" }}
            onClick={() => { setCur(i); pin(i); }}
            onFocus={() => { setDemo(false); setCur(i); }}
          ><span className={styles.dot} aria-hidden="true"></span></button>
        ))}
      </div>
      <p className={styles.hint}>{hint}</p>
      <div className={styles.sr}><table>
        <caption>{caption}</caption>
        <tbody>{weeks.map((w, i) => (<tr key={i}><th>{w}</th><td>{VS[i]}</td></tr>))}</tbody>
      </table></div>
    </figure>
  );
}
