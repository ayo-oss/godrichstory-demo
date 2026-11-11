// ChartRadarPolygon — vanilla 판(run/289/demo/04-chart-draw-radar-polygon/index.html) 의 React 포트.
// 여섯 축 점수를 삼각함수 좌표로 조립한 polygon 이 중심에서 펼쳐지는 레이더 차트.
// 사람이 포인터를 올리면 미리보기 루프(.isDemo)가 떨어지고 꼭짓점 툴팁이 따라온다.
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChartRadarPolygon.module.scss";

export type ChartRadarPolygonProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 포인터를 올리면 꺼진다 */
  demo?: boolean;
};

type PtrEvt = { clientX: number; clientY: number };
type Box<T> = { current: T | null };

const AXES = ["디자인", "속도", "안정성", "문서", "커뮤니티", "가격"];
const VALS = [86, 72, 90, 64, 78, 58];
const CX = 232, CY = 100, R = 68, N = 6;
const VW = 440, VH = 198;
const TOP_AXIS = 2;   // 안정성 — 미리보기 툴팁이 가리키는 최고 축

/** i번째 축의 좌표 — 위꼭짓점(i=0)에서 시작해 시계 방향 60도 간격 */
function pos(i: number, r: number): [number, number] {
  const rad = (i * 60 - 90) * Math.PI / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}
/** 반지름 r 육각형의 points 문자열 — 눈금 격자와 데이터 폴리곤이 같은 함수에서 나온다 */
function ringPts(r: number): string {
  const s: string[] = [];
  for (let i = 0; i < N; i++) { const p = pos(i, r); s.push(p[0].toFixed(1) + "," + p[1].toFixed(1)); }
  return s.join(" ");
}

const PTS: [number, number][] = VALS.map((v, i) => pos(i, R * v / 100));
const POLY = PTS.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");

/** 꼭짓점 툴팁 위치 — plot 비율 %. 위쪽 반의 축은 아래로 띄운다 */
function tipStyle(i: number): CSSProperties {
  const below = PTS[i][1] < CY;
  return {
    left: (PTS[i][0] / VW * 100).toFixed(2) + "%",
    top: (PTS[i][1] / VH * 100).toFixed(2) + "%",
  };
}

export default function ChartRadarPolygon({ demo = true }: ChartRadarPolygonProps) {
  const svgRef: Box<SVGSVGElement> = useRef(null);
  const [live, setLive] = useState(!demo);
  const [tipIdx, setTipIdx] = useState<number | null>(TOP_AXIS);

  /** pointermove — 커서에서 46 viewBox 단위 안의 꼭짓점을 고른다 */
  function onMove(e: PtrEvt) {
    const svg = svgRef.current;
    if (!svg) return;
    setLive(true);   // live 를 켜야 .isDemo 루프가 떨어진다 (live=false 가 미리보기 상태다)
    const r = svg.getBoundingClientRect();
    const vx = (e.clientX - r.left) / r.width * VW;
    const vy = (e.clientY - r.top) / r.height * VH;
    let best = -1, bd = 46 * 46;
    PTS.forEach((p, i) => {
      const d = (p[0] - vx) * (p[0] - vx) + (p[1] - vy) * (p[1] - vy);
      if (d < bd) { bd = d; best = i; }
    });
    setTipIdx(best < 0 ? null : best);
  }

  const shown = tipIdx == null ? TOP_AXIS : tipIdx;
  const below = PTS[shown][1] < CY;
  const rootCls = [styles.root, live ? "" : styles.isDemo].filter(Boolean).join(" ");
  return (
    <div className={rootCls}>
      <div className={styles.card}>
        <div className={styles.head}>
          <p className={styles.title}>라이브러리 여섯 축 평가</p>
          <span className={styles.chip}>백점 만점</span>
        </div>
        <div className={styles.plot}>
          <svg
            className={styles.svg} ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} role="img"
            aria-label="여섯 축 점수 레이더 차트, 안정성 90점이 가장 높고 가격 58점이 가장 낮음"
            onPointerMove={onMove}
            onPointerLeave={() => setTipIdx(null)}
          >
            {/* 눈금 육각 격자 2겹(50%·100%) + 중심에서 뻗는 축선 6개 */}
            <g className={styles.grid}>
              {[R, R / 2].map((r) => (
                <polygon key={r} className={styles.ring} points={ringPts(r)} />
              ))}
              {AXES.map((_, g) => {
                const gp = pos(g, R);
                return <line key={g} className={styles.spoke} x1={CX} y1={CY} x2={gp[0].toFixed(1)} y2={gp[1].toFixed(1)} />;
              })}
            </g>
            {/* 축 라벨 6개 — 위·아래 축은 가운데 정렬, 옆 축은 바깥으로 붙인다 */}
            <g className={styles.labs}>
              {AXES.map((name, i) => {
                const p = pos(i, R + 18);
                const anchor = i === 0 || i === 3 ? "middle" : (i < 3 ? "start" : "end");
                return (
                  <text key={name} className={styles.lab} x={p[0].toFixed(1)} y={p[1].toFixed(1)} textAnchor={anchor}>{name}</text>
                );
              })}
            </g>
            {/* 주인공 폴리곤 + 꼭짓점 점 6개 */}
            <polygon className={styles.poly} points={POLY} />
            <g className={styles.dots}>
              {PTS.map((p, i) => (
                <circle key={AXES[i]} className={styles.dot} r={3.5} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} />
              ))}
            </g>
          </svg>
          {/* 툴팁 — 꼭짓점 위(위쪽 반은 아래로)에 뜬다 */}
          <div
            className={[styles.tip, below ? styles.tipBelow : "", tipIdx == null ? "" : styles.tipIsOn].filter(Boolean).join(" ")}
            aria-hidden="true"
            style={tipStyle(shown)}
          >
            <span className={styles.tipName}>{AXES[shown]}</span>
            <strong className={styles.tipVal}>{VALS[shown]}점</strong>
          </div>
          {/* 스크린리더용 데이터 표 — 화면에 안 보인다 */}
          <table className={styles.sr}>
            <caption>라이브러리 여섯 축 평가</caption>
            <thead><tr><th scope="col">축</th><th scope="col">점수</th></tr></thead>
            <tbody>
              {AXES.map((name, i) => (
                <tr key={name}><th scope="row">{name}</th><td>{VALS[i]}점</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
