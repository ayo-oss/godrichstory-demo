// ComboUpsellSheet — vanilla 판(run/298/demo/06-kiosk-combo-upsell-sheet/index.html) 의 React 포트.
// 권유 칸의 주장은 "거절 버튼을 작게 만들지 않는다" 다. 두 버튼은 같은 1fr 칸에 width:100% 로 서므로
// 어느 쪽을 고르든 손가락이 닿는 넓이가 같다. 고르고 나면 카드만 닫히고 주문 줄과 합계는 남는다.
// 닫기는 hidden 속성이고, 짝 scss 의 `.root [hidden] { display: none }` 이 UA 기본을 대신한다 —
// 그 규칙이 없으면 display 를 지정한 카드가 닫힌 뒤에도 자리를 그대로 차지한다.
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ComboUpsellSheet.module.scss";

export type ComboUpsellSheetProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

const SUM_LABEL = "합계 {n}원";
const SINGLE_LINE = "아메리카노 1개";
const COMBO_LINE = "아메리카노 세트 1개";
const SHEET_TITLE = "세트로 올릴까요";
const ITEMS_LINE = "아메리카노 + 감자튀김";
const DIFF_LABEL = "세트 차액 +1,500원";
const WON = "원";
const YES_LABEL = "세트로 담기";
const NO_LABEL = "단품 그대로";
const ROLL_STEPS = ["+300", "+600", "+900", "+1,200", "+1,500"];
const BASE = 4500;
const DIFF = 1500;

function money(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+$)/g, ",");
}

export default function ComboUpsellSheet({
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#17141a",
}: ComboUpsellSheetProps) {
  const sumRef = useRef<HTMLParagraphElement | null>(null);
  const [demo, setDemo] = useState(true);
  const [closed, setClosed] = useState(false);
  const [combo, setCombo] = useState(false);
  const [total, setTotal] = useState(BASE);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function settle(add: boolean): void {
    setDemo(false);
    setCombo(add);
    setTotal(BASE + (add ? DIFF : 0));
    setClosed(true);
    const sum = sumRef.current;
    if (sum) sum.focus({ preventScroll: true });
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <p className={styles.order}>{combo ? COMBO_LINE : SINGLE_LINE}</p>
        <div className={styles.sheet} hidden={closed}>
          <p className={styles.title}>{SHEET_TITLE}</p>
          <div className={styles.combo}>
            <span className={styles.items}>{ITEMS_LINE}</span>
            <span className={styles.diff} aria-label={DIFF_LABEL}>
              <span className={styles.odo} aria-hidden="true">
                <span className={styles.roll}>
                  {ROLL_STEPS.map((step) => (
                    <b key={step}>{step}</b>
                  ))}
                </span>
              </span>
              <b className={styles.won} aria-hidden="true">{WON}</b>
            </span>
          </div>
          <div className={styles.btns}>
            <button type="button" className={`${styles.btn} ${styles.btnYes}`} onClick={() => settle(true)}>{YES_LABEL}</button>
            <button type="button" className={`${styles.btn} ${styles.btnNo}`} onClick={() => settle(false)}>{NO_LABEL}</button>
          </div>
        </div>
        <p className={styles.sum} ref={sumRef} tabIndex={-1} aria-live="polite">
          {SUM_LABEL.replace("{n}", money(total))}
        </p>
      </div>
    </main>
  );
}
