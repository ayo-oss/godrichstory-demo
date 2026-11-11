import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EventFaq.module.scss";

const ITEMS = [
  { q: "티켓은 환불되나요?", a: "행사 7일 전까지 전액 환불, 이후엔 수수료 10%가 붙습니다." },
  { q: "온라인으로도 참가할 수 있나요?", a: "현장 참가만 가능합니다. 주요 세션은 이후 영상으로 공개됩니다." },
  { q: "주차는 지원되나요?", a: "건물 지하 주차장 2시간 무료, 이후 시간당 2천 원입니다." },
];

export type EventFaqProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function EventFaq({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#17141a" }: EventFaqProps) {
  const [open, setOpen] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.fq} style={vars}>
      {ITEMS.map((item, i) => (
        <div key={item.q} className={i === open ? `${styles.item} ${styles.isOpen}` : styles.item}>
          <button
            type="button"
            className={styles.q}
            aria-expanded={i === open}
            onClick={() => setOpen((o) => (o === i ? -1 : i))}
          >
            <span>{item.q}</span>
            <span className={styles.chevron} aria-hidden="true" />
          </button>
          <div className={styles.aWrap}>
            <p className={styles.a}>{item.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
