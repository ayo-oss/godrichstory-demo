import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CheckoutStickyTotalBar.module.scss";

export type CheckoutLine = { name: string; price: string };

export type CheckoutStickyTotalBarProps = {
  title?: string;
  lines?: CheckoutLine[];
  summaryLabel?: string;
  itemsLabel?: string;
  itemsTotal?: string;
  shippingLabel?: string;
  shippingFee?: string;
  totalLabel?: string;
  total?: string;
  payLabel?: string;
  groupLabel?: string;
  bodyLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 스크롤하면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 관찰자에 넘길 만큼만 로컬 타입으로 선언
type Box = { scrollTop: number };

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M224,56V208l-32-16-32,16-32-16L96,208,64,192,32,208V56a8,8,0,0,1,8-8H216A8,8,0,0,1,224,56Z" opacity="0.2"/><path d="M72,104a8,8,0,0,1,8-8h96a8,8,0,0,1,0,16H80A8,8,0,0,1,72,104Zm8,40h96a8,8,0,0,0,0-16H80a8,8,0,0,0,0,16ZM232,56V208a8,8,0,0,1-11.58,7.15L192,200.94l-28.42,14.21a8,8,0,0,1-7.16,0L128,200.94,99.58,215.15a8,8,0,0,1-7.16,0L64,200.94,35.58,215.15A8,8,0,0,1,24,208V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Zm-16,0H40V195.06l20.42-10.22a8,8,0,0,1,7.16,0L96,199.06l28.42-14.22a8,8,0,0,1,7.16,0L160,199.06l28.42-14.22a8,8,0,0,1,7.16,0L216,195.06Z"/></svg>
  );
}

function CreditCardIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M232,96v96a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V96Z" opacity="0.2"/><path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,16V88H32V64Zm0,128H32V104H224v88Zm-16-24a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h32A8,8,0,0,1,208,168Zm-64,0a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h16A8,8,0,0,1,144,168Z"/></svg>
  );
}

export default function CheckoutStickyTotalBar({
  title = "주문서",
  lines = [
    { name: "머그컵 2개", price: "24,000원" },
    { name: "티셔츠 1벌", price: "19,000원" },
    { name: "에코백 1개", price: "9,000원" },
    { name: "양말 3켤레", price: "6,000원" },
  ],
  summaryLabel = "주문 요약",
  itemsLabel = "상품 금액",
  itemsTotal = "58,000원",
  shippingLabel = "배송비",
  shippingFee = "3,000원",
  totalLabel = "총 결제 금액",
  total = "61,000원",
  payLabel = "결제하기",
  groupLabel = "주문서와 하단 결제 바",
  bodyLabel = "주문서",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CheckoutStickyTotalBarProps) {
  const [down, setDown] = useState(false);
  const [live, setLive] = useState(demo);
  const viewRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // 「보이는가」 는 스크롤 좌표 계산이 아니라 관찰자가 판정한다 — root 는 주문서 스크롤 상자
  useEffect(() => {
    const view = viewRef.current;
    const summary = summaryRef.current;
    if (!view || !summary) return;
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setDown(entry.isIntersecting);
      },
      { root: view, threshold: 0.45 },
    );
    watcher.observe(summary);
    return () => watcher.disconnect();
  }, []);

  // 관찰자는 붙자마자 한 번 알려 주므로, 미리보기 루프는 사람이 실제로 스크롤할 때만 끈다
  function onScroll() {
    const view: Box | null = viewRef.current;
    if (!view) return;
    setLive(false);
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.co, live ? styles.isDemo : "", down ? styles.isDown : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <div className={styles.view} ref={viewRef} onScroll={onScroll} tabIndex={0} role="region" aria-label={bodyLabel}>
        <div className={styles.pad}>
          <p className={styles.title}>{title}</p>

          {lines.map((line) => (
            <div className={styles.item} key={line.name}>
              <span className={styles.thumb} aria-hidden="true" />
              <span className={styles.name}>{line.name}</span>
              <span className={styles.price}>{line.price}</span>
            </div>
          ))}

          <div className={styles.sum} ref={summaryRef}>
            <p className={styles.sumHead}>
              <span className={styles.ic} aria-hidden="true"><ReceiptIcon /></span>
              {summaryLabel}
            </p>
            <p className={styles.row}><span>{itemsLabel}</span><span>{itemsTotal}</span></p>
            <p className={styles.row}><span>{shippingLabel}</span><span>{shippingFee}</span></p>
            <p className={`${styles.row} ${styles.rowTotal}`}><span>{totalLabel}</span><span>{total}</span></p>
          </div>
        </div>
      </div>

      <div className={styles.bar}>
        <span className={styles.barTotal}>{total}</span>
        <button className={styles.pay} type="button">
          <span className={styles.ic} aria-hidden="true"><CreditCardIcon /></span>
          {payLabel}
        </button>
      </div>
    </section>
  );
}
