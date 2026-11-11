import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CartQtySubtotalSync.module.scss";

export type CartQtyLine = {
  id: string;
  name: string;
  /** 단가 글자 그대로 — 금액 서식(통화 기호·자릿점)을 여기서 뽑아 쓴다 */
  unit: string;
  qty: number;
  downLabel: string;
  upLabel: string;
};

export type CartQtySubtotalSyncProps = {
  title?: string;
  hint?: string;
  totalLabel?: string;
  groupLabel?: string;
  lines?: CartQtyLine[];
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_LINES: CartQtyLine[] = [
  { id: "tee", name: "기본 티셔츠", unit: "12,000원", qty: 2, downLabel: "기본 티셔츠 수량 줄이기", upLabel: "기본 티셔츠 수량 늘리기" },
  { id: "socks", name: "무지 양말", unit: "4,000원", qty: 1, downLabel: "무지 양말 수량 줄이기", upLabel: "무지 양말 수량 늘리기" },
];

function comma(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+$)/g, ",");
}
function amount(text: string): number {
  return Number(text.replace(/[^\d]/g, ""));
}
// 금액 서식은 단가 글자를 그대로 본떠 만든다 — 언어팩이 바꿔 둔 통화 표기를 따라간다
function money(unit: string, n: number): string {
  return unit.replace(/[\d,]+/, comma(n));
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 256 256" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z" opacity="0.2"/><path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z"/></svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 256 256" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z" opacity="0.2"/><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/></svg>
  );
}

export default function CartQtySubtotalSync({
  title = "장바구니",
  hint = "수량을 눌러 보세요",
  totalLabel = "합계",
  groupLabel = "장바구니 수량과 합계",
  lines = DEFAULT_LINES,
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: CartQtySubtotalSyncProps) {
  const [qty, setQty] = useState<number[]>(lines.map((l) => l.qty));
  const [hot, setHot] = useState<string[]>([]);
  const [live, setLive] = useState(demo);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const grand = lines.reduce((sum, l, i) => sum + qty[i] * amount(l.unit), 0);

  // 미리보기 루프가 컷으로 갈아 끼우는 두 번째 값 — 첫 줄 수량이 하나 늘었을 때의 숫자
  const altQty = lines[0].qty + 1;
  const altGrand = lines.reduce((sum, l, i) => sum + (i === 0 ? altQty : l.qty) * amount(l.unit), 0);

  // 수량·소계·합계를 같은 순간에 다시 계산하고, 바뀐 숫자 칸 두 곳만 배경을 한 번 켠다
  function bump(index: number, step: number) {
    setLive(false);
    setQty((prev: number[]) => prev.map((q, k) => (k === index ? Math.min(9, Math.max(1, q + step)) : q)));
    setHot([lines[index].id, "grand"]);
    setTimeout(() => setHot([]), 80);
  }

  const cls = [styles.qs, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  const grandCls = [styles.sum, styles.grand, styles.swap, hot.indexOf("grand") >= 0 ? styles.isHot : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.head}>
        <p className={styles.title}>{title}</p>
        <p className={styles.hint}>{hint}</p>
      </header>
      <ul className={styles.list}>
        {lines.map((line, i) => {
          const swap = i === 0;
          const sumCls = [styles.sum, swap ? styles.swap : "", hot.indexOf(line.id) >= 0 ? styles.isHot : ""].filter(Boolean).join(" ");
          return (
            <li className={styles.row} key={line.id}>
              <span className={styles.info}>
                <span className={styles.name}>{line.name}</span>
                <span className={styles.unit}>{line.unit}</span>
              </span>
              <span className={styles.step}>
                <button className={`${styles.btn} ${styles.btnDown}`} type="button" onClick={() => bump(i, -1)} aria-label={line.downLabel}><MinusIcon /></button>
                <output className={`${styles.qty} ${swap ? styles.swap : ""}`}>
                  <span className={styles.value}>{qty[i]}</span>
                  {swap && live ? <span className={styles.alt} aria-hidden="true">{altQty}</span> : null}
                </output>
                <button className={`${styles.btn} ${styles.btnUp}`} type="button" onClick={() => bump(i, 1)} aria-label={line.upLabel}><PlusIcon /></button>
              </span>
              <span className={sumCls}>
                <span className={styles.value}>{money(line.unit, qty[i] * amount(line.unit))}</span>
                {swap && live ? <span className={styles.alt} aria-hidden="true">{money(line.unit, altQty * amount(line.unit))}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      <p className={styles.total}>
        <span className={styles.tlabel}>{totalLabel}</span>
        <output className={grandCls}>
          <span className={styles.value}>{money(lines[0].unit, grand)}</span>
          {live ? <span className={styles.alt} aria-hidden="true">{money(lines[0].unit, altGrand)}</span> : null}
        </output>
      </p>
    </section>
  );
}
