import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UnderlineSlide.module.scss";

const TABS = [
  { label: "개요", panel: "오늘 방문자와 핵심 지표를 한눈에 봅니다." },
  { label: "분석", panel: "기간별 추이를 표와 그래프로 비교합니다." },
  { label: "설정", panel: "알림과 팀 권한을 이 탭에서 관리합니다." },
];

export type UnderlineSlideProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--i"?: number };

export default function UnderlineSlide({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: UnderlineSlideProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--i": active };

  return (
    <div className={styles.us} style={vars}>
      <div className={styles.nav} role="tablist">
        {TABS.map((t, i) => (
          <button key={t.label} type="button" role="tab" aria-selected={i === active}
                  className={styles.tab} onClick={() => setActive(i)}>
            {t.label}
          </button>
        ))}
        <span className={styles.indicator} aria-hidden="true" />
      </div>
      <p className={styles.panel}>{TABS[active].panel}</p>
    </div>
  );
}
