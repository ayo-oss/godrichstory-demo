// AlertThreshold — vanilla 판(run/296/demo/08-ticker-alert-threshold/index.html) 의 React 포트.
// 현재가와 "사용자가 정한 임계선" 이 한 카드 안에 같이 선다. 값이 그 선을 넘는 순간에만 배지가 뜨고
// 소리 없는 펄스가 한 번 퍼진다. 임계 통과는 이전 상태와 지금 상태가 선을 사이에 두고 갈릴 때만
// 발동한다 — 같은 쪽에 머무는 동안에는 값이 아무리 움직여도 다시 울리지 않는다.
// 방향은 색만으로 전하지 않는다: ▲▼ 와 +/− 부호에 더해 "넘음 / 아래" 를 글자로도 적는다.
import { useEffect, useRef, useState } from "react";
import styles from "./AlertThreshold.module.scss";

export type AlertThresholdProps = {
  /** 격자 미리보기용 2초 자동 루프. 포인터를 올리거나 키보드로 들어오면 꺼지고 실제 갱신이 시작된다 */
  demo?: boolean;
  /** 시드 — 같은 값이면 누가 열어도 같은 시세 흐름이 재현된다 */
  seed?: number;
  /** 갱신 간격(ms) */
  intervalMs?: number;
  /** 트랙(=슬라이더)의 양 끝. 가격도 임계선도 이 자를 공유한다 */
  low?: number;
  high?: number;
  /** 처음 세워 둘 임계선 */
  initialThreshold?: number;
};

type Box<T> = { current: T };
type RangeEvt = { target: { value: string } };

const BASE = 67200;        // 전일 종가 — 등락률의 기준
const START = 68420;       // 미리보기 컷의 "현재값" 과 같은 값에서 실사용이 이어진다
const STEP = 200;          // 슬라이더 눈금

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

export default function AlertThreshold({
  demo = true, seed = 296, intervalMs = 700, low = 64000, high = 72000, initialThreshold = 68000,
}: AlertThresholdProps) {
  const randRef: Box<(() => number) | null> = useRef(null);
  if (randRef.current === null) { randRef.current = mulberry32(seed); }
  const [price, setPrice] = useState(START);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [live, setLive] = useState(!demo);
  const [fireCount, setFireCount] = useState(0);
  const wasOver = useRef(null) as Box<boolean | null>;

  const over = price >= threshold;
  const chg = (price - BASE) / BASE * 100;
  // 값 하나를 트랙 위 백분율로. 양 끝에 점이 반쯤 잘리지 않게 2~98% 로 가둔다
  const posOf = (v: number) => Math.max(2, Math.min(98, (v - low) / (high - low) * 100));

  // 임계 통과는 "이전 상태와 지금 상태가 선을 사이에 두고 갈릴 때" 만 한 번 발동한다.
  // 가격이 움직여서든 사람이 선을 내려서든 판정은 똑같다
  useEffect(() => {
    if (wasOver.current === false && over) { setFireCount((c) => c + 1); }
    wasOver.current = over;
  }, [over]);

  useEffect(() => {
    if (!live) { return; }
    const id = window.setInterval(() => {
      // 탭이 안 보이는 동안은 세지 않는다 — 돌아왔을 때 밀린 갱신이 한꺼번에 터지지 않게
      if (document.visibilityState === "hidden") { return; }
      setPrice((p) => {
        const rand = randRef.current as () => number;
        let step = Math.round((rand() - 0.46) * p * 0.006);
        if (step === 0) { step = rand() < 0.5 ? -1 : 1; }
        return Math.max(low + 400, Math.min(high - 400, p + step));
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [live, intervalMs, low, high]);

  const nudge = (dir: number) => {
    setThreshold((t) => Math.max(low, Math.min(high, t + dir * STEP)));
  };

  const rootCls = [styles.root, live ? "" : styles.isDemo, over ? styles.isOver : ""].filter(Boolean).join(" ");
  return (
    <div
      className={rootCls}
      onPointerMove={() => setLive(true)}
      onPointerDown={() => setLive(true)}
      onFocus={() => setLive(true)}
    >
      <div className={styles.card}>
        <div className={styles.head}>
          <span className={styles.sym}>NOVA</span>
          <span className={styles.cap}>현재가</span>
        </div>

        <p className={styles.priceRow}>
          {/* 이전값·현재값을 같은 칸에 겹친다 — steps(1, end) 컷이라 반투명 유령이 안 생긴다 */}
          <span className={styles.priceWrap}>
            <span className={`${styles.price} ${styles.pricePrev}`}>66,940</span>
            <span className={`${styles.price} ${styles.priceNext}`}>{money(price)}</span>
          </span>
          <span className={styles.dirWrap}>
            <span className={`${styles.dir} ${styles.dirPrev} ${styles.downText}`}>▼ −0.39%</span>
            <span className={`${styles.dir} ${styles.dirNext} ${chg >= 0 ? styles.upText : styles.downText}`}>
              {arrow(chg)} {pct(chg)}
            </span>
          </span>
          <span className={styles.chipWrap}>
            <span className={`${styles.chip} ${styles.chipUnder}`}>아래</span>
            <span className={`${styles.chip} ${styles.chipOver}`}>넘음</span>
          </span>
        </p>

        <div className={styles.track}>
          <span className={styles.rail} aria-hidden="true" />
          {/* 홀더는 트랙과 같은 폭이라 translateX 의 % 가 곧 트랙 위 위치다 — 표식·점 자신에게 %를 주면
              자기 폭(2px·12px)이 기준이 돼 자를 못 쓴다 */}
          <span className={styles.lineHolder} aria-hidden="true" style={{ transform: `translateX(${posOf(threshold).toFixed(1)}%)` }}>
            <span className={styles.line} />
          </span>
          <span className={styles.dotHolder} aria-hidden="true" style={{ transform: `translateX(${posOf(price).toFixed(1)}%)` }}>
            <span className={styles.dot} />
          </span>
        </div>

        {/* 임계선은 슬라이더로도 버튼으로도 키보드로도 움직인다 */}
        <div className={styles.ctrl}>
          <span className={styles.ctrlLabel}>임계선</span>
          <button className={styles.btn} type="button" aria-label="임계선 내리기" onClick={() => nudge(-1)}>−</button>
          <input
            className={styles.range}
            type="range"
            min={low}
            max={high}
            step={STEP}
            value={threshold}
            aria-label="임계선 값"
            onChange={(e: RangeEvt) => setThreshold(Number(e.target.value))}
          />
          <button className={styles.btn} type="button" aria-label="임계선 올리기" onClick={() => nudge(1)}>+</button>
          <span className={styles.ctrlVal}>{money(threshold)}</span>
        </div>

        {/* aria-live 는 이 알림 한 줄에만 붙인다 — 갱신되는 가격 칸에 붙이면 시세 전체가 계속 읽혀 스크린리더로 못 쓴다 */}
        <p className={styles.alert} aria-live="polite">
          설정한 선 <b className={styles.alertVal}>{money(threshold)}</b>{" "}
          <span className={styles.msgWrap}>
            <span className={`${styles.msg} ${styles.msgUnder}`}>보다 낮습니다</span>
            <span className={`${styles.msg} ${styles.msgOver}`}>을 넘었습니다</span>
          </span>
        </p>

        <span className={styles.alertBox}>
          {/* key 가 바뀌면 고리가 새로 마운트돼 펄스가 처음부터 돈다 — 같은 클래스를 다시 붙이는 것과 같은 뜻 */}
          <span key={fireCount} className={`${styles.pulse} ${fireCount > 0 ? styles.pulseFired : ""}`} aria-hidden="true" />
          <span className={styles.badge}>
            <svg className={styles.bell} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12" opacity=".2" /><path d="M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z" /></g></svg>
            알림
          </span>
        </span>
      </div>
    </div>
  );
}
