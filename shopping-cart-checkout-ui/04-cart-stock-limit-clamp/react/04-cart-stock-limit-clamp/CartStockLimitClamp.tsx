import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CartStockLimitClamp.module.scss";

export type CartStockLimitClampProps = {
  kicker?: string;
  productName?: string;
  price?: string;
  stockLeft?: string;
  warning?: string;
  qtyLabel?: string;
  minusLabel?: string;
  plusLabel?: string;
  groupLabel?: string;
  /** 남은 재고 — 이 수를 넘는 입력은 최대치로 되튕긴다 */
  stock?: number;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 DOM 요소·이벤트 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type InputChange = { target: { value: string } };
type TimerBox = { current: number | null };

function WarningIcon() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M215.46,216H40.54C27.92,216,20,202.79,26.13,192.09L113.59,40.22c6.3-11,22.52-11,28.82,0l87.46,151.87C236,202.79,228.08,216,215.46,216Z" opacity="0.2"/><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"/></svg>
  );
}

export default function CartStockLimitClamp({
  kicker = "장바구니",
  productName = "겨울 니트 아이보리",
  price = "64,000원",
  stockLeft = "재고 4개",
  warning = "남은 수량 4개",
  qtyLabel = "수량",
  minusLabel = "수량 줄이기",
  plusLabel = "수량 늘리기",
  groupLabel = "재고 한도 수량 입력",
  stock = 4,
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#c2361a",
}: CartStockLimitClampProps) {
  const [qty, setQty] = useState(stock);
  const [over, setOver] = useState(false);
  const [live, setLive] = useState(demo);
  const timer: TimerBox = useRef<number>(0);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 재고보다 큰 수는 최대치로 되돌리고 경고 띠를 잠시 내린다
  function clampQty(wanted: number) {
    setLive(false);
    const tooMany = wanted > stock;
    setQty(Math.max(1, Math.min(stock, wanted)));
    setOver(tooMany);
    if (timer.current) clearTimeout(timer.current);
    if (tooMany) timer.current = setTimeout(() => setOver(false), 1600);
  }

  function onType(e: InputChange) {
    if (e.target.value === "") return;          // 지우는 중에는 되튕기지 않는다
    clampQty(Number(e.target.value));
  }

  const cls = [styles.cs, live ? styles.isDemo : "", over ? styles.isOver : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <p className={styles.kicker}>{kicker}</p>
      <div className={styles.band}>
        {/* 경고 띠: 줄 위로 내려와 남은 개수를 말한다 */}
        <p className={styles.strip} role="alert">
          <WarningIcon />
          <span>{warning}</span>
        </p>
        <div className={styles.row}>
          <span className={styles.thumb} aria-hidden="true"></span>
          <span className={styles.info}>
            <b className={styles.name}>{productName}</b>
            <span className={styles.price}>{price}</span>
          </span>
        </div>
      </div>
      <div className={styles.qty}>
        <span className={styles.left}>{stockLeft}</span>
        <span className={styles.step}>
          <button className={styles.btn} type="button" onClick={() => clampQty(qty - 1)} aria-label={minusLabel}>−</button>
          <span className={styles.num}>
            <input
              className={styles.input}
              type="number"
              inputMode="numeric"
              value={qty}
              min={1}
              max={stock}
              onChange={onType}
              aria-label={qtyLabel}
            />
            {/* 미리보기 전용: 재고를 넘겨 넣은 값. 손으로 쓰는 정적 상태에서는 투명하게 비켜 있고 자리만 지킨다 */}
            <b className={styles.over} aria-hidden="true">{stock + 2}</b>
          </span>
          <button className={styles.btn} type="button" onClick={() => clampQty(qty + 1)} aria-label={plusLabel}>+</button>
        </span>
      </div>
    </section>
  );
}
