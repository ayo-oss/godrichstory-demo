// PriceFlashCell — vanilla 판(run/296/demo/01-ticker-price-flash-cell/index.html) 의 React 포트.
// 관심 종목 시세판. 시드 PRNG 가 900ms 마다 한 행씩 값을 바꾸고, 바뀐 행의 배경이 한 프레임에
// 켜졌다가 스스로 꺼진다. 방향은 색만으로 전하지 않고 화살표(▲▼)와 부호를 같이 적는다.
import { useEffect, useRef, useState } from "react";
import styles from "./PriceFlashCell.module.scss";

export type PriceFlashCellProps = {
  /** 격자 미리보기용 2초 자동 루프. 포인터를 올리거나 키보드로 들어오면 꺼지고 실제 갱신이 시작된다 */
  demo?: boolean;
  /** 시드 — 같은 값이면 누가 열어도 같은 시세 흐름이 재현된다 */
  seed?: number;
  /** 갱신 간격(ms). WCAG 2.3.1 은 초당 3회 미만을 요구한다 */
  intervalMs?: number;
};

type Box<T> = { current: T };
type Row = { sym: string; base: number; price: number; chg: number; prev: number; prevChg: number; dir: number };

const SYMBOLS = ["NOVA", "ORBIT", "LUMEN", "KEEL"];
const BASE = [64200, 18450, 7320, 132900];   // 전일 종가 4종 — 등락률의 기준

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

function initialRows(rand: () => number): Row[] {
  return SYMBOLS.map((sym, i) => {
    // 전일 대비 등락을 먼저 한 번 굴려 오늘 가격을 만든다. 그래야 첫 화면부터 등락률이 0 이 아니다
    const day = (rand() - 0.55) * 0.055;
    const now = Math.round(BASE[i] * (1 + day));
    const chg = (now - BASE[i]) / BASE[i] * 100;
    return { sym, base: BASE[i], price: now, chg, prev: BASE[i], prevChg: 0, dir: 0 };
  });
}

export default function PriceFlashCell({ demo = true, seed = 296, intervalMs = 900 }: PriceFlashCellProps) {
  const randRef: Box<(() => number) | null> = useRef(null);
  if (randRef.current === null) { randRef.current = mulberry32(seed); }
  const [rows, setRows] = useState<Row[]>(() => initialRows(randRef.current as () => number));
  const [live, setLive] = useState(!demo);
  const cursor = useRef(0) as Box<number>;

  useEffect(() => {
    if (!live) { return; }
    const id = window.setInterval(() => {
      // 탭이 안 보이는 동안은 세지 않는다 — 돌아왔을 때 밀린 갱신이 한꺼번에 터지지 않게
      if (document.visibilityState === "hidden") { return; }
      const i = cursor.current;
      cursor.current = (i + 1) % SYMBOLS.length;
      setRows((old) => old.map((r, k) => {
        if (k !== i) { return { ...r, dir: 0 }; }
        const rand = randRef.current as () => number;
        let step = Math.round((rand() - 0.48) * r.price * 0.004);
        if (step === 0) { step = rand() < 0.5 ? -1 : 1; }
        const price = r.price + step;
        return { ...r, prev: r.price, prevChg: r.chg, price, chg: (price - r.base) / r.base * 100, dir: step >= 0 ? 1 : -1 };
      }));
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
      <div className={styles.board}>
        <div className={styles.head}>
          <p className={styles.title}>관심 종목</p>
          <span className={styles.liveTag}>실시간</span>
        </div>
        <ul className={styles.rows}>
          {rows.map((r, i) => (
            /* 행마다 이전값·현재값 두 장을 같은 칸에 겹친다 — steps(1, end) 컷이라 반투명 유령이 안 생긴다 */
            <li
              key={r.sym}
              className={[styles.row, r.dir > 0 ? styles.isUp : "", r.dir < 0 ? styles.isDown : ""].filter(Boolean).join(" ")}
              data-row={i}
            >
              <span className={styles.sym}>{r.sym}</span>
              <span className={styles.priceWrap}>
                <span className={`${styles.price} ${styles.pricePrev}`}>{money(r.prev)}</span>
                <span className={`${styles.price} ${styles.priceNext}`}>{money(r.price)}</span>
              </span>
              <span className={styles.chgWrap}>
                <span className={`${styles.chg} ${styles.chgPrev} ${r.prevChg >= 0 ? styles.upText : styles.downText}`}>
                  {arrow(r.prevChg)} {pct(r.prevChg)}
                </span>
                <span className={`${styles.chg} ${styles.chgNext} ${r.chg >= 0 ? styles.upText : styles.downText}`}>
                  {arrow(r.chg)} {pct(r.chg)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
