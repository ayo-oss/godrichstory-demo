import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./VerticalTabs.module.scss";

const TABS = [
  { label: "계정", panel: "이름과 이메일을 바꿉니다." },
  { label: "알림", panel: "푸시·메일 알림을 고릅니다." },
  { label: "보안", panel: "비밀번호와 2단계 인증을 관리합니다." },
];

export type VerticalTabsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--i"?: number };

export default function VerticalTabs({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#fff7e6" }: VerticalTabsProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--i": active };

  return (
    <div className={styles.vt} style={vars}>
      <div className={styles.nav} role="tablist">
        <span className={styles.indicator} aria-hidden="true" />
        {TABS.map((t, i) => (
          <button key={t.label} type="button" role="tab" aria-selected={i === active}
                  className={styles.tab} onClick={() => setActive(i)}>
            {t.label}
          </button>
        ))}
      </div>
      <p className={styles.panel}>{TABS[active].panel}</p>
    </div>
  );
}
