// ChartDonutArc — vanilla 판(run/289/demo/03-chart-draw-donut-arc/index.html) 의 React 포트.
// 유입 채널 도넛 — 조각마다 실제 원호 path(M + A)를 굵은 stroke 로 그리고
// 순차 delay 로 한 조각씩 붓질한다. 조각에 올라가면 미리보기 루프가 떨어지고
// 커서를 따라다니는 툴팁이 채널과 비율을 말해 준다.
import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./ChartDonutArc.module.scss";

export type ChartDonutArcProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 조각에 올라가면 꺼진다 */
  demo?: boolean;
};

type Vars = CSSProperties & { "--d"?: string };
type PtrEvt = { clientX: number; clientY: number };
type Box<T> = { current: T | null };

const DATA: Array<[string, number]> = [["검색", 46], ["직접", 27], ["소셜", 17], ["기타", 10]];
const CX = 90, CY = 90, R = 60;
const GAP = 2 / R; // 조각 사이 2px 간격을 각도로 환산 — 크림 배경이 이 틈으로 보인다

/** 시작·끝 각도(라디안)로 원호 path 한 조각 — M 으로 붓을 대고 A 로 호를 긋는다 */
function arcPath(a0: number, a1: number) {
  const x0 = (CX + R * Math.cos(a0)).toFixed(2), y0 = (CY + R * Math.sin(a0)).toFixed(2);
  const x1 = (CX + R * Math.cos(a1)).toFixed(2), y1 = (CY + R * Math.sin(a1)).toFixed(2);
  const large = a1 - a0 > Math.PI ? 1 : 0; // 180도 넘는 호에만 큰 호 플래그
  return `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1}`;
}

/** 12시에서 시작해 시계 방향으로 채널 비율만큼씩 각도를 쓴다 */
function sliceAngles(): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let angle = -Math.PI / 2;
  for (const [, pct] of DATA) {
    const span = pct / 100 * Math.PI * 2;
    out.push([angle, angle + span]);
    angle += span;
  }
  return out;
}
const ANGLES = sliceAngles();

type Hover = { i: number; x: number; y: number } | null;

export default function ChartDonutArc({ demo = true }: ChartDonutArcProps) {
  const plotRef: Box<HTMLDivElement> = useRef(null);
  const [live, setLive] = useState(!demo);
  const [hover, setHover] = useState<Hover>(null);

  /** 조각 위 포인터 — 툴팁 내용은 채널, 위치는 plot 기준 커서 좌표.
   *  live 를 켜야 .isDemo 루프가 떨어진다 (live=false 가 미리보기 상태다) */
  function onOver(i: number, e: PtrEvt) {
    setLive(true);
    const r = plotRef.current?.getBoundingClientRect();
    if (r) setHover({ i, x: e.clientX - r.left, y: e.clientY - r.top });
  }

  const rootCls = [styles.root, live ? "" : styles.isDemo].filter(Boolean).join(" ");
  return (
    <div className={rootCls}>
      <div className={styles.card}>
        <div className={styles.head}>
          <p className={styles.title}>유입 채널</p>
          <span className={styles.chip}>최근 7일</span>
        </div>
        <div className={styles.body}>
          <div className={styles.plot} ref={plotRef}>
            <svg className={styles.svg} viewBox="0 0 180 180" role="img"
                 aria-label="유입 채널 도넛 그래프, 검색 46% 가장 많음">
              {DATA.map(([name], i) => {
                const [a0, a1] = ANGLES[i];
                return (
                  <path
                    key={name}
                    className={styles.slice}
                    d={arcPath(a0 + GAP / 2, a1 - GAP / 2)}
                    pathLength={100}
                    style={{ "--d": `${(i * .24).toFixed(2)}s` } as Vars}
                    onPointerEnter={(e: ReactPointerEvent<SVGPathElement>) => onOver(i, e)}
                    onPointerMove={(e: ReactPointerEvent<SVGPathElement>) => onOver(i, e)}
                    onPointerLeave={() => setHover(null)}
                  />
                );
              })}
              {/* 중앙 합계 라벨 */}
              <text className={styles.sumLabel} x={90} y={82}>합계</text>
              <text className={styles.sumVal} x={90} y={104}>100%</text>
            </svg>
            {/* 툴팁 — 조각 위 커서를 따라온다 */}
            <div
              className={[styles.tip, live && hover ? styles.tipIsOn : ""].filter(Boolean).join(" ")}
              aria-hidden="true"
              style={hover ? { left: `${hover.x}px`, top: `${hover.y}px` } : undefined}
            >
              <span className={styles.tipCh}>{hover ? DATA[hover.i][0] : "검색"}</span>
              <strong className={styles.tipVal}>{hover ? `${DATA[hover.i][1]}%` : "46%"}</strong>
            </div>
            {/* 스크린리더용 데이터 표 — 화면에 안 보인다 */}
            <table className={styles.sr}>
              <caption>유입 채널</caption>
              <thead><tr><th scope="col">채널</th><th scope="col">비율</th></tr></thead>
              <tbody>
                {DATA.map(([name, pct]) => (
                  <tr key={name}><th scope="row">{name}</th><td>{pct}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 범례 — 색점과 채널명과 비율을 한 줄에. 색만으로 구분하지 않는다 */}
          <ul className={styles.legend}>
            {DATA.map(([name, pct], i) => (
              <li key={name}
                  className={[styles.item, styles[`item${i + 1}` as const]].join(" ")}
                  style={{ "--d": `${(i * .24).toFixed(2)}s` } as Vars}>
                <span className={styles.dot}></span>
                <span className={styles.name}>{name}</span>
                <span className={styles.pct}>{pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
