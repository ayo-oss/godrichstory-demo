// ConnectionStatus — vanilla 판(run/296/demo/09-ticker-connection-status/index.html) 의 React 포트.
// 시세판 머리에 붙는 상태 줄. 라이브 점이 숨 쉬고, 마지막 갱신이 몇 초 전인지 세고,
// 값이 한동안 안 오면 실시간 → 연결 끊김 → 다시 연결하는 중 → 실시간 으로 스스로 넘어간다.
// 상태는 점 색·움직임만으로 전하지 않는다 — 점 옆에 상태 글자가 늘 같이 있다.
import { useEffect, useRef, useState } from "react";
import styles from "./ConnectionStatus.module.scss";

export type ConnectionStatusProps = {
  /** 격자 미리보기용 2초 자동 루프. 포인터를 올리거나 키보드로 들어오면 꺼지고 실제 갱신이 시작된다 */
  demo?: boolean;
  /** 시드 — 같은 값이면 누가 열어도 같은 시세 흐름이 재현된다 */
  seed?: number;
  /** 값이 들어오는 간격(ms) */
  feedMs?: number;
  /** 몇 번 받고 나서 끊김을 흉내 낼지 */
  dropEvery?: number;
};

type Box<T> = { current: T };
type Phase = "live" | "lost" | "retry";
type Quote = { sym: string; base: number; price: number };

const START: Quote[] = [
  { sym: "NOVA", base: 63760, price: 64280 },
  { sym: "ORBIT", base: 18200, price: 18120 },
];

/** 시드 PRNG — 외부 API·키·네트워크가 없어도 같은 흐름이 재현된다 */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const money = (n: number) => n.toLocaleString("en-US");
const pct = (v: number) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2) + "%";
const arrow = (v: number) => (v >= 0 ? "▲" : "▼");

export default function ConnectionStatus({
  demo = true, seed = 296, feedMs = 1400, dropEvery = 5,
}: ConnectionStatusProps) {
  const randRef: Box<(() => number) | null> = useRef(null);
  if (randRef.current === null) { randRef.current = mulberry32(seed); }
  const [rows, setRows] = useState<Quote[]>(START);
  const [live, setLive] = useState(!demo);
  const [phase, setPhase] = useState<Phase>("live");
  const [lag, setLag] = useState(0);
  const lastAt = useRef(Date.now()) as Box<number>;
  const ticks = useRef(0) as Box<number>;

  useEffect(() => {
    if (!live) { return; }
    lastAt.current = Date.now();
    const feed = () => {
      setRows((old) => old.map((r) => {
        const rand = randRef.current as () => number;
        let step = Math.round((rand() - 0.48) * r.price * 0.004);
        if (step === 0) { step = rand() < 0.5 ? -1 : 1; }
        return { ...r, price: r.price + step };
      }));
      lastAt.current = Date.now();
      ticks.current += 1;
    };
    const id = window.setInterval(() => {
      // 탭이 안 보이면 세지 않는다 — 안 보이는 화면의 지연 숫자는 뜻이 없고,
      // 돌아왔을 때 밀린 갱신이 한꺼번에 터지지도 않게 한다
      if (document.visibilityState === "hidden") { return; }
      const since = Date.now() - lastAt.current;
      setPhase((p) => {
        if (p === "live") {
          // 몇 번 받고 나면 값이 안 오는 상황을 흉내 낸다 — 지연이 쌓이면 상태가 스스로 넘어간다
          if (ticks.current > 0 && ticks.current % dropEvery === 0) {
            return since > feedMs + 1200 ? "lost" : p;
          }
          if (since > feedMs) { feed(); }
          return p;
        }
        if (p === "lost") { return since > feedMs + 2800 ? "retry" : p; }
        if (since > feedMs + 4600) { feed(); return "live"; }
        return p;
      });
      setLag(Math.floor((Date.now() - lastAt.current) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [live, feedMs, dropEvery]);

  // 탭이 다시 보이면 지연을 지금부터 새로 센다 — 안 보던 동안의 초를 몰아서 보여 주지 않는다
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") { lastAt.current = Date.now(); setLag(0); }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const phaseCls = phase === "live" ? styles.isLive : phase === "lost" ? styles.isLost : styles.isRetry;
  const rootCls = [styles.root, live ? "" : styles.isDemo, phaseCls].filter(Boolean).join(" ");
  return (
    <div
      className={rootCls}
      onPointerMove={() => setLive(true)}
      onPointerDown={() => setLive(true)}
      onFocus={() => setLive(true)}
    >
      <div className={styles.board}>
        <div className={styles.bar}>
          <span className={styles.left}>
            <svg className={styles.ic} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="m96 40l33.52 88H56Zm104 88h-70.48L160 208Z" opacity=".2" /><path d="M240 128a8 8 0 0 1-8 8h-27.06l-37.78 75.58A8 8 0 0 1 160 216h-.4a8 8 0 0 1-7.08-5.14L95.35 60.76l-32.07 70.55A8 8 0 0 1 56 136H24a8 8 0 0 1 0-16h26.85l37.87-83.31a8 8 0 0 1 14.76.46l57.51 151l31.85-63.71A8 8 0 0 1 200 120h32a8 8 0 0 1 8 8" /></g></svg>
            <span className={styles.dotWrap} aria-hidden="true">
              <span className={styles.halo} />
              <span className={styles.dot} />
            </span>
            {/* 상태는 점 색·움직임만으로 전하지 않는다 — 세 장을 같은 자리에 겹쳐 두고 한 장만 보인다 */}
            <span className={styles.stateWrap}>
              <span className={`${styles.state} ${styles.stateLive}`}>실시간</span>
              <span className={`${styles.state} ${styles.stateLost}`}>연결 끊김</span>
              <span className={`${styles.state} ${styles.stateRetry}`}>
                다시 연결하는 중
                {/* 점 세 개는 말줄임표 대신 요소 셋 + opacity 애니메이션으로 만든다 */}
                <span className={styles.dots} aria-hidden="true"><i /><i /><i /></span>
              </span>
            </span>
          </span>
          <span className={styles.right}>
            <svg className={styles.ic} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="m238.2 87.69l-104 125.43a8 8 0 0 1-12.3 0L17.8 87.69a7.79 7.79 0 0 1 1.31-11.21a180.75 180.75 0 0 1 217.78 0a7.79 7.79 0 0 1 1.31 11.21" opacity=".2" /><path d="M247.89 80.91a15.93 15.93 0 0 0-6.17-10.81A186.67 186.67 0 0 0 128 32A186.67 186.67 0 0 0 14.28 70.1a15.93 15.93 0 0 0-6.17 10.81a15.65 15.65 0 0 0 3.54 11.89l104 125.43A15.93 15.93 0 0 0 128 224a15.93 15.93 0 0 0 12.31-5.77l104-125.43a15.65 15.65 0 0 0 3.58-11.89M128 208L24.09 82.74A170.76 170.76 0 0 1 128 48a170.76 170.76 0 0 1 103.91 34.74Z" /></g></svg>
            {/* 지연 숫자만 칸을 겹쳐 컷 교체한다. 단위 글자는 마크업에 두고 숫자만 갈아 끼운다 */}
            <span className={styles.lagText}><span className={styles.lagWrap}>
              <span className={`${styles.lag} ${styles.lagNow}`}>{lag}</span>
              <span className={`${styles.lag} ${styles.lagD0}`} aria-hidden="true">0</span>
              <span className={`${styles.lag} ${styles.lagD1}`} aria-hidden="true">1</span>
              <span className={`${styles.lag} ${styles.lagD2}`} aria-hidden="true">2</span>
              <span className={`${styles.lag} ${styles.lagD3}`} aria-hidden="true">3</span>
            </span>초 전 갱신</span>
          </span>
        </div>

        <p className={styles.cap}>종목 시세</p>
        <ul className={styles.rows}>
          {rows.map((r) => {
            const chg = (r.price - r.base) / r.base * 100;
            return (
              <li key={r.sym} className={styles.row}>
                <span className={styles.sym}>{r.sym}</span>
                <span className={styles.price}>{money(r.price)}</span>
                {/* 방향은 색만으로 전하지 않는다 — 화살표와 부호를 같이 적는다 */}
                <span className={`${styles.chg} ${chg >= 0 ? styles.upText : styles.downText}`}>
                  {arrow(chg)} {pct(chg)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
