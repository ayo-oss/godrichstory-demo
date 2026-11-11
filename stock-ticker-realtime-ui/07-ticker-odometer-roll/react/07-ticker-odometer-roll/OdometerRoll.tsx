// OdometerRoll — vanilla 판(run/296/demo/07-ticker-odometer-roll/index.html) 의 React 포트.
// 평가손익 한 덩어리가 자릿수마다 세로로 굴러간다. 소수점 두 자리까지 굴리고, 음수가 되면 부호 칸이
// 바뀌고, 천 단위 구분자와 소수점은 굴리지 않고 제자리에 있고, 오르내림이 색 방향까지 바꾼다.
import { useEffect, useRef, useState } from "react";
import styles from "./OdometerRoll.module.scss";

export type OdometerRollProps = {
  /** 격자 미리보기용 2초 자동 루프. 포인터를 올리거나 키보드로 들어오면 꺼지고 실제 굴림이 시작된다 */
  demo?: boolean;
  /** 시드 — 같은 값이면 누가 열어도 같은 손익 흐름이 재현된다 */
  seed?: number;
  /** 갱신 간격(ms). WCAG 2.3.1 은 초당 3회 미만을 요구한다 */
  intervalMs?: number;
};

type Box<T> = { current: T };

const PREV_CLOSE = -420.10;   // 전일 손익 — 아래 줄의 「전일 대비」는 이 값과의 차다
const LIMIT = 9999.99;        // 자릿수 칸이 4+2 개라 여기까지만 걷는다
const START = -1369.25;       // 첫 화면 값 — 서버에서 그려도 판이 비지 않는다
const CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** 시드 PRNG — 외부 API·키가 필요 없다 */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** 정수 네 자리 + 소수 두 자리로 잘라 자릿수 칸에 하나씩 넣는다 */
function digitsOf(v: number): number[] {
  const s = Math.abs(v).toFixed(2);
  const dot = s.indexOf(".");
  let whole = s.slice(0, dot);
  while (whole.length < 4) { whole = "0" + whole; }
  return (whole + s.slice(dot + 1)).split("").map((c) => Number(c));
}

/** 전일 대비 — 천 단위 구분자는 정수부에만 넣는다 */
function gapText(v: number): string {
  const gap = v - PREV_CLOSE;
  const whole = Math.floor(Math.abs(gap)).toLocaleString("en-US");
  const frac = Math.abs(gap).toFixed(2).slice(-2);
  return (gap >= 0 ? "▲ +" : "▼ −") + whole + "." + frac;
}

export default function OdometerRoll({ demo = true, seed = 2967, intervalMs = 700 }: OdometerRollProps) {
  const randRef: Box<(() => number) | null> = useRef(null);
  if (randRef.current === null) { randRef.current = mulberry32(seed); }
  const [value, setValue] = useState(START);
  const [dir, setDir] = useState(0);
  const [live, setLive] = useState(!demo);

  useEffect(() => {
    if (!live) { return; }
    const id = window.setInterval(() => {
      // 탭이 안 보이는 동안은 세지 않는다 — 돌아왔을 때 밀린 갱신이 한꺼번에 터지지 않게
      if (document.visibilityState === "hidden") { return; }
      setValue((old) => {
        const rand = randRef.current as () => number;
        // 손익은 0 을 가운데 두고 걷는다 — 되돌리는 힘이 있어 한쪽 끝에 붙어 살지 않고 부호가 실제로 뒤집힌다
        let next = old + (rand() - 0.5) * 3400 - old * 0.22;
        if (next > LIMIT) { next = LIMIT; }
        if (next < -LIMIT) { next = -LIMIT; }
        setDir(next - old > 0 ? 1 : -1);
        return next;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [live, intervalMs]);

  const d = digitsOf(value);
  const gap = value - PREV_CLOSE;
  // 앞자리 0 은 흐리게 — 칸 개수는 그대로 두고 읽는 자리만 또렷하게 남긴다.
  // 정수 네 자리 중 마지막 자리는 값이 0 이어도 항상 또렷하게 둔다
  const dim = [0, 1, 2].map((i) => (d.slice(0, i + 1).every((n) => n === 0) ? ` ${styles.isLead}` : ""));
  const rootCls = [
    styles.root, live ? "" : styles.isDemo,
    dir > 0 ? styles.isUp : "", dir < 0 ? styles.isDown : "",
  ].filter(Boolean).join(" ");

  /* 굴림 위치는 자릿수 칸 자신에 올린다. @property 를 inherits: false 로 등록했으므로
     부모에 걸면 칸이 못 읽는다 — 262-08 에서 같은 함정을 실측했다 */
  const digit = (i: number, extra: string) => (
    <span className={styles.digit + extra} key={i}>
      <span className={styles.strip} data-d={i} style={{ "--d": d[i] }}>
        {CELLS.map((n) => <span className={styles.n} key={n}>{n}</span>)}
      </span>
    </span>
  );

  return (
    <div
      className={rootCls}
      onPointerMove={() => setLive(true)}
      onPointerDown={() => setLive(true)}
      onFocus={() => setLive(true)}
    >
      <div className={styles.board}>
        <p className={styles.label}>평가손익</p>
        {/* 자릿수 칸 개수는 고정이다 — 값이 커지거나 작아져도 판이 좌우로 안 튄다 */}
        <p className={styles.value}>
          <span className={styles.sign}>
            <span className={`${styles.glyph} ${styles.glyphA}`}>{value < 0 ? "−" : "+"}</span>
            <span className={`${styles.glyph} ${styles.glyphB}`}>+</span>
          </span>
          {digit(0, dim[0])}
          {/* 구분자와 소수점은 굴리지 않고 제자리에 박혀 있다 — 앞 묶음이 비면 같이 흐려진다 */}
          <span className={styles.fixed + dim[0]}>,</span>
          {digit(1, dim[1])}
          {digit(2, dim[2])}
          {digit(3, "")}
          <span className={styles.fixed}>.</span>
          {digit(4, "")}
          {digit(5, "")}
          <span className={styles.unit}>원</span>
        </p>
        <p className={styles.delta}>
          <span className={styles.deltaLabel}>전일 대비</span>
          {/* 두 장을 같은 칸에 겹친다 — 컷 교체라 자릿수가 늘어도 줄이 안 흔들린다 */}
          <span className={styles.deltaWrap}>
            <span className={`${styles.deltaText} ${styles.deltaA} ${gap >= 0 ? styles.isPlus : styles.isMinus}`}>
              {gapText(value)}
            </span>
            <span className={`${styles.deltaText} ${styles.deltaB}`}>▲ +3,196.75</span>
          </span>
          <span className={styles.unit}>원</span>
        </p>
      </div>
    </div>
  );
}
