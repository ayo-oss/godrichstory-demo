import { useState, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./LiveSummaryPanel.module.scss";

export type LiveSummaryPanelProps = {
  heading?: string;
  fields?: { label: string; value: string }[];
  editLabel?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type FocusEl = { focus(opt: { preventScroll: boolean }): void };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type InpEvt = { target: { value: string } };

const DEFAULT_FIELDS = [
  { label: "Recipient", value: "Hong Gildong" },
  { label: "Email", value: "gildong@mail.com" },
  { label: "Phone", value: "010-2345-6789" },
];

export default function LiveSummaryPanel({
  heading = "Delivery details",
  fields = DEFAULT_FIELDS,
  editLabel = "Edit",
  groupLabel = "Delivery details entry steps",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: LiveSummaryPanelProps) {
  // 정적 상태: 요약이 값으로 차 있고 현재 단계는 2 (0 기반 1)
  const [values, setValues] = useState<string[]>(fields.map((f) => f.value));
  const [at, setAt] = useState(1);
  const [live, setLive] = useState(demo);
  const boxes = useRef<(FocusEl | null)[]>([]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function type(i: number, v: string) {
    setLive(false);
    setValues((prev) => prev.map((s, n) => (n === i ? v : s)));
  }
  // 고치기: 그 값을 담은 단계로 돌아가 해당 칸에 초점을 준다
  function jump(i: number) {
    setLive(false);
    setAt(i);
    const arr = boxes.current;
    const el = arr ? arr[i] : null;
    if (el) el.focus({ preventScroll: true });
  }
  function arrows(i: number, e: KeyEvt) {
    const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (d && fields[i + d]) {
      e.preventDefault();
      setAt(i + d);
      const arr = boxes.current;
      const el = arr ? arr[i + d] : null;
      if (el) el.focus({ preventScroll: true });
    }
  }

  const cls = [styles.sp, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <div className={styles.bar}>
        <p className={styles.h}>{heading}</p>
        <p className={styles.cnt}>{at + 1} / {fields.length} steps</p>
      </div>
      <div className={styles.cols}>
        <div className={styles.form}>
          {fields.map((f, i) => (
            <div
              key={f.label}
              className={[styles.f, i === at ? styles.isCurrent : ""].filter(Boolean).join(" ")}
              data-f={i + 1}
            >
              <span className={styles.num} aria-hidden="true">{i + 1}</span>
              <input
                className={styles.inp}
                ref={(el: FocusEl | null) => { const arr = boxes.current; if (arr) arr[i] = el; }}
                value={values[i]}
                aria-label={f.label}
                placeholder={f.value}
                onChange={(e: InpEvt) => type(i, e.target.value)}
                onFocus={() => { setLive(false); setAt(i); }}
                onKeyDown={(e: KeyEvt) => arrows(i, e)}
              />
            </div>
          ))}
        </div>
        <div className={styles.side} aria-live="polite">
          <ul className={styles.list}>
            {fields.map((f, i) => (
              <li key={f.label} className={styles.row} data-row={i + 1}>
                <span className={styles.k}>{f.label}</span>
                <span className={styles.v}>
                  <span className={styles.v0}>—</span>
                  <span className={styles.v1}>{values[i] || "—"}</span>
                </span>
                <button className={styles.fix} type="button" onClick={() => jump(i)}>{editLabel}</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
