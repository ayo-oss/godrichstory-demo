import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FadePanel.module.scss";

const TABS = [
  { label: "소개", panel: "소재·사이즈·세탁법을 정리했습니다." },
  { label: "리뷰", panel: "별점과 최근 구매평 342건을 모았습니다." },
  { label: "문의", panel: "교환·환불은 여기서 바로 신청하세요." },
];

export type FadePanelProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FadePanel({ duration = 220, easing = "ease-out", color = "#17141a" }: FadePanelProps) { // 주황 무대 위 활성 탭 글자 — 크림은 3.11 로 미달
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.fp} style={vars}>
      <div className={styles.nav} role="tablist">
        {TABS.map((t, i) => (
          <button key={t.label} type="button" role="tab" aria-selected={i === active}
                  className={styles.tab} onClick={() => setActive(i)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className={styles.panels}>
        {TABS.map((t, i) => (
          <p key={t.label} className={styles.panel} style={{ opacity: i === active ? 1 : 0 }} aria-hidden={i !== active}>
            {t.panel}
          </p>
        ))}
      </div>
    </div>
  );
}
