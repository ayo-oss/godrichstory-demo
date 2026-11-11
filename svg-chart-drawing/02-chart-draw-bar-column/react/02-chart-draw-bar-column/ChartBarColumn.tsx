// ChartBarColumn — vanilla 판(run/289/demo/02-chart-draw-bar-column/index.html) 의 React 포트.
// 세로 막대 일곱 개가 baseline 에서 순서대로 자라는 주간 매출 그래프.
// 사람이 포인터를 올리면 미리보기 루프(.isDemo)가 떨어지고 막대 위 툴팁이 따라온다.
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChartBarColumn.module.scss";

export type ChartBarColumnProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 포인터를 올리면 꺼진다 */
  demo?: boolean;
};

type Vars = CSSProperties & { "--d"?: string };
type PtrEvt = { clientX: number };
type Box<T> = { current: T | null };

const DATA = [320, 410, 380, 505, 460, 620, 545];
const DAY = ["월", "화", "수", "목", "금", "토", "일"];
const VW = 440, VH = 200;
const PAD_L = 34, PAD_R = 432, TOP = 14, BASE = 160;
const MAX_Y = 700, BAR_W = 30;
const PEAK = DATA.indexOf(Math.max(...DATA));

/** 데이터 값 → viewBox y 좌표 (BASE 가 밑변 축) */
const scaleY = (v: number) => BASE - (BASE - TOP) * v / MAX_Y;
const band = (PAD_R - PAD_L) / DATA.length;
const centerX = (i: number) => PAD_L + band * (i + .5);

export default function ChartBarColumn({ demo = true }: ChartBarColumnProps) {
  const svgRef: Box<SVGSVGElement> = useRef(null);
  const [live, setLive] = useState(!demo);
  const [hover, setHover] = useState(PEAK);

  /** pointermove — 화면 좌표를 viewBox 좌표로 바꿔 커서 아래 막대를 고른다.
   *  live 를 켜야 .isDemo 루프가 떨어진다 (live=false 가 미리보기 상태다) */
  function onMove(e: PtrEvt) {
    const svg = svgRef.current;
    if (!svg) return;
    setLive(true);
    const r = svg.getBoundingClientRect();
    const vx = (e.clientX - r.left) / r.width * VW;
    setHover(Math.max(0, Math.min(DATA.length - 1, Math.floor((vx - PAD_L) / band))));
  }

  const rootCls = [styles.root, live ? "" : styles.isDemo].filter(Boolean).join(" ");
  return (
    <div className={rootCls}>
      <div className={styles.card}>
        <div className={styles.head}>
          <p className={styles.title}>주간 매출</p>
          <span className={styles.chip}>단위 만원</span>
        </div>
        <div className={styles.plot}>
          <svg
            className={styles.svg} ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} role="img"
            aria-label="주간 매출 막대 그래프, 토요일 620만원 최고"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(PEAK)}
          >
            {/* 가로 격자 3단 — y 스케일 눈금(200/400/600)과 같은 간격 */}
            <g className={styles.grid}>
              {[600, 400, 200].map((v) => (
                <line key={v} x1={PAD_L} y1={scaleY(v)} x2={PAD_R} y2={scaleY(v)} />
              ))}
            </g>
            <g className={styles.ticks}>
              {[600, 400, 200].map((v) => (
                <text key={v} x={28} y={scaleY(v)}>{v}</text>
              ))}
            </g>
            <line className={styles.axis} x1={PAD_L} y1={BASE} x2={PAD_R} y2={BASE} />
            {/* 막대 하나에 셀 하나 — 막대와 두 값 라벨이 같은 --d 를 공유한다 */}
            {DATA.map((v, i) => {
              const cx = centerX(i), top = scaleY(v);
              const peak = i === PEAK;
              return (
                <g key={DAY[i]} className={styles.cell} style={{ "--d": `${(i * .08).toFixed(2)}s` } as Vars}>
                  <rect
                    className={peak ? styles.barPeak : styles.bar}
                    x={(cx - BAR_W / 2).toFixed(1)} y={top.toFixed(1)}
                    width={BAR_W} height={(BASE - top).toFixed(1)}
                  />
                  {/* 값 라벨 두 장 — 미리보기에서 반값과 최종값을 컷으로 바꾼다. 실사용은 최종값만 */}
                  <text className={[styles.val, styles.vHalf, peak ? styles.vPeak : ""].filter(Boolean).join(" ")}
                    x={cx.toFixed(1)} y={(top - 7).toFixed(1)}>{Math.round(v / 2)}</text>
                  <text className={[styles.val, styles.vFull, peak ? styles.vPeak : ""].filter(Boolean).join(" ")}
                    x={cx.toFixed(1)} y={(top - 7).toFixed(1)}>{v}</text>
                  <text className={styles.day} x={cx.toFixed(1)} y={176}>{DAY[i]}</text>
                </g>
              );
            })}
          </svg>
          {/* 툴팁 — 커서 아래 막대 위에 뜬다 (viewBox 좌표를 plot 비율 % 로) */}
          <div
            className={[styles.tip, live ? styles.tipIsOn : ""].filter(Boolean).join(" ")}
            aria-hidden="true"
            style={{
              left: `${(centerX(hover) / VW * 100).toFixed(2)}%`,
              bottom: `${((VH - scaleY(DATA[hover]) + 8) / VH * 100).toFixed(2)}%`,
            }}
          >
            <span className={styles.tipDay}>{DAY[hover]}</span>
            <strong className={styles.tipVal}>{DATA[hover]}만원</strong>
          </div>
          {/* 스크린리더용 데이터 표 — 화면에 안 보인다 */}
          <table className={styles.sr}>
            <caption>주간 매출</caption>
            <thead><tr><th scope="col">요일</th><th scope="col">매출 (만원)</th></tr></thead>
            <tbody>
              {DATA.map((v, i) => (
                <tr key={DAY[i]}><th scope="row">{DAY[i]}</th><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
