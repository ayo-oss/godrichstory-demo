// CouponStackFan — vanilla 판(run/283/demo/06-coupon-stack-fan/index.html) 의 React 포트.
// 겹친 쿠폰 세 장이 --i 순서대로 부채꼴로 펼쳐지고, 한 장을 고르면 그 장만 위로 들린다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CouponStackFan.module.scss";

export type CouponStackFanProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type CardVars = CSSProperties & { "--i"?: number };

type FanCard = {
  id: string;
  tag: string;
  /** 큰 숫자 — unit 이 있으면 작은 글씨 단위가 뒤에 붙는다 */
  amount: string;
  unit: string;
  name: string;
  message: string;
};

const CARDS: FanCard[] = [
  { id: "first", tag: "신규", amount: "10", unit: "%", name: "첫 구매 할인", message: "첫 구매 10%을 결제에 올렸어요" },
  { id: "brandday", tag: "이벤트", amount: "20", unit: "%", name: "브랜드데이 할인", message: "브랜드데이 20%을 결제에 올렸어요" },
  { id: "shipping", tag: "배송", amount: "0원", unit: "", name: "무료배송 쿠폰", message: "무료배송 쿠폰을 결제에 올렸어요" },
];

const ORDER_CLASS = [styles.card1, styles.card2, styles.card3];

export default function CouponStackFan({
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: CouponStackFanProps) {
  const [demo, setDemo] = useState(true);
  const [picked, setPicked] = useState(-1);
  const [live, setLive] = useState("호버하면 펼쳐져요");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 한 장만 눌린 상태를 유지한다 — 눌린 장을 다시 누르면 해제
  function applyPick(index: number): void {
    setDemo(false);
    const on = picked === index;
    setPicked(on ? -1 : index);
    setLive(on ? "선택을 해제했어요" : CARDS[index].message);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.stack} role="group" aria-label="보관함 쿠폰 세 장">
          {CARDS.map((card, i) => {
            const cardVars: CardVars = { ["--i" as string]: i };
            return (
              <button
                key={card.id}
                type="button"
                className={`${styles.card} ${ORDER_CLASS[i]}`}
                style={cardVars}
                aria-pressed={picked === i ? "true" : "false"}
                onClick={() => applyPick(i)}
              >
                <span className={styles.tag}>{card.tag}</span>
                <span className={styles.pct}>{card.amount}{card.unit ? <i>{card.unit}</i> : null}</span>
                <span className={styles.name}>{card.name}</span>
              </button>
            );
          })}
        </div>
        <p className={styles.live} aria-live="polite">{live}</p>
      </div>
    </main>
  );
}
