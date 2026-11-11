// ChartLinePath — vanilla 판(run/289/demo/01-chart-draw-line-path/index.html) 의 React 포트.
// 12개월 방문 수를 x·y 스케일 함수로 path 하나에 잇고, 진입은 stroke-dashoffset 이 좌에서 끝까지 긋는다.
// pointermove 로 가까운 달의 점·툴팁이 따라온다. 값·키프레임은 vanilla 와 같은 글자.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./ChartLinePath.module.scss";

export type ChartLinePathProps = {
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DATA = [430, 510, 620, 590, 545, 610, 660, 705, 690, 760, 842, 815];
const MON = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const PAD_L = 34, PAD_R = 432, TOP = 10, BASE = 148;
const MAX_Y = 900;

// 스케일 함수 — 데이터 값 → viewBox 좌표. 이 두 함수가 그래프의 전부다
function scaleX(i: number): number {
  return PAD_L + (PAD_R - PAD_L) * i / (DATA.length - 1);
}
function scaleY(v: number): number {
  return BASE - (BASE - TOP) * v / MAX_Y;
}

// 인접 점의 중점을 잇고 실제 점은 제어점으로 쓰는 부드러운 선
function buildPath(): string {
  const pts = DATA.map((v, i) => [scaleX(i), scaleY(v)] as [number, number]);
  let d = "M" + pts[0][0] + "," + pts[0][1];
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += " Q" + pts[i][0] + "," + pts[i][1] + " " + mx + "," + my;
  }
  const last = pts[pts.length - 1];
  d += " L" + last[0] + "," + last[1];
  return d;
}

const PATH_D = buildPath();
const AREA_D = PATH_D + " L" + PAD_R + "," + BASE + " L" + PAD_L + "," + BASE + " Z";
const PEAK_IDX = DATA.indexOf(Math.max(...DATA));

export default function ChartLinePath({ demo = false, duration, easing, color }: ChartLinePathProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [peakAt, setPeakAt] = useState(PEAK_IDX);
  const [tip, setTip] = useState({ on: false, idx: PEAK_IDX });
  const vars: Vars = {
    "--duration": duration != null ? duration + "ms" : undefined,
    "--easing": easing,
    "--color": color,
  };

  useEffect(() => {
    // 사람이 조작하면 미리보기 루프를 끊고 진짜 툴팁 경로로 들어간다
    const root = rootRef.current;
    if (!root || !demo) return;
    const stop = (e: ReactPointerEvent<SVGSVGElement>) => {
      if (root.classList.contains(styles.isDemo)) root.classList.remove(styles.isDemo);
      e.preventDefault();
    };
    const svg = root.querySelector("svg");
    // ReactPointerEvent 는 Event 와 겹치지 않아 단번에 캐스팅되지 않는다 — unknown 을 거친다
    if (svg) svg.addEventListener("pointerdown", stop as unknown as EventListener);
    return () => { if (svg) svg.removeEventListener("pointerdown", stop as unknown as EventListener); };
  }, [demo]);

  function onMove(e: ReactPointerEvent<SVGSVGElement>): void {
    if (rootRef.current?.classList.contains(styles.isDemo)) {
      rootRef.current.classList.remove(styles.isDemo);
    }
    const r = e.currentTarget.getBoundingClientRect();
    const vx = (e.clientX - r.left) / r.width * 440;
    let i = Math.round((vx - PAD_L) / ((PAD_R - PAD_L) / (DATA.length - 1)));
    i = Math.max(0, Math.min(DATA.length - 1, i));
    setPeakAt(i);
    setTip({ on: true, idx: i });
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const px = scaleX(peakAt), py = scaleY(DATA[peakAt]);

  return (
    <main className={styles.stage} style={vars}>
      <div className={cls} ref={rootRef}>
        <div className={styles.card}>
          <div className={styles.head}>
            <p className={styles.title}>월간 방문 수</p>
            <span className={styles.chip}>최근 12개월</span>
          </div>
          <div className={styles.plot}>
            <svg className={styles.svg} viewBox="0 0 440 190" role="img" aria-label="12개월 방문 수 꺾은선 그래프, 11월에 842로 가장 높음" onPointerMove={onMove} onPointerLeave={() => { setPeakAt(PEAK_IDX); setTip({ on: false, idx: PEAK_IDX }); }}>
              <g className={styles.grid}>
                <line x1="34" y1="10" x2="432" y2="10"></line>
                <line x1="34" y1="56" x2="432" y2="56"></line>
                <line x1="34" y1="102" x2="432" y2="102"></line>
                <line x1="34" y1="148" x2="432" y2="148"></line>
              </g>
              <g className={styles.ticks}>
                <text x="28" y="14">800</text>
                <text x="28" y="60">600</text>
                <text x="28" y="106">400</text>
                <text x="28" y="152">200</text>
              </g>
              <line className={styles.axis} x1="34" y1="148" x2="432" y2="148"></line>
              <g className={styles.labels}>
                {MON.map((m, i) => <text key={m} x={scaleX(i)} y="170">{m}</text>)}
              </g>
              <path className={styles.area} d={AREA_D}></path>
              <path className={styles.line} pathLength="100" d={PATH_D}></path>
              <circle className={styles.peak} r="4" cx={px} cy={py}></circle>
            </svg>
            <div className={[styles.tip, tip.on ? styles.tipOn : ""].filter(Boolean).join(" ")} aria-hidden="true">
              <span className={styles.tipMon}>{MON[tip.idx]}</span>
              <strong className={styles.tipVal}>{DATA[tip.idx].toLocaleString()}</strong>
            </div>
            <table className={styles.sr}>
              <caption>월간 방문 수</caption>
              <thead><tr><th scope="col">월</th><th scope="col">방문 수</th></tr></thead>
              <tbody>
                {DATA.map((v, i) => <tr key={MON[i]}><th scope="row">{MON[i]}</th><td>{v}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
