import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ProjectExperienceTimeline.module.scss";

export type ProjectExperienceTimelineProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const STOPS = [
  { year: "2023", role: "프로젝트 A 리드", desc: "2023년, 프로젝트 A 를 처음부터 끝까지 리드했습니다." },
  { year: "2022", role: "프로젝트 B 참여", desc: "2022년, 프로젝트 B 에 프런트엔드 담당으로 참여했습니다." },
  { year: "2021", role: "프로젝트 C 인턴", desc: "2021년, 프로젝트 C 팀에서 인턴으로 UI 를 구현했습니다." },
  { year: "2020", role: "전공 수료", desc: "2020년, 전공을 마치고 첫 사이드 프로젝트를 시작했습니다." },
];

export default function ProjectExperienceTimeline({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: ProjectExperienceTimelineProps) {
  const [active, setActive] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={interacted ? styles.et : `${styles.et} ${styles.demo}`} style={vars}>
      <p className={styles.desc} role="status">{STOPS[active].desc}</p>
      <div className={styles.track}>
        <span className={styles.fill} style={{ transform: `scaleY(${(active + 1) / STOPS.length})` }} aria-hidden="true" />
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
                <span className={styles.role}>{s.role}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
