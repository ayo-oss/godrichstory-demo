import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShipSpeedEtaSwap.module.scss";

export type ShipSpeedEtaSwapProps = {
  title?: string;
  /** 배송 방법 이름 — 도착 예정일·배송비와 같은 순서 */
  speeds?: string[];
  dates?: string[];
  fees?: string[];
  /** 고른 결과를 한 문장으로 읽어 주는 문구 (aria-live) */
  summaries?: string[];
  etaLabel?: string;
  feeLabel?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--i"?: number;
};
// ambient 가 얇아 DOM 이벤트 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type ChangeEvt = { target: { value: string } };

function TruckIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M248,120v64a8,8,0,0,1-8,8H216a24,24,0,0,0-48,0H104a24,24,0,0,0-48,0H32a8,8,0,0,1-8-8V144H184V120Z" opacity="0.2"/><path d="M255.42,117l-14-35A15.93,15.93,0,0,0,226.58,72H192V64a8,8,0,0,0-8-8H32A16,16,0,0,0,16,72V184a16,16,0,0,0,16,16H49a32,32,0,0,0,62,0h50a32,32,0,0,0,62,0h17a16,16,0,0,0,16-16V120A7.94,7.94,0,0,0,255.42,117ZM192,88h34.58l9.6,24H192ZM32,72H176v64H32ZM80,208a16,16,0,1,1,16-16A16,16,0,0,1,80,208Zm81-24H111a32,32,0,0,0-62,0H32V152H176v12.31A32.11,32.11,0,0,0,161,184Zm31,24a16,16,0,1,1,16-16A16,16,0,0,1,192,208Zm48-24H223a32.06,32.06,0,0,0-31-24V128h48Z"/></svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"/><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z"/></svg>
  );
}

export default function ShipSpeedEtaSwap({
  title = "배송 방법",
  speeds = ["일반", "빠른", "새벽"],
  dates = ["9월 17일 (목)", "9월 14일 (월)", "9월 13일 (일)"],
  fees = ["3,000원", "5,000원", "7,000원"],
  summaries = [
    "9월 17일 (목) 도착 · 배송비 3,000원",
    "9월 14일 (월) 도착 · 배송비 5,000원",
    "9월 13일 (일) 도착 · 배송비 7,000원",
  ],
  etaLabel = "도착 예정",
  feeLabel = "배송비",
  groupLabel = "배송 방법 고르기",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: ShipSpeedEtaSwapProps) {
  const [index, setIndex] = useState(0);
  const [live, setLive] = useState(demo);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--i": index };
  const cls = [styles.sp, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  // 빠를수록 도착 칩 바탕이 진해진다 — 날짜가 자리를 잡은 순간이 한눈에 보이게
  const tint = index === 1 ? styles.tint1 : index === 2 ? styles.tint2 : "";

  function pick(event: ChangeEvt) {
    setLive(false);
    setIndex(Number(event.target.value));
  }

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.head}>
        <span className={styles.ic} aria-hidden="true"><TruckIcon /></span>
        <h2 className={styles.title}>{title}</h2>
      </header>

      <div className={styles.opts}>
        <span className={styles.thumb} aria-hidden="true" />
        {speeds.map((name, n) => (
          <label className={styles.opt} key={name}>
            <input
              className={styles.radio}
              type="radio"
              name="speed"
              value={String(n)}
              checked={index === n}
              onChange={pick}
            />
            <span className={styles.pill}>{name}</span>
          </label>
        ))}
      </div>

      <p className={`${styles.line} ${styles.eta} ${tint}`}>
        <span className={`${styles.ic} ${styles.icSm}`} aria-hidden="true"><ClockIcon /></span>
        <span className={styles.label}>{etaLabel}</span>
        <span className={styles.win} aria-hidden="true">
          <span className={styles.roll}>
            {dates.map((date) => <span className={styles.cell} key={date}>{date}</span>)}
          </span>
        </span>
      </p>

      <p className={`${styles.line} ${styles.lineFee}`}>
        <span className={styles.label}>{feeLabel}</span>
        <span className={styles.win} aria-hidden="true">
          <span className={styles.roll}>
            {fees.map((fee) => <span className={`${styles.cell} ${styles.cellFee}`} key={fee}>{fee}</span>)}
          </span>
        </span>
      </p>

      <p className={styles.srOnly} aria-live="polite">{live ? "" : summaries[index]}</p>
    </section>
  );
}
