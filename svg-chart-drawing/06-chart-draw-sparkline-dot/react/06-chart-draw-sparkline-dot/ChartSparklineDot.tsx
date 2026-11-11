// ChartSparklineDot — vanilla 판(run/289/demo/06-chart-draw-sparkline-dot/index.html) 의 React 포트.
// KPI 카드 안 스파크라인 — 14일 접속 수 라인과 종가 점. 사람이 포인터를 올리면
// 미리보기 루프가 떨어지고 가까운 점의 툴팁이 따라온다.
import { useRef, useState } from "react";
import styles from "./ChartSparklineDot.module.scss";

export type ChartSparklineDotProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 포인터를 올리면 꺼진다 */
  demo?: boolean;
};

type PtrEvt = { clientX: number };
type Box<T> = { current: T | null };

const DATA = [990, 1005, 982, 1018, 1036, 1024, 1052, 1078, 1066, 1092, 1080, 1102, 1094, 1108];
const VW = 320, VH = 88;
const PAD_L = 4, PAD_R = 316, TOP = 8, BASE = 78;
const MIN = 970, MAX = 1120;
const LAST = DATA.length - 1;
const NTH_LABEL = "{n}일차";     // 표의 행 머리 — 언어마다 숫자 자리가 다르다 (en 은 Day 1)
const DAY_LABEL = "{n}일째";     // 툴팁의 날짜

/** 스케일 함수 — 데이터 값 → viewBox 좌표 */
const scaleX = (i: number) => PAD_L + (PAD_R - PAD_L) * i / LAST;
const scaleY = (v: number) => BASE - (BASE - TOP) * (v - MIN) / (MAX - MIN);

/** 스파크라인은 꺾은선 그대로 — 부드러운 곡선보다 추세의 생김새가 먼저 읽힌다 */
function buildPath() {
  return DATA.map((v, i) => `${i ? "L" : "M"}${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`).join(" ");
}
const PATH_D = buildPath();

export default function ChartSparklineDot({ demo = true }: ChartSparklineDotProps) {
  const svgRef: Box<SVGSVGElement> = useRef(null);
  const [live, setLive] = useState(!demo);
  const [hover, setHover] = useState(LAST);

  /** pointermove — 화면 좌표를 viewBox 좌표로 바꿔 가장 가까운 점을 고른다 */
  function onMove(e: PtrEvt) {
    const svg = svgRef.current;
    if (!svg) return;
    setLive(true);   // live 를 켜야 .isDemo 루프가 떨어진다 (live=false 가 미리보기 상태다)
    const r = svg.getBoundingClientRect();
    const vx = (e.clientX - r.left) / r.width * VW;
    setHover(Math.max(0, Math.min(LAST, Math.round((vx - PAD_L) / ((PAD_R - PAD_L) / LAST)))));
  }

  const rootCls = [styles.root, live ? "" : styles.isDemo].filter(Boolean).join(" ");
  return (
    <div className={rootCls}>
      <div className={styles.card}>
        <div className={styles.head}>
          <p className={styles.title}>14일 접속</p>
          <div className={styles.row}>
            {/* 큰 숫자 두 장 — 미리보기에서 반값과 최종값을 steps 컷으로 바꾼다. 실사용은 최종값만 */}
            <div className={styles.numWrap}>
              <span className={`${styles.num} ${styles.numHalf}`}>{Math.round(DATA[LAST] / 2)}</span>
              <span className={`${styles.num} ${styles.numFull}`}>{DATA[LAST].toLocaleString()}</span>
            </div>
            <span className={styles.chipCls}>+12%</span>
          </div>
        </div>
        <div className={styles.plot}>
          <svg
            className={styles.svg} ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} role="img"
            aria-label="14일 접속 수 스파크라인, 마지막 날 1108명으로 상승"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(LAST)}
          >
            {/* pathLength=100 이라 dashoffset 애니메이션이 길이와 무관하게 0~100 으로 돈다 */}
            <path className={styles.line} pathLength={100} d={PATH_D} />
            {/* 종가 점 — 실사용(정적)에서는 항상 보인다 */}
            <circle className={styles.dot} r={4} cx={scaleX(LAST).toFixed(1)} cy={scaleY(DATA[LAST]).toFixed(1)} />
          </svg>
          {/* 툴팁 — 가까운 점 위에 뜬다 (viewBox 좌표를 plot 비율 % 로, 끝 점은 85% 상한) */}
          <div
            className={[styles.tip, live ? styles.tipIsOn : ""].filter(Boolean).join(" ")}
            aria-hidden="true"
            style={{
              left: `${Math.min(scaleX(hover) / VW * 100, 85).toFixed(2)}%`,
              top: `${(scaleY(DATA[hover]) / VH * 100).toFixed(2)}%`,
            }}
          >
            <span className={styles.tipDay}>{DAY_LABEL.replace("{n}", String(hover + 1))}</span>
            <strong className={styles.tipVal}>{DATA[hover].toLocaleString()}명</strong>
          </div>
          {/* 스크린리더용 데이터 표 — 화면에 안 보인다 */}
          <table className={styles.sr}>
            <caption>14일 접속</caption>
            <thead><tr><th scope="col">일차</th><th scope="col">접속 수 (명)</th></tr></thead>
            <tbody>
              {DATA.map((v, i) => (
                <tr key={i}><th scope="row">{NTH_LABEL.replace("{n}", String(i + 1))}</th><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
