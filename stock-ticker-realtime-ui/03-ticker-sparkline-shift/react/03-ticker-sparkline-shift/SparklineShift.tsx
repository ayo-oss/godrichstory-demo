// SparklineShift — vanilla 판(run/296/demo/03-ticker-sparkline-shift/index.html) 의 React 포트.
// 새 값이 들어오면 60칸짜리 polyline 을 통째로 다시 그리지 않고 점 하나를 끝에 붙인 뒤
// 트랙(<g>)을 한 칸(translateX)만 민다. SVG 안에서 CSS transform 의 1px 은 사용자 좌표 1칸이다.
// 창 밖으로 나간 왼쪽 점은 svg 가 viewBox 경계에서 잘라 낸다.
import { useEffect, useRef, useState } from "react";
import styles from "./SparklineShift.module.scss";

export type SparklineShiftProps = {
  /** 격자 미리보기용 2초 자동 루프. 포인터를 올리거나 키보드로 들어오면 꺼지고 실제 갱신이 시작된다 */
  demo?: boolean;
  /** 시드 — 같은 값이면 누가 열어도 같은 시세 흐름이 재현된다 */
  seed?: number;
  /** 새 값이 들어오는 간격(ms) */
  intervalMs?: number;
};

type Box<T> = { current: T };
type Label = { num: string; chg: string; up: boolean };
type Row = {
  sym: string; base: number; lo: number; hi: number; up: boolean;
  price: number; points: string; count: number; shift: number; preview: Label[];
};

const TOP = 2.4;      // viewBox(0 0 60 24) 안에서 선이 쓰는 세로 범위 — 위아래로 선 굵기만큼 비워 둔다
const BOTTOM = 21.6;

// 미리보기 데이터는 60칸 주기로 닫혀 있다(뒤에 같은 한 벌을 이어 붙였다) — 60칸을 밀면 처음과 같은 그림이라
// 2초 루프가 되돌아올 때 튀지 않는다. 실사용에서는 이 뒤로 시드 PRNG 가 만든 값이 한 칸씩 붙는다
const SERIES: Row[] = [
  {
    sym: "AXIOM", base: 37524, lo: 37637, hi: 39029, up: true, price: 38400, count: 121, shift: 0,
    points: "0,11.07 1,11.78 2,10.04 3,10.65 4,11.54 5,14.38 6,14.95 7,11.30 8,9.84 9,6.43 10,5.53 11,4.16 12,3.46 13,8.65 14,5.82 15,4.10 16,2.40 17,7.67 18,13.10 19,15.81 20,17.19 21,16.11 22,16.14 23,14.38 24,16.31 25,15.21 26,13.85 27,15.84 28,10.27 29,8.39 30,4.47 31,6.33 32,8.57 33,9.55 34,9.78 35,7.66 36,6.76 37,8.07 38,11.00 39,12.54 40,8.55 41,11.01 42,10.12 43,8.65 44,13.27 45,13.01 46,8.75 47,15.04 48,15.95 49,16.17 50,18.66 51,16.97 52,17.06 53,21.60 54,18.86 55,16.62 56,13.50 57,8.81 58,7.54 59,7.05 60,11.07 61,11.78 62,10.04 63,10.65 64,11.54 65,14.38 66,14.95 67,11.30 68,9.84 69,6.43 70,5.53 71,4.16 72,3.46 73,8.65 74,5.82 75,4.10 76,2.40 77,7.67 78,13.10 79,15.81 80,17.19 81,16.11 82,16.14 83,14.38 84,16.31 85,15.21 86,13.85 87,15.84 88,10.27 89,8.39 90,4.47 91,6.33 92,8.57 93,9.55 94,9.78 95,7.66 96,6.76 97,8.07 98,11.00 99,12.54 100,8.55 101,11.01 102,10.12 103,8.65 104,13.27 105,13.01 106,8.75 107,15.04 108,15.95 109,16.17 110,18.66 111,16.97 112,17.06 113,21.60 114,18.86 115,16.62 116,13.50 117,8.81 118,7.54 119,7.05 120,11.07",
    preview: [
      { num: "38,802", chg: "▲ +3.41%", up: true },
      { num: "37,957", chg: "▲ +1.15%", up: true },
      { num: "38,879", chg: "▲ +3.61%", up: true },
      { num: "38,583", chg: "▲ +2.82%", up: true },
      { num: "37,850", chg: "▲ +0.87%", up: true },
    ],
  },
  {
    sym: "VERDE", base: 9529, lo: 8961, hi: 9501, up: false, price: 9160, count: 121, shift: 0,
    points: "0,14.53 1,8.42 2,10.85 3,9.55 4,9.78 5,11.62 6,12.67 7,13.57 8,13.38 9,11.91 10,8.82 11,7.85 12,4.57 13,3.02 14,2.40 15,2.63 16,4.82 17,8.60 18,8.48 19,8.60 20,7.45 21,6.28 22,9.23 23,10.77 24,13.36 25,10.47 26,10.47 27,9.86 28,11.91 29,14.90 30,16.13 31,16.11 32,14.64 33,18.29 34,17.16 35,19.10 36,20.18 37,20.76 38,21.60 39,20.15 40,17.62 41,16.47 42,17.60 43,16.25 44,15.01 45,12.53 46,11.57 47,15.46 48,17.14 49,17.91 50,15.26 51,15.34 52,12.73 53,11.71 54,14.50 55,14.12 56,12.42 57,11.11 58,14.65 59,13.29 60,14.53 61,8.42 62,10.85 63,9.55 64,9.78 65,11.62 66,12.67 67,13.57 68,13.38 69,11.91 70,8.82 71,7.85 72,4.57 73,3.02 74,2.40 75,2.63 76,4.82 77,8.60 78,8.48 79,8.60 80,7.45 81,6.28 82,9.23 83,10.77 84,13.36 85,10.47 86,10.47 87,9.86 88,11.91 89,14.90 90,16.13 91,16.11 92,14.64 93,18.29 94,17.16 95,19.10 96,20.18 97,20.76 98,21.60 99,20.15 100,17.62 101,16.47 102,17.60 103,16.25 104,15.01 105,12.53 106,11.57 107,15.46 108,17.14 109,17.91 110,15.26 111,15.34 112,12.73 113,11.71 114,14.50 115,14.12 116,12.42 117,11.11 118,14.65 119,13.29 120,14.53",
    preview: [
      { num: "9,320", chg: "▼ −2.20%", up: false },
      { num: "9,359", chg: "▼ −1.79%", up: false },
      { num: "9,115", chg: "▼ −4.35%", up: false },
      { num: "9,073", chg: "▼ −4.79%", up: false },
      { num: "9,139", chg: "▼ −4.10%", up: false },
    ],
  },
  {
    sym: "PIER", base: 211392, lo: 212028, hi: 221979, up: true, price: 216500, count: 121, shift: 0,
    points: "0,12.97 1,13.98 2,12.85 3,10.41 4,6.31 5,9.03 6,10.43 7,12.27 8,12.84 9,13.05 10,15.67 11,14.96 12,17.87 13,16.58 14,18.37 15,17.60 16,16.51 17,16.62 18,17.77 19,19.30 20,21.60 21,18.09 22,16.65 23,12.44 24,11.47 25,10.58 26,11.70 27,12.10 28,15.35 29,13.05 30,10.75 31,7.35 32,4.01 33,6.10 34,11.41 35,9.58 36,8.87 37,10.86 38,12.71 39,10.80 40,6.72 41,5.60 42,6.95 43,4.96 44,2.40 45,4.87 46,3.07 47,5.06 48,4.86 49,3.65 50,3.39 51,6.54 52,5.57 53,8.54 54,6.89 55,10.95 56,11.92 57,12.85 58,14.26 59,13.67 60,12.97 61,13.98 62,12.85 63,10.41 64,6.31 65,9.03 66,10.43 67,12.27 68,12.84 69,13.05 70,15.67 71,14.96 72,17.87 73,16.58 74,18.37 75,17.60 76,16.51 77,16.62 78,17.77 79,19.30 80,21.60 81,18.09 82,16.65 83,12.44 84,11.47 85,10.58 86,11.70 87,12.10 88,15.35 89,13.05 90,10.75 91,7.35 92,4.01 93,6.10 94,11.41 95,9.58 96,8.87 97,10.86 98,12.71 99,10.80 100,6.72 101,5.60 102,6.95 103,4.96 104,2.40 105,4.87 106,3.07 107,5.06 108,4.86 109,3.65 110,3.39 111,6.54 112,5.57 113,8.54 114,6.89 115,10.95 116,11.92 117,12.85 118,14.26 119,13.67 120,12.97",
    preview: [
      { num: "215,104", chg: "▲ +1.76%", up: true },
      { num: "212,028", chg: "▲ +0.30%", up: true },
      { num: "217,653", chg: "▲ +2.96%", up: true },
      { num: "219,742", chg: "▲ +3.95%", up: true },
      { num: "221,467", chg: "▲ +4.77%", up: true },
    ],
  },
];

/** 시드 PRNG — 외부 API·키가 필요 없고 심볼도 실존 종목이 아니다 */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** 숫자는 자리가 흔들리면 읽기 어렵다 — 천 단위 구분자까지 넣어 고정 폭으로 그린다 */
const money = (n: number) => n.toLocaleString("en-US");
const pct = (v: number) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2) + "%";
const arrow = (v: number) => (v >= 0 ? "▲" : "▼");

/** 값 → viewBox 세로 좌표. 범위를 벗어나면 위아래에 붙인다(실서비스라면 여기서 눈금을 다시 잡는다) */
function toY(r: Row, p: number) {
  const t = (p - r.lo) / (r.hi - r.lo);
  return Math.max(TOP, Math.min(BOTTOM, BOTTOM - t * (BOTTOM - TOP)));
}

/** 새 값 하나 = 점 하나 + 한 칸. 60개를 다시 그리지 않는 게 이 부품의 전부다 */
function advance(r: Row, rand: () => number): Row {
  const mid = (r.lo + r.hi) / 2;
  const span = r.hi - r.lo;
  // 평균으로 조금씩 돌아오는 임의보행 — 눈금 밖으로 영영 달아나지 않는다
  const price = Math.round(r.price + (rand() - 0.5) * span * 0.22 - (r.price - mid) * 0.05);
  const next: Row = {
    ...r, price,
    points: r.points + " " + r.count + "," + toY(r, price).toFixed(2),
    count: r.count + 1,
    shift: r.shift + 1,
  };
  // 좌표는 계속 커지기만 한다. 400칸마다 한 번만 최근 61칸을 남겨 0 부터 다시 번호를 매긴다
  if (next.count > 400) {
    const pts = next.points.trim().split(/\s+/).slice(-61);
    next.points = pts.map((pt, i) => i + "," + pt.split(",")[1]).join(" ");
    next.count = pts.length;
    next.shift = 0;
  }
  return next;
}

export default function SparklineShift({ demo = true, seed = 2963, intervalMs = 600 }: SparklineShiftProps) {
  const randRef: Box<(() => number) | null> = useRef(null);
  if (randRef.current === null) { randRef.current = mulberry32(seed); }
  const [rows, setRows] = useState<Row[]>(SERIES);
  const [live, setLive] = useState(!demo);

  useEffect(() => {
    if (!live) { return; }
    const id = window.setInterval(() => {
      // 탭이 안 보이는 동안은 세지 않는다 — 돌아왔을 때 밀린 갱신이 한꺼번에 터지지 않게
      if (document.visibilityState === "hidden") { return; }
      const rand = randRef.current as () => number;
      setRows((old) => old.map((r) => advance(r, rand)));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [live, intervalMs]);

  const rootCls = [styles.root, live ? "" : styles.isDemo].filter(Boolean).join(" ");
  return (
    <div
      className={rootCls}
      onPointerMove={() => setLive(true)}
      onPointerDown={() => setLive(true)}
      onFocus={() => setLive(true)}
    >
      {/* 밝은 무대 위에 어두운 시세판을 얹는다 — 등락색은 이 표면 기준으로 대비를 잡아 둔 색이다 */}
      <div className={styles.board}>
        <div className={styles.head}>
          <p className={styles.title}>체결 추이</p>
          <span className={styles.unit}>최근 60틱</span>
        </div>
        <ul className={styles.rows}>
          {rows.map((r) => {
            const chg = (r.price - r.base) / r.base * 100;
            return (
              <li className={styles.row} key={r.sym}>
                <span className={styles.sym}>{r.sym}</span>
                <span className={styles.chart}>
                  {/* preserveAspectRatio="none" 이라 가로·세로 배율이 다르다 — non-scaling-stroke 가 없으면 선이 눌린다 */}
                  <svg className={styles.svg} viewBox="0 0 60 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                    <g className={styles.track} style={live ? { transform: "translateX(-" + r.shift + "px)" } : undefined}>
                      <polyline className={`${styles.line} ${r.up ? styles.upLine : styles.downLine}`} points={r.points} />
                    </g>
                  </svg>
                </span>
                {/* 값 여섯 장을 같은 칸에 겹친다 — 컷 교체라 자릿수가 달라도 자리가 흔들리지 않는다 */}
                <span className={styles.vals}>
                  <span className={styles.val} data-v="0">
                    <span className={styles.num}>{money(r.price)}</span>
                    {/* 방향은 색만으로 전하지 않는다 — 화살표와 부호를 늘 같이 적는다 */}
                    <span className={`${styles.chg} ${chg >= 0 ? styles.upText : styles.downText}`}>
                      {arrow(chg)} {pct(chg)}
                    </span>
                  </span>
                  {r.preview.map((p, i) => (
                    <span className={styles.val} data-v={i + 1} key={p.num + i}>
                      <span className={styles.num}>{p.num}</span>
                      <span className={`${styles.chg} ${p.up ? styles.upText : styles.downText}`}>{p.chg}</span>
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
