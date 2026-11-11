import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SlidePanel.module.scss";

const TABS = [
  { label: "1단계", panel: "배송지를 입력합니다." },
  { label: "2단계", panel: "결제 수단을 고릅니다." },
  { label: "3단계", panel: "주문을 확인하고 완료합니다." },
];

export type SlidePanelProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--i"?: number };

export default function SlidePanel({ duration = 300, easing = "ease-out", color = "#2f6df6" }: SlidePanelProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--i": active };

  return (
    <div className={styles.sp} style={vars}>
      <div className={styles.nav} role="tablist">
        {TABS.map((t, i) => (
          <button key={t.label} type="button" role="tab" aria-selected={i === active}
                  className={styles.tab} onClick={() => setActive(i)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className={styles.viewport}>
        <div className={styles.track}>
          {TABS.map((t) => <p key={t.label} className={styles.panel}>{t.panel}</p>)}
        </div>
      </div>
    </div>
  );
}
