// ChartHeatmapGrid — vanilla 판(run/289/demo/05-chart-draw-heatmap-grid/index.html) 의 React 포트.
// 요일×시간대 밀도 42칸을 한 가지 색의 농도 함수로 칠하는 히트맵.
// 사람이 포인터를 올리면 미리보기 루프(.isDemo)가 떨어지고 칸 툴팁이 따라온다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChartHeatmapGrid.module.scss";

export type ChartHeatmapGridProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 포인터를 올리면 꺼진다 */
  demo?: boolean;
};

type PtrEvt = { clientX: number; clientY: number; target: Element | null };
type Vars = CSSProperties & { "--d"?: string; "--dn"?: string };

const DAYS = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];
const DAY_S = ["월", "화", "수", "목", "금", "토", "일"];
const BANDS = ["0-6시", "6-10시", "10-14시", "14-18시", "18-22시", "22-24시"];
// 밀도 0-100 — 평일 새벽은 비고 주말 오후로 갈수록 짙어진다
const DENS = [
  [8, 22, 38, 42, 30, 12],
  [7, 25, 41, 45, 33, 13],
  [9, 24, 40, 44, 31, 11],
  [8, 26, 43, 47, 35, 14],
  [10, 28, 46, 58, 62, 30],
  [14, 20, 52, 78, 88, 46],
  [12, 18, 48, 92, 84, 38]
];
const VW = 440, VH = 178;
const X0 = 46, CW = 60, GX = 64;      // 열: 칸 폭 60, 간격 4
const Y0 = 20, CH = 18, GY = 21;      // 줄: 칸 높이 18, 간격 3
const HOT_R = 6, HOT_C = 3;           // 가장 짙은 칸 — 일요일 14-18시

/** 농도 함수 — 이 데모의 주제. 색은 한 가지로 고정하고 투명도만 값에 비례해 움직인다 */
const fillOpacity = (v: number) => 0.12 + 0.88 * v / 100;

/** 칸 지연(초) — 읽는 순서(좌에서 우, 위에서 아래)로 flat × 28ms.
 *  숫자 라벨은 칸이 물든 뒤 살짝 늦게(+0.12s) 팝한다 */
const delaySec = (r: number, c: number) => (r * BANDS.length + c) * 0.028;

/** 툴팁 위치 — 칸 윗변에 맞춰 위로 뜨고, 위 두 줄은 아래로 띄운다 */
function tipStyle(r: number, c: number): CSSProperties {
  const below = r < 2;
  return {
    left: ((X0 + c * GX + CW / 2) / VW * 100).toFixed(2) + "%",
    top: ((Y0 + r * GY + (below ? CH : 0)) / VH * 100).toFixed(2) + "%",
  };
}

export default function ChartHeatmapGrid({ demo = true }: ChartHeatmapGridProps) {
  const [live, setLive] = useState(!demo);
  const [hot, setHot] = useState<{ r: number; c: number } | null>({ r: HOT_R, c: HOT_C });

  /** pointermove — 칸 위에 있으면 그 칸의 요일·시간대·밀도를 보여 준다.
   *  CSS 모듈이라 칸의 클래스 이름은 해시값 — styles.cell 로 비교한다 */
  function onMove(e: PtrEvt) {
    const t = e.target as Element | null;
    if (!t || !t.classList.contains(styles.cell)) return;
    setLive(true);   // live 를 켜야 .isDemo 루프가 떨어진다 (live=false 가 미리보기 상태다)
    setHot({ r: Number(t.getAttribute("data-r")), c: Number(t.getAttribute("data-c")) });
  }

  const shown = hot == null ? { r: HOT_R, c: HOT_C } : hot;
  const below = shown.r < 2;
  const rootCls = [styles.root, live ? "" : styles.isDemo].filter(Boolean).join(" ");
  return (
    <div className={rootCls}>
      <div className={styles.card}>
        <div className={styles.head}>
          <p className={styles.title}>요일×시간대 방문 밀도</p>
          <span className={styles.chip}>한 가지 색의 농도</span>
        </div>
        <div className={styles.plot}>
          <svg
            className={styles.svg} viewBox={`0 0 ${VW} ${VH}`} role="img"
            aria-label="요일과 시간대별 방문 밀도 히트맵, 일요일 낮 2-6시가 92로 가장 높음"
            onPointerMove={onMove}
            onPointerLeave={() => setHot(null)}
          >
            {/* 시간대 라벨 6 — 열 위 */}
            <g className={styles.bands}>
              {BANDS.map((b, c) => (
                <text key={b} className={styles.band} x={X0 + c * GX + CW / 2} y={10} textAnchor="middle">{b}</text>
              ))}
            </g>
            {/* 요일 라벨 7 — 왼쪽 */}
            <g className={styles.days}>
              {DAYS.map((_, r) => (
                <text key={DAY_S[r]} className={styles.day} x={38} y={Y0 + r * GY + CH / 2} textAnchor="end">{DAY_S[r]}</text>
              ))}
            </g>
            {/* 칸 42 + 가장 짙은 칸의 숫자 라벨. 미리보기 퇴장 와이프가 이 그룹 전체를 친다 */}
            <g className={styles.grid}>
              {DENS.map((row, r) =>
                row.map((v, c) => (
                  <rect
                    key={r + "-" + c} className={styles.cell}
                    x={X0 + c * GX} y={Y0 + r * GY} width={CW} height={CH} rx={4}
                    fillOpacity={fillOpacity(v).toFixed(3)}
                    data-r={r} data-c={c}
                    style={{ "--d": delaySec(r, c).toFixed(3) + "s" } as Vars}
                  />
                ))
              )}
              {DENS.map((row, r) =>
                row.map((v, c) => v >= 84 ? (
                  // 가장 짙은 칸에는 숫자를 직접 새긴다 — 색만으론 정확한 값을 읽을 수 없다.
                  // 짙은 칸(농도 .86~.93) 위에서는 크림도 잉크도 AA 를 못 넘으므로 얕은 페이퍼
                  // 알약을 숫자 밑에 깔고 그 위에 잉크로 쓴다 — 알약도 같은 지연으로 함께 팝한다
                  <g key={"n" + r + "-" + c}>
                    <rect
                      className={styles.numBg}
                      x={X0 + c * GX + CW / 2 - 12} y={Y0 + r * GY + CH / 2 - 7}
                      width={24} height={14} rx={4}
                      style={{ "--dn": (delaySec(r, c) + 0.12).toFixed(3) + "s" } as Vars}
                    />
                    <text
                      className={styles.num}
                      x={X0 + c * GX + CW / 2} y={Y0 + r * GY + CH / 2} textAnchor="middle"
                      style={{ "--dn": (delaySec(r, c) + 0.12).toFixed(3) + "s" } as Vars}
                    >{v}</text>
                  </g>
                ) : null)
              )}
            </g>
          </svg>
          {/* 툴팁 — 칸 위(위 두 줄은 아래로)에 뜬다 */}
          <div
            className={[styles.tip, below ? styles.tipBelow : "", hot == null ? "" : styles.tipIsOn].filter(Boolean).join(" ")}
            aria-hidden="true"
            style={tipStyle(shown.r, shown.c)}
          >
            <span className={styles.tipDay}>{DAYS[shown.r]}</span>
            <span className={styles.tipBand}>{BANDS[shown.c]}</span>
            <strong className={styles.tipVal}>{DENS[shown.r][shown.c]}</strong>
          </div>
          {/* 스크린리더용 데이터 표 — 화면에 안 보인다 */}
          <table className={styles.sr}>
            <caption>요일×시간대 방문 밀도</caption>
            <thead><tr><th scope="col">요일</th>{BANDS.map((b) => <th key={b} scope="col">{b}</th>)}</tr></thead>
            <tbody>
              {DENS.map((row, r) => (
                <tr key={DAYS[r]}><th scope="row">{DAYS[r]}</th>{row.map((v, c) => <td key={c}>{v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 범례 — 옅음에서 짙음. 오른쪽은 이 데모의 주제인 농도 함수식 */}
        <div className={styles.legend}>
          <span className={styles.lgWord}>낮음</span>
          <span className={styles.lgBar} aria-hidden="true"></span>
          <span className={styles.lgWord}>높음</span>
          <span className={styles.lgExp}>0.12 + 0.88 × v / 100</span>
        </div>
      </div>
    </div>
  );
}
