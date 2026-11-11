// OrderBookDepth — vanilla 판(run/296/demo/05-ticker-orderbook-depth/index.html) 의 React 포트.
// 가운데 체결가를 두고 위는 파는 쪽, 아래는 사는 쪽. 줄마다 그 줄까지 쌓인 양을 막대로 그리고,
// 새 값이 들어올 때마다 막대 길이가 달라진다. 막대는 width 가 아니라 scaleX 라 레이아웃을 다시
// 계산하지 않고, 길이 변화는 transition 이 이어 준다.
import { useEffect, useRef, useState } from "react";
import styles from "./OrderBookDepth.module.scss";

export type OrderBookDepthProps = {
  /** 격자 미리보기용 2초 자동 루프. 포인터를 올리거나 키보드로 들어오면 꺼지고 실제 갱신이 시작된다 */
  demo?: boolean;
  /** 시드 — 같은 값이면 누가 열어도 같은 흐름이 재현된다 */
  seed?: number;
  /** 갱신 간격(ms) */
  stepMs?: number;
};

type Box<T> = { current: T };
/** 한 줄 = 그 값의 남은 수량 q 와 체결가 쪽부터 거기까지 쌓인 양 sum */
type Row = { price: number; lv: number; q: number; sum: number };
type Book = { ask: Row[]; bid: Row[]; price: number; before: number };

// 가운데에서 바깥으로 세는 순서 — 쌓인 양은 체결가에 가까운 줄부터 더해 간다
const ASK_PRICES = [18455, 18462, 18470, 18480];
const BID_PRICES = [18445, 18438, 18430, 18421];
const BEST_ASK = 18455;
const BEST_BID = 18445;
const ASK_LABEL = "매도 {n}호가";
const BID_LABEL = "매수 {n}호가";

/** 시드 PRNG — 외부 API·키가 필요 없고 심볼도 실존 종목이 아니다 */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function roll(prices: number[], rand: () => number): Row[] {
  let sum = 0;
  return prices.map((price, i) => {
    const q = 120 + Math.round(rand() * 880);
    sum += q;
    return { price, lv: i + 1, q, sum };
  });
}

const money = (n: number) => n.toLocaleString("en-US");

export default function OrderBookDepth({ demo = true, seed = 296, stepMs = 400 }: OrderBookDepthProps) {
  const randRef: Box<(() => number) | null> = useRef(null);
  if (randRef.current === null) { randRef.current = mulberry32(seed); }
  const rand = randRef.current as () => number;

  const [book, setBook] = useState<Book>(() => ({
    ask: roll(ASK_PRICES, rand), bid: roll(BID_PRICES, rand), price: 18450, before: 18448,
  }));
  const [live, setLive] = useState(!demo);

  useEffect(() => {
    if (!live) { return; }
    const id = window.setInterval(() => {
      // 탭이 안 보이는 동안은 세지 않는다 — 돌아왔을 때 밀린 갱신이 한꺼번에 터지지 않게
      if (document.visibilityState === "hidden") { return; }
      setBook((old) => ({
        ask: roll(ASK_PRICES, rand),
        bid: roll(BID_PRICES, rand),
        before: old.price,
        price: BEST_BID + Math.round(rand() * (BEST_ASK - BEST_BID)),
      }));
    }, stepMs);
    return () => window.clearInterval(id);
  }, [live, stepMs, rand]);

  let max = 0;
  book.ask.concat(book.bid).forEach((r) => { if (r.sum > max) { max = r.sum; } });
  const scale = (sum: number) => (0.16 + 0.84 * sum / max).toFixed(3);

  const up = book.price >= book.before;
  const rootCls = [styles.root, live ? "" : styles.isDemo].filter(Boolean).join(" ");

  const line = (r: Row, side: "ask" | "bid") => (
    <li key={r.price} className={styles.row} data-lv={r.lv}>
      <button
        type="button"
        className={`${styles.cell} ${side === "ask" ? styles.cellAsk : styles.cellBid}`}
        aria-label={(side === "ask" ? ASK_LABEL : BID_LABEL).replace("{n}", String(r.lv))}
      >
        <span
          className={`${styles.bar} ${side === "ask" ? styles.barAsk : styles.barBid}`}
          style={{ transform: "scaleX(" + scale(r.sum) + ")" }}
        />
        <span className={`${styles.price} ${side === "ask" ? styles.priceAsk : styles.priceBid}`}>{money(r.price)}</span>
        <span className={styles.qty}>{money(r.q)}</span>
        {/* 오른쪽 끝 숫자가 "그 줄까지 쌓인 양" 이다 — 막대 길이가 무엇을 뜻하는지 숫자로도 읽힌다 */}
        <span className={styles.cum}>{money(r.sum)}</span>
      </button>
    </li>
  );

  return (
    <div
      className={rootCls}
      onPointerMove={() => setLive(true)}
      onPointerDown={() => setLive(true)}
      onFocus={() => setLive(true)}
    >
      <div className={styles.board}>
        <div className={styles.head}>
          <p className={styles.title}>호가창</p>
          <span className={styles.sym}>ORBIT</span>
        </div>
        <div className={styles.legend}><span>호가</span><span>잔량</span><span>누적</span></div>
        {/* 위쪽은 파는 쪽. 가운데에서 멀어질수록 쌓인 양이 커진다 */}
        <ul className={styles.side}>{book.ask.slice().reverse().map((r) => line(r, "ask"))}</ul>
        <div className={styles.mid}>
          {/* 두 장을 같은 칸에 겹쳐 두고 steps(1, end) 로 컷 교체한다 — 반투명 유령 프레임이 안 생긴다 */}
          <span className={styles.nowWrap}>
            <span className={`${styles.now} ${styles.nowA} ${up ? styles.nowUp : styles.nowDown}`}>
              {up ? "▲" : "▼"} {money(book.price)}
            </span>
            <span className={`${styles.now} ${styles.nowB} ${styles.nowDown}`}>▼ 18,447</span>
          </span>
          <span className={styles.spread}>
            <span className={styles.spreadK}>스프레드</span>
            <span className={styles.spreadV}>{money(BEST_ASK - BEST_BID)}</span>
          </span>
        </div>
        {/* 아래쪽은 사는 쪽 */}
        <ul className={styles.side}>{book.bid.map((r) => line(r, "bid"))}</ul>
      </div>
    </div>
  );
}
