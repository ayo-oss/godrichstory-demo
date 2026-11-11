// ChartGaugeNeedle — vanilla 판(run/289/demo/09-chart-draw-gauge-needle/index.html) 의 React 포트.
// 목표 달성률을 입력하면 반원 호가 채워지고 바늘이 그 값의 각도만큼 도는 게이지.
// 사람이 포인터·입력칸을 만지면 미리보기 루프(.isDemo)가 떨어진다.
import { useState } from "react";
import styles from "./ChartGaugeNeedle.module.scss";

export type ChartGaugeNeedleProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 입력칸을 만지면 꺼진다 */
  demo?: boolean;
};

type ChgEvt = { target: { value: string } };

const SECTIONS = [
  { lo: 0, hi: 20, name: "시작 구간" },
  { lo: 20, hi: 40, name: "가속 구간" },
  { lo: 40, hi: 60, name: "중간 체크" },
  { lo: 60, hi: 80, name: "순항 구간" },
  { lo: 80, hi: 100, name: "목표 직전" }
];
const CX = 220, CY = 126, R = 88;
const VW = 440, VH = 176;
const START_V = 68;        // 미리보기가 채우는 값
const TIP_SEC = 3;         // 미리보기 툴팁이 가리키는 구간 — 60~80%

/** 값 → 바늘 회전각(도). 바늘 기본 모양이 12시라 0% 에서 -90(왼쪽 끝), 100% 에서 +90(오른쪽 끝) */
const angleFor = (v: number) => v * 1.8 - 90;
/** 값 → 반원 위의 수학 각도(도). 0% 가 180(왼쪽), 100% 가 0(오른쪽) — 회전각과 다른 값이라는 점이 함정 */
const degreeFor = (v: number) => 180 - v * 1.8;
/** 수학 각도 → viewBox 좌표. SVG 는 y 가 아래로 자라므로 sin 을 빼야 위쪽 반원이 나온다 */
function pointAt(deg: number, radius: number): [number, number] {
  const rad = deg * Math.PI / 180;
  return [CX + radius * Math.cos(rad), CY - radius * Math.sin(rad)];
}

/** 구간 호 5개의 path — 투명하지만 stroke 위에서 pointer 이벤트를 받는다 */
function hitPath(sec: { lo: number; hi: number }): string {
  const p0 = pointAt(degreeFor(sec.lo), R), p1 = pointAt(degreeFor(sec.hi), R);
  return "M" + p0[0].toFixed(1) + "," + p0[1].toFixed(1) + " A" + R + "," + R + " 0 0 1 " + p1[0].toFixed(1) + "," + p1[1].toFixed(1);
}
/** 구간 호 5개의 눈금 라벨 — 반원 둘레 바깥(반경 106)의 좌표 */
const SCALE_POS: [number, number][] = [0, 25, 50, 75, 100].map((v) => pointAt(degreeFor(v), 106));

/** 툴팁을 한 구간 위에 놓는다 — 호버와 미리보기가 같은 계산을 쓴다.
 *  반경은 호 위(R) — 더 안쪽에 두면 바늘을 가린다 */
function tipPos(sec: { lo: number; hi: number }): { left: string; top: string } {
  const mid = pointAt((degreeFor(sec.lo) + degreeFor(sec.hi)) / 2, R);
  return { left: (mid[0] / VW * 100) + "%", top: (mid[1] / VH * 100) + "%" };
}

export default function ChartGaugeNeedle({ demo = true }: ChartGaugeNeedleProps) {
  const [live, setLive] = useState(!demo);
  const [value, setValue] = useState(START_V);
  const [hotSec, setHotSec] = useState<number | null>(null);

  const v = Math.max(0, Math.min(100, value));
  const shownSec = hotSec == null ? TIP_SEC : hotSec;
  const sec = SECTIONS[shownSec];
  const rootCls = [styles.root, live ? "" : styles.isDemo].filter(Boolean).join(" ");
  return (
    <div className={rootCls}>
      <div className={styles.card}>
        <div className={styles.head}>
          <p className={styles.title}>이번 분기 목표 달성률</p>
          <span className={styles.chip}>실시간 반영</span>
        </div>
        <div className={styles.plot}>
          <svg
            className={styles.svg} viewBox={"0 0 " + VW + " " + VH} role="img"
            aria-label={"목표 달성률 반원 게이지, 현재 " + v + "%"}
          >
            {/* 눈금 라벨 5개 — 반원 둘레 바깥의 수학 각도 좌표 */}
            <g className={styles.scale}>
              {[0, 25, 50, 75, 100].map((t, i) => (
                <text key={t} x={SCALE_POS[i][0].toFixed(1)} y={SCALE_POS[i][1].toFixed(1)}>{t}</text>
              ))}
            </g>
            {/* 트랙(연한 반원) + 값 호. 둘 다 pathLength=100 이라 값% 가 곧 dashoffset */}
            <path className={styles.track} d="M132,126 A88,88 0 0 1 308,126" pathLength={100} />
            <path
              className={styles.arc} d="M132,126 A88,88 0 0 1 308,126" pathLength={100}
              strokeDasharray={100} strokeDashoffset={live ? 100 - v : undefined}
            />
            {/* 구간별 투명한 호 — hover 툴팁의 당김줄 (pointer-events: stroke) */}
            <g onPointerLeave={() => setHotSec(null)}>
              {SECTIONS.map((s, i) => (
                <path key={s.lo} className={styles.hit} d={hitPath(s)}
                  onPointerEnter={() => { setLive(true); setHotSec(i); }}
                />
              ))}
            </g>
            {/* 바늘 — 기본 모양은 12시 방향, rotate 로 각도를 잡는다. 원점은 게이지 중심 */}
            <g className={styles.needle} style={{ transform: live ? "rotate(" + angleFor(v).toFixed(1) + "deg)" : undefined }}>
              <path className={styles.pin} d="M220,126 L220,50" />
              <circle className={styles.hub} cx={220} cy={126} r={7} />
            </g>
            {/* 값 라벨 — 실사용은 입력값을, 미리보기는 두 장(0%/68%)을 컷으로 갈아 낀다 */}
            <text className={[styles.val, styles.valZero].join(" ")} x={220} y={160} aria-hidden="true">0%</text>
            <text className={[styles.val, styles.valFull].join(" ")} x={220} y={160} aria-hidden="true">{START_V}%</text>
            <text className={styles.liveVal} x={220} y={160}>{v}%</text>
          </svg>
          {/* 툴팁 — 구간 호 위에 뜬다 */}
          <div
            className={[styles.tip, hotSec == null ? "" : styles.tipIsOn].filter(Boolean).join(" ")} aria-hidden="true"
            style={tipPos(sec)}
          >
            <strong>{sec.lo}~{sec.hi}%</strong>
            <span>{sec.name}</span>
          </div>
          {/* 스크린리더용 데이터 표 — 화면에 안 보인다 */}
          <table className={styles.sr}>
            <caption>목표 달성률 구간</caption>
            <thead><tr><th scope="col">구간</th><th scope="col">의미</th></tr></thead>
            <tbody>
              {SECTIONS.map((s) => (
                <tr key={s.lo}><th scope="row">{s.lo}~{s.hi}%</th><td>{s.name}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.inputRow}>
          <label className={styles.lab} htmlFor="gauge-val">목표 달성률 입력</label>
          <input
            className={styles.input} id="gauge-val" type="number" min={0} max={100} step={1}
            value={v}
            onChange={(e: ChgEvt) => { setLive(true); setValue(Number(e.target.value) || 0); }}
          />
          <span className={styles.unit}>%</span>
        </div>
      </div>
    </div>
  );
}
