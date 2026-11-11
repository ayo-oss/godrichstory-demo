import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PressMilestoneTimeline.module.scss";

export type PressMilestoneTimelineProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const STOPS = [
  { year: "2019", label: "창립", desc: "2019년, 세 명이 작은 사무실에서 첫 제품을 출시했습니다." },
  { year: "2021", label: "시리즈 A", desc: "2021년, 시리즈 A 투자를 유치하며 팀을 열 배로 키웠습니다." },
  { year: "2023", label: "해외 진출", desc: "2023년, 일본·미국 지사를 열고 해외 진출을 시작했습니다." },
  { year: "2026", label: "100만 사용자", desc: "2026년, 누적 가입자 100만 명을 넘겼습니다." },
];

export default function PressMilestoneTimeline({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: PressMilestoneTimelineProps) {
  const [active, setActive] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={interacted ? styles.mt : `${styles.mt} ${styles.demo}`} style={vars}>
      <p className={styles.desc} role="status">{STOPS[active].desc}</p>
      <div className={styles.track}>
        <span className={styles.fill} style={{ transform: `scaleX(${(active + 1) / STOPS.length})` }} aria-hidden="true" />
        <ol className={styles.list}>
          {STOPS.map((s, i) => (
            <li key={s.year}>
              <button
                type="button"
                className={styles.stop}
                aria-current={i === active ? "step" : undefined}
                onClick={() => { setInteracted(true); setActive(i); }}
              >
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.year}>{s.year}</span>
                <span className={styles.label}>{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
