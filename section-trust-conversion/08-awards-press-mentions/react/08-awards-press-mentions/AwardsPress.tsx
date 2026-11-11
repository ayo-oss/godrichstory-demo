import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AwardsPress.module.scss";

export type AwardsPressProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const OUTLETS = [
  { name: "THE DAILY BRIEF", quote: `"올해 나온 CSS 도구 중 가장 실용적"` },
  { name: "TECH WEEKLY", quote: `"바이브코더를 위한 최고의 발견"` },
  { name: "STARTUP REVIEW", quote: `"압도적인 실측 데모 품질"` },
];

export default function AwardsPress({ duration = 600, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: AwardsPressProps) {
  const [open, setOpen] = useState<number | null>(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 자동 재생: 900ms 마다 다음 매체를 돌아가며 펼쳐 보여준다
  useEffect(() => {
    const id = setInterval(() => setOpen((o) => ((o ?? -1) + 1) % OUTLETS.length), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <section className={styles.ap} style={vars}>
      <p className={styles.title}>
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="18" height="18">
            <g fill="currentColor">
              <path d="M200 48v63.1c0 39.7-31.75 72.6-71.45 72.9A72 72 0 0 1 56 112V48Z" opacity=".2" />
              <path d="M232 64h-24V48a8 8 0 0 0-8-8H56a8 8 0 0 0-8 8v16H24A16 16 0 0 0 8 80v16a40 40 0 0 0 40 40h3.65A80.13 80.13 0 0 0 120 191.61V216H96a8 8 0 0 0 0 16h64a8 8 0 0 0 0-16h-24v-24.42c31.94-3.23 58.44-25.64 68.08-55.58H208a40 40 0 0 0 40-40V80a16 16 0 0 0-16-16M48 120a24 24 0 0 1-24-24V80h24v32q0 4 .39 8Zm144-8.9c0 35.52-29 64.64-64 64.9a64 64 0 0 1-64-64V56h128ZM232 96a24 24 0 0 1-24 24h-.5a82 82 0 0 0 .5-8.9V80h24Z" />
            </g>
          </svg>
        </span>
        3개 매체가 소개했어요
      </p>
      <ul className={styles.grid}>
        {OUTLETS.map((o, i) => {
          const isOpen = open === i;
          return (
            <li key={o.name} className={`${styles.badge} ${isOpen ? styles.isOpen : ""}`}>
              <button type="button" className={styles.btn} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
                <span className={styles.icSm} aria-hidden="true">
                  <svg viewBox="0 0 256 256" width="14" height="14">
                    <g fill="currentColor">
                      <path d="M224 64v120a16 16 0 0 1-16 16H32a16 16 0 0 1 16-16V64a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
                      <path d="M88 112a8 8 0 0 1 8-8h80a8 8 0 0 1 0 16H96a8 8 0 0 1-8-8m8 40h80a8 8 0 0 0 0-16H96a8 8 0 0 0 0 16m136-88v120a24 24 0 0 1-24 24H32a24 24 0 0 1-24-23.89V88a8 8 0 0 1 16 0v96a8 8 0 0 0 16 0V64a16 16 0 0 1 16-16h160a16 16 0 0 1 16 16m-16 0H56v120a23.8 23.8 0 0 1-1.37 8H208a8 8 0 0 0 8-8Z" />
                    </g>
                  </svg>
                </span>
                {o.name}
              </button>
              <div className={styles.reveal}><p className={styles.cap}>{o.quote}</p></div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
