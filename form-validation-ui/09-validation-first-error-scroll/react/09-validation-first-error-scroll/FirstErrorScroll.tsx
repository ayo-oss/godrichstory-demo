import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FirstErrorScroll.module.scss";

export type ScrollRow = { caption: string; value: string };

export type FirstErrorScrollProps = {
  rows?: ScrollRow[];
  submitLabel?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_ROWS: ScrollRow[] = [
  { caption: "Name", value: "Bitna Kim" },
  { caption: "Birth date", value: "1996-04-02" },
  { caption: "Email", value: "" },
  { caption: "Address", value: "Seongsu-dong 12-gil" },
];

export default function FirstErrorScroll({
  rows = DEFAULT_ROWS,
  submitLabel = "Submit form",
  demo = true,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: FirstErrorScrollProps) {
  const [hit, setHit] = useState(-1);
  const [live, setLive] = useState(demo);
  // ambient useRef 는 항상 T | null 을 돌려준다 — 지역 별칭으로 한 번만 좁혀 쓴다
  const slotsRef = useRef<(HTMLElement | null)[]>([]);
  const slots: (HTMLElement | null)[] = slotsRef.current || [];

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const firstBad = rows.findIndex((r) => r.value.length === 0);

  function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setLive(false);
    if (firstBad < 0) return;
    const el = slots[firstBad];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // preventScroll 이 없으면 이 부품이 iframe 안에 있을 때 부모 페이지까지 끌려 내려간다
    el.focus({ preventScroll: true });
    setHit(firstBad);
  }

  return (
    <form className={`${styles.root} ${live ? styles.isDemo : ""}`} style={vars} noValidate onSubmit={onSubmit}>
      <div className={styles.viewport}>
        <div className={styles.track}>
          {rows.map((r, i) => (
            <div key={r.caption} className={styles.row}>
              <span className={styles.cap}>{r.caption}</span>
              <span
                ref={(el: HTMLElement | null) => { slots[i] = el; }}
                className={`${styles.slot} ${hit === i ? styles.isHit : ""}`}
                data-filled={r.value ? 1 : 0}
                tabIndex={r.value ? undefined : 0}
                aria-invalid={r.value ? undefined : true}
                aria-describedby={r.value ? undefined : "fe-say"}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>
      <button className={styles.btn} type="submit">{submitLabel}</button>
      <p className={styles.say} id="fe-say" role="status" aria-live="polite">
        {hit < 0 ? "" : `Moved to the empty ${rows[hit].caption} field`}
      </p>
    </form>
  );
}
