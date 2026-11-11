import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CartCouponDiscountLine.module.scss";

export type CartCouponDiscountLineProps = {
  title?: string;
  itemsLabel?: string;
  /** 상품 금액 글자 그대로 — 금액 서식(통화 기호·자릿점)을 여기서 뽑아 쓴다 */
  itemsValue?: string;
  discountLabel?: string;
  discountValue?: string;
  totalLabel?: string;
  codeLabel?: string;
  applyLabel?: string;
  groupLabel?: string;
  validCode?: string;
  okText?: string;
  emptyText?: string;
  wrongText?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 입력 이벤트 제네릭을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type ChangeEvt = { target: { value: string } };
type SubmitEvt = { preventDefault: () => void };

function comma(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+$)/g, ",");
}
function amount(text: string): number {
  return Number(text.replace(/[^\d]/g, ""));
}
// 금액 서식은 상품 금액 글자를 그대로 본떠 만든다 — 언어팩이 바꿔 둔 통화 표기를 따라간다
function money(source: string, n: number): string {
  return source.replace(/[\d,]+/, comma(n));
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 256 256" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M200,128a32,32,0,0,0,32,32v32a8,8,0,0,1-8,8H96V56H224a8,8,0,0,1,8,8V96A32,32,0,0,0,200,128Z" opacity="0.2"/><path d="M232,104a8,8,0,0,0,8-8V64a16,16,0,0,0-16-16H32A16,16,0,0,0,16,64V96a8,8,0,0,0,8,8,24,24,0,0,1,0,48,8,8,0,0,0-8,8v32a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V160a8,8,0,0,0-8-8,24,24,0,0,1,0-48ZM32,167.2a40,40,0,0,0,0-78.4V64H88V192H32Zm192,0V192H104V64H224V88.8a40,40,0,0,0,0,78.4Z"/></svg>
  );
}

export default function CartCouponDiscountLine({
  title = "주문 요약",
  itemsLabel = "상품 금액",
  itemsValue = "32,000원",
  discountLabel = "쿠폰 할인",
  discountValue = "-3,000원",
  totalLabel = "합계",
  codeLabel = "쿠폰 코드",
  applyLabel = "적용",
  groupLabel = "쿠폰 코드와 주문 요약",
  validCode = "SAVE3000",
  okText = "쿠폰이 적용됐어요",
  emptyText = "쿠폰 코드를 입력해 주세요",
  wrongText = "없는 코드예요",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: CartCouponDiscountLineProps) {
  const [code, setCode] = useState("");
  const [on, setOn] = useState(false);
  const [message, setMessage] = useState("");
  const [live, setLive] = useState(demo);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const items = amount(itemsValue);
  const off = amount(discountValue);
  const total = money(itemsValue, on ? items - off : items);
  // 미리보기 루프가 컷으로 갈아 끼우는 두 번째 값 — 할인이 붙었을 때의 합계
  const altTotal = money(itemsValue, items - off);

  // 적용을 누르면 할인 줄이 0fr 에서 1fr 로 펴지고 합계가 같은 순간에 다시 계산된다
  function apply(e: SubmitEvt) {
    e.preventDefault();
    setLive(false);
    const typed = code.trim().toUpperCase();
    const hit = typed === validCode;
    setOn(hit);
    setMessage(hit ? okText : typed ? wrongText : emptyText);
  }

  const cls = [styles.cp, live ? styles.isDemo : "", on ? styles.isOn : "", message ? styles.isSaid : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <p className={styles.title}>{title}</p>
      <div className={styles.sum}>
        <p className={styles.line}>
          <span className={styles.k}>{itemsLabel}</span>
          <span className={styles.v}>{itemsValue}</span>
        </p>
        <div className={styles.disc}>
          <div className={styles.box}>
            <p className={`${styles.line} ${styles.lineDisc}`}>
              <span className={styles.k}><TicketIcon />{discountLabel}</span>
              <span className={`${styles.v} ${styles.vOff}`}>{discountValue}</span>
            </p>
          </div>
        </div>
        <p className={`${styles.line} ${styles.lineTotal}`}>
          <span className={styles.k}>{totalLabel}</span>
          <span className={`${styles.v} ${styles.vTotal} ${styles.swap}`}>
            <span className={styles.t}>{total}</span>
            {live ? <span className={styles.alt} aria-hidden="true">{altTotal}</span> : null}
          </span>
        </p>
      </div>
      <form className={styles.form} onSubmit={apply}>
        <span className={styles.field}>
          <input
            className={styles.code}
            type="text"
            value={code}
            onChange={(e: ChangeEvt) => setCode(e.target.value)}
            placeholder={codeLabel}
            aria-label={codeLabel}
            autoComplete="off"
          />
          {live ? <span className={styles.ghost} aria-hidden="true">{validCode}</span> : null}
        </span>
        <button className={styles.go} type="submit">{applyLabel}</button>
      </form>
      <p className={styles.msg} aria-live="polite">
        <span className={styles.msgText}>{message}</span>
        {live ? <span className={styles.msgDemo} aria-hidden="true">{okText}</span> : null}
      </p>
    </section>
  );
}
