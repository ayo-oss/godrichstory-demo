import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PressReleaseList.module.scss";

export type PressReleaseListProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Cat = "all" | "product" | "partner" | "award";

const CHIPS: { cat: Cat; label: string }[] = [
  { cat: "all", label: "전체" },
  { cat: "product", label: "제품" },
  { cat: "partner", label: "파트너십" },
  { cat: "award", label: "수상" },
];

const RELEASES: { date: string; title: string; cat: Exclude<Cat, "all">; tag: string }[] = [
  { date: "08.20", title: "새 워크스페이스 기능 출시", cat: "product", tag: "제품" },
  { date: "07.02", title: "B사와 유통 파트너십 체결", cat: "partner", tag: "파트너십" },
  { date: "06.15", title: "올해의 스타트업상 수상", cat: "award", tag: "수상" },
  { date: "05.30", title: "3.0 버전 업데이트 공개", cat: "product", tag: "제품" },
];

export default function PressReleaseList({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#17141a" }: PressReleaseListProps) {
  const [active, setActive] = useState<Cat>("all");
  const [interacted, setInteracted] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={interacted ? styles.rl : `${styles.rl} ${styles.demo}`} style={vars}>
      <div className={styles.filters} role="group" aria-label="분류">
        {CHIPS.map((c) => (
          <button
            key={c.cat}
            type="button"
            className={styles.chip}
            aria-pressed={active === c.cat}
            onClick={() => { setInteracted(true); setActive(c.cat); }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <ul className={styles.list}>
        {RELEASES.map((r) => {
          const show = active === "all" || active === r.cat;
          return (
            <li key={r.title} className={show ? styles.row : `${styles.row} ${styles.hidden}`}>
              <span className={styles.date}>{r.date}</span>
              <span className={styles.title}>{r.title}</span>
              <span className={styles.tag}>{r.tag}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
