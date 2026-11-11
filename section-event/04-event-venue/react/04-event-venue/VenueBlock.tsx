import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./VenueBlock.module.scss";

const DIRECTIONS = [
  { label: "지하철", text: "2호선 ○○역 3번 출구, 도보 5분." },
  { label: "버스", text: "간선 000·지선 0000번, ○○역 하차." },
  { label: "자차", text: "지하 주차장 2시간 무료, 이후 시간당 2천 원." },
];

export type VenueBlockProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function VenueBlock({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: VenueBlockProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.vn} style={vars}>
      <div>
        <p className={styles.name}>○○ 컨벤션센터 3층</p>
        <p className={styles.addr}>서울 강남구 ○○로 123</p>
        <div className={styles.tabs} role="tablist">
          {DIRECTIONS.map((d, i) => (
            <button
              key={d.label}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={styles.tab}
              onClick={() => setActive(i)}
            >
              {d.label}
            </button>
          ))}
          <span className={styles.ind} style={{ transform: `translateX(${active * 100}%)` }} aria-hidden="true" />
        </div>
        <p className={styles.panel}>{DIRECTIONS[active].text}</p>
      </div>
      <div className={styles.map} aria-hidden="true">
        <span className={styles.pin} />
      </div>
    </section>
  );
}
