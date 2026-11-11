import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PillIndicator.module.scss";

const TABS = ["전체", "이번달", "올해"];
const WIDTHS = [56, 76, 56];      // 라벨 글자 수가 다르므로 폭을 고정값으로 둔다 (함정: 라벨을 바꾸면 값도 같이 바꿔야 한다)
const GAP = 8;

export type PillIndicatorProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--x"?: string; "--scale"?: number };

export default function PillIndicator({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#0a4fe8" }: PillIndicatorProps) {
  const [active, setActive] = useState(0);
  const x = WIDTHS.slice(0, active).reduce((a, w) => a + w + GAP, 0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--x": `${x}px`, "--scale": WIDTHS[active] / WIDTHS[0] };

  return (
    <div className={styles.pi} style={vars}>
      <div className={styles.nav} role="tablist">
        <span className={styles.pill} aria-hidden="true" />
        {TABS.map((t, i) => (
          <button key={t} type="button" role="tab" aria-selected={i === active}
                  className={styles.tab} onClick={() => setActive(i)}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
