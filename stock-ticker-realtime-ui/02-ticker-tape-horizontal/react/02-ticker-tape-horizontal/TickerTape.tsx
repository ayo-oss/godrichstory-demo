// TickerTape — vanilla 판(run/296/demo/02-ticker-tape-horizontal/index.html) 의 React 포트.
// 같은 줄을 두 벌 이어 붙여 translateX(-50%) 로 미는 가로 티커 테이프. 포인터·터치·키보드가 들어오면
// animation-play-state 로 테이프가 서고, 시드 PRNG 가 값을 갱신하면서 새 종목 한 칸을 오른쪽 끝에 덧붙인다.
// 간격은 트랙의 flex gap 이 아니라 칸마다의 margin-right 다 — gap 은 2N 개 사이에 2N-1 번만 생겨
// -50% 가 gap 절반만큼 모자라고 한 바퀴마다 테이프가 튄다.
import { useEffect, useRef, useState } from "react";
import styles from "./TickerTape.module.scss";

export type TickerTapeProps = {
  /** 격자 미리보기용 2초 루프. 포인터를 올리거나 키보드로 들어오면 꺼지고 실제 갱신이 시작된다 */
  demo?: boolean;
  /** 시드 — 같은 값이면 누가 열어도 같은 시세 흐름이 재현된다 */
  seed?: number;
  /** 흐름 속도(초당 px). 칸이 늘어도 이 속도를 지키려고 한 바퀴 시간을 다시 잡는다 */
  pxPerSec?: number;
  /** 값 갱신 간격(ms) */
  intervalMs?: number;
};

type Box<T> = { current: T };
type Item = { sym: string; base: number; price: number };

const START: Item[] = [
  { sym: "NOVA", base: 64200, price: 64200 },
  { sym: "ORBIT", base: 18450, price: 18450 },
  { sym: "LUMEN", base: 7320, price: 7320 },
];
const LATER = [
  { sym: "KEEL", base: 132900 },
  { sym: "AXIOM", base: 38400 },
  { sym: "VERDE", base: 9160 },
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

export default function TickerTape({ demo = true, seed = 296, pxPerSec = 45, intervalMs = 700 }: TickerTapeProps) {
  const randRef: Box<(() => number) | null> = useRef(null);
  if (randRef.current === null) { randRef.current = mulberry32(seed); }
  const [items, setItems] = useState<Item[]>(() => START.map((it) => {
    // 전일 대비 등락을 한 번 굴려 오늘 가격을 만든다 — 첫 화면부터 등락률이 0 이 아니다
    const rand = randRef.current as () => number;
    return { ...it, price: Math.round(it.base * (1 + (rand() - 0.5) * 0.06)) };
  }));
  const [live, setLive] = useState(!demo);
  const [durationS, setDurationS] = useState(10);
  const halfRef = useRef<HTMLDivElement>(null);
  const pending = useRef<Item[]>([]) as Box<Item[]>;
  const added = useRef(0) as Box<number>;
  const cursor = useRef(0) as Box<number>;
  const ticks = useRef(0) as Box<number>;

  useEffect(() => {
    if (!live) { return; }
    const id = window.setInterval(() => {
      // 탭이 안 보이는 동안은 세지 않는다 — 돌아왔을 때 밀린 갱신이 한꺼번에 터지지 않게
      if (document.visibilityState === "hidden") { return; }
      const rand = randRef.current as () => number;
      const i = cursor.current;
      setItems((old) => old.map((it, k) => {
        if (k !== i) { return it; }
        let step = Math.round((rand() - 0.48) * it.price * 0.004);
        if (step === 0) { step = rand() < 0.5 ? -1 : 1; }
        return { ...it, price: it.price + step };
      }));
      cursor.current = (i + 1) % Math.max(1, items.length);
      ticks.current += 1;
      // 새 종목은 곧바로 넣지 않고 대기줄에 세운다 — 한 바퀴가 끝나는 순간에 두 벌에 같이 들어간다
      if (ticks.current % 8 === 0 && added.current < LATER.length) {
        const s = LATER[added.current];
        added.current += 1;
        pending.current.push({ sym: s.sym, base: s.base, price: Math.round(s.base * (1 + (rand() - 0.5) * 0.06)) });
      }
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [live, intervalMs, items.length]);

  // 칸이 늘면 한 바퀴 거리가 늘어난다. 거리에 비례해 시간을 다시 잡아야 초당 흐름 속도가 그대로다
  useEffect(() => {
    const el = halfRef.current;
    if (!el) { return; }
    const w = el.getBoundingClientRect().width;
    if (w > 0) { setDurationS(Math.max(2, w / pxPerSec)); }
  }, [items.length, pxPerSec]);

  // 칸을 붙이면 흐르는 위치가 그 자리에서 튄다. 그래서 붙이는 시점을 한 바퀴가 막 끝난 순간으로 미룬다 —
  // 그 순간의 위치는 0 이라 두 벌의 폭이 바뀌어도 눈에 안 띈다. 테이프가 서 있으면 이 사건도 안 일어난다
  const onIteration = () => {
    if (!pending.current.length) { return; }
    const incoming = pending.current;
    pending.current = [];
    setItems((old) => old.concat(incoming));
  };

  const rootCls = [styles.root, live ? "" : styles.isDemo].filter(Boolean).join(" ");
  const cell = (it: Item, k: number, half: number) => {
    const chg = (it.price - it.base) / it.base * 100;
    return (
      /* 방향은 색만으로 전하지 않는다 — 화살표와 부호를 늘 같이 적는다 */
      <span className={styles.item} key={half + "-" + k} data-i={k}>
        <span className={styles.sym}>{it.sym}</span>
        <span className={styles.price}>{money(it.price)}</span>
        <span className={`${styles.chg} ${chg >= 0 ? styles.upText : styles.downText}`}>
          {arrow(chg)} {pct(chg)}
        </span>
      </span>
    );
  };

  return (
    <div
      className={rootCls}
      onPointerMove={() => setLive(true)}
      onPointerDown={() => setLive(true)}
      onFocus={() => setLive(true)}
    >
      <div className={styles.panel}>
        <div className={styles.head}>
          {/* 아이콘은 Phosphor Duotone SVG 를 그대로 인라인했다 — 색은 currentColor 로 물려받는다 */}
          <span className={styles.pulse} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
              <g fill="currentColor">
                <path d="m96 40l33.52 88H56Zm104 88h-70.48L160 208Z" opacity=".2" />
                <path d="M240 128a8 8 0 0 1-8 8h-27.06l-37.78 75.58A8 8 0 0 1 160 216h-.4a8 8 0 0 1-7.08-5.14L95.35 60.76l-32.07 70.55A8 8 0 0 1 56 136H24a8 8 0 0 1 0-16h26.85l37.87-83.31a8 8 0 0 1 14.76.46l57.51 151l31.85-63.71A8 8 0 0 1 200 120h32a8 8 0 0 1 8 8" />
              </g>
            </svg>
          </span>
          <p className={styles.title}>실시간 시세</p>
          <span className={styles.hint}>올려 두면 멈춤</span>
        </div>
        {/* 테이프 창(overflow:hidden)과 흐르는 트랙을 분리한다 — transform 은 언제나 트랙에만 건다 */}
        <div className={styles.tape} tabIndex={0} aria-label="시세 테이프">
          <div
            className={styles.track}
            style={live ? { animationDuration: durationS.toFixed(2) + "s" } : undefined}
            onAnimationIteration={onIteration}
          >
            <div className={styles.half} ref={halfRef} data-half="0">
              {items.map((it, k) => cell(it, k, 0))}
            </div>
            <div className={styles.half} data-half="1" aria-hidden="true">
              {items.map((it, k) => cell(it, k, 1))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
