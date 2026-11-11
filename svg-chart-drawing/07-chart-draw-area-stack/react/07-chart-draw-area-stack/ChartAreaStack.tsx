// ChartAreaStack — vanilla 판(run/289/demo/07-chart-draw-area-stack/index.html) 의 React 포트.
// 세 계열 점유율을 누적 면적 path 로 쌓는 누적 영역 그래프.
// 사람이 포인터를 올리면 미리보기 루프(.isDemo)가 떨어지고 가이드선과 툴팁이 따라온다.
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChartAreaStack.module.scss";

export type ChartAreaStackProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 포인터를 올리면 꺼진다 */
  demo?: boolean;
};

type PtrEvt = { clientX: number };
type Box<T> = { current: T | null };

const MON = ["3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월"];
const DESK = [52, 50, 47, 45, 42, 40, 37, 35];   // 세 계열을 더하면 매월 100
const MOB = [34, 36, 38, 40, 42, 44, 46, 48];
const TAB = [14, 14, 15, 15, 16, 16, 17, 17];
const VW = 440, VH = 190;
const PAD_L = 34, PAD_R = 432, TOP = 10, BASE = 148;   // viewBox 좌표
const PREVIEW_IDX = 6;   // 9월 — 모바일이 데스크톱을 앞선 달

/** 월 인덱스와 점유율(0-100)을 viewBox 좌표로 바꾼다 */
const xAt = (i: number) => PAD_L + (PAD_R - PAD_L) * i / (MON.length - 1);
const yAt = (v: number) => BASE - (BASE - TOP) * v / 100;

/** 누적 경계선 — 바닥(0), 데스크톱 위, 모바일 위, 천장(100). 아래부터 쌓는 순서 그대로다 */
const B: number[][] = [
  MON.map(() => 0),
  DESK.slice(),
  DESK.map((v, i) => v + MOB[i]),
  MON.map(() => 100)
];
/** k번째 레이어 path — 위 경계를 좌에서 우로 걷고 아래 경계를 거꾸로 돌아와 면적을 닫는다 */
function layerPath(k: number): string {
  let d = "";
  for (let i = 0; i < MON.length; i++) d += (i ? " L" : "M") + xAt(i).toFixed(1) + "," + yAt(B[k + 1][i]).toFixed(1);
  for (let j = MON.length - 1; j >= 0; j--) d += " L" + xAt(j).toFixed(1) + "," + yAt(B[k][j]).toFixed(1);
  return d + " Z";
}
/** 직접 라벨 — 6월과 7월 사이(가운데)의 각 밴드 한가운데 y */
const LAB_Y = [yAt(B[1][3] / 2), yAt(B[1][3] + MOB[3] / 2), yAt(B[2][3] + TAB[3] / 2)];

/** 툴팁 x — 양 끝에서 카드 밖으로 나가지 않게 17-83% 로 Clamp */
function tipLeft(i: number): CSSProperties {
  const pct = Math.min(83, Math.max(17, xAt(i) / VW * 100));
  return { left: pct.toFixed(2) + "%" };
}

export default function ChartAreaStack({ demo = true }: ChartAreaStackProps) {
  const svgRef: Box<SVGSVGElement> = useRef(null);
  const [live, setLive] = useState(!demo);
  const [mon, setMon] = useState(PREVIEW_IDX);
  const [hot, setHot] = useState(false);   // 포인터가 svg 위에 있는 동안만 툴팁·가이드선이 켜진다

  /** pointermove — 포인터의 x 위치에서 가장 가까운 달을 찾는다 */
  function onMove(e: PtrEvt) {
    const svg = svgRef.current;
    if (!svg) return;
    setLive(true);   // live 를 켜야 .isDemo 루프가 떨어진다 (live=false 가 미리보기 상태다)
    setHot(true);
    const r = svg.getBoundingClientRect();
    const vx = (e.clientX - r.left) / r.width * VW;
    let i = Math.round((vx - PAD_L) / ((PAD_R - PAD_L) / (MON.length - 1)));
    setMon(Math.max(0, Math.min(MON.length - 1, i)));
  }

  const rootCls = [styles.root, live ? "" : styles.isDemo].filter(Boolean).join(" ");
  return (
    <div className={rootCls}>
      <div className={styles.card}>
        <div className={styles.head}>
          <p className={styles.title}>기기별 점유율 추이</p>
          <span className={styles.chip}>8개월 · 합계 100</span>
        </div>
        <div className={styles.plot}>
          <svg
            className={styles.svg} ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} role="img"
            aria-label="데스크톱·모바일·태블릿 점유율 누적 영역 그래프, 모바일은 34%에서 48%로 늘고 데스크톱은 52%에서 35%로 준다"
            onPointerMove={onMove}
            onPointerLeave={() => setHot(false)}
          >
            {/* 가로 격자 3단 — y 눈금(25/50/75)과 같은 간격 */}
            <g className={styles.grid}>
              {[44.5, 79, 113.5].map((y) => (
                <line key={y} x1={PAD_L} y1={y} x2={PAD_R} y2={y} />
              ))}
            </g>
            <g className={styles.ticks}>
              <text x={28} y={14}>100</text>
              <text x={28} y={48.5}>75</text>
              <text x={28} y={83}>50</text>
              <text x={28} y={117.5}>25</text>
            </g>
            {/* 밑변 축 */}
            <line className={styles.axis} x1={PAD_L} y1={BASE} x2={PAD_R} y2={BASE} />
            <g className={styles.labels}>
              {MON.map((m, i) => (
                <text key={m} x={xAt(i).toFixed(1)} y={170}>{m}</text>
              ))}
            </g>
            {/* 레이어 3장 — 위부터 태블릿·모바일·데스크톱 순으로 그린다 */}
            <path className={styles.layer3} d={layerPath(2)} />
            <path className={styles.layer2} d={layerPath(1)} />
            <path className={styles.layer1} d={layerPath(0)} />
            {/* 호버 가이드선 — 포인터가 가리키는 달 */}
            <line className={[styles.guide, hot ? styles.guideIsOn : ""].filter(Boolean).join(" ")}
              x1={xAt(mon).toFixed(1)} y1={TOP} x2={xAt(mon).toFixed(1)} y2={BASE} />
            {/* 직접 라벨 — 레이어 이름이 각 영역 안에 산다 */}
            <text className={styles.lab} x={261} y={LAB_Y[0].toFixed(1)} textAnchor="middle">데스크톱</text>
            <text className={`${styles.lab} ${styles.lab2}`} x={261} y={LAB_Y[1].toFixed(1)} textAnchor="middle">모바일</text>
            <text className={styles.lab} x={261} y={LAB_Y[2].toFixed(1)} textAnchor="middle">태블릿</text>
          </svg>
          {/* 툴팁 — 달과 세 계열 값. plot 안 위쪽에 절대 배치 */}
          <div className={[styles.tip, hot ? styles.tipIsOn : ""].filter(Boolean).join(" ")} aria-hidden="true" style={tipLeft(mon)}>
            <span className={styles.tipMon}>{MON[mon]}</span>
            <span className={styles.tipRow}><i className={styles.sw1}></i><span className={styles.tipName}>데스크톱</span><b>{DESK[mon]}</b></span>
            <span className={styles.tipRow}><i className={styles.sw2}></i><span className={styles.tipName}>모바일</span><b>{MOB[mon]}</b></span>
            <span className={styles.tipRow}><i className={styles.sw3}></i><span className={styles.tipName}>태블릿</span><b>{TAB[mon]}</b></span>
          </div>
          {/* 스크린리더용 데이터 표 — 화면에 안 보인다 */}
          <table className={styles.sr}>
            <caption>기기별 점유율 추이</caption>
            <thead><tr><th scope="col">월별</th><th scope="col">데스크톱</th><th scope="col">모바일</th><th scope="col">태블릿</th></tr></thead>
            <tbody>
              {MON.map((m, i) => (
                <tr key={m}><th scope="row">{m}</th><td>{DESK[i]}%</td><td>{MOB[i]}%</td><td>{TAB[i]}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
