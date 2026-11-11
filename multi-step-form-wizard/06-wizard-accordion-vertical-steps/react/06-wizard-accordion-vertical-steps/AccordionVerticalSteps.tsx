import { useState, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./AccordionVerticalSteps.module.scss";

export type WizardStep = { title: string; value: string };

export type AccordionVerticalStepsProps = {
  steps?: WizardStep[];
  nextLabel?: string;
  finishLabel?: string;
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

const DEFAULT_STEPS: WizardStep[] = [
  { title: "Recipient", value: "Hong Gildong" },
  { title: "Address", value: "12-34 Yeoksam-dong, Gangnam-gu, Seoul" },
  { title: "Phone", value: "010-2345-6789" },
];

function Caret() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
        <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
      </g>
    </svg>
  );
}

export default function AccordionVerticalSteps({
  steps = DEFAULT_STEPS,
  nextLabel = "Next",
  finishLabel = "Done",
  groupLabel = "Delivery details in three steps",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: AccordionVerticalStepsProps) {
  // 정적 상태: 1단계 끝남(접혀 값 요약) · 2단계 펼침 · 3단계 대기
  const [open, setOpen] = useState<number | null>(1);
  const [vals, setVals] = useState<string[]>(steps.map((s) => s.value));
  const [done, setDone] = useState<boolean[]>(steps.map((_, i) => i === 0));
  const [all, setAll] = useState(false);
  const [live, setLive] = useState(demo);
  const boxes = useRef<(FocusEl | null)[]>([]);
  // ambient useRef 는 T | null 을 돌려주므로 로컬 별칭으로 한 번만 좁혀 쓴다
  const boxesBox: Box<(FocusEl | null)[]> = boxes as Box<(FocusEl | null)[]>;
  const heads = useRef<(FocusEl | null)[]>([]);
  const headsBox: Box<(FocusEl | null)[]> = heads as Box<(FocusEl | null)[]>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle(i: number) {
    setLive(false);
    setOpen((prev) => (prev === i ? null : i));
  }
  // 값 읽어 머리에 한 줄로 남기고 다음 단계를 펼쳐 그 칸에 초점을 준다
  function advance(i: number) {
    setLive(false);
    setDone((prev) => prev.map((d, n) => (n === i ? true : d)));
    const boxesArr = boxes.current;
    const headsArr = heads.current;
    if (i + 1 < steps.length) {
      setOpen(i + 1);
      const el = boxesArr ? boxesArr[i + 1] : null;
      if (el) el.focus({ preventScroll: true });
    } else {
      setOpen(null);
      setAll(true);
      const h = headsArr ? headsArr[i] : null;
      if (h) h.focus({ preventScroll: true });
    }
  }

  const cls = [styles.vz, live ? styles.isDemo : "", all ? styles.isAll : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      {steps.map((s, i) => {
        const isOpen = open === i;
        return (
          <div
            key={s.title}
            className={[styles.item, done[i] ? styles.isDone : "", isOpen ? styles.isOpen : ""].filter(Boolean).join(" ")}
            data-item={i + 1}
          >
            <button
              className={styles.h}
              type="button"
              id={`vz-h-${i}`}
              ref={(el: FocusEl | null) => { const arr = heads.current; if (arr) arr[i] = el; }}
              aria-expanded={isOpen}
              aria-controls={`vz-p-${i}`}
              onClick={() => toggle(i)}
            >
              <span className={styles.num} aria-hidden="true">{i + 1}</span>
              <span className={styles.t}>{s.title}</span>
              <span className={styles.sv}>{vals[i] || "—"}</span>
              <span className={styles.caret} aria-hidden="true"><Caret /></span>
            </button>
            <div className={styles.body} id={`vz-p-${i}`} role="region" aria-labelledby={`vz-h-${i}`}>
              <div className={styles.inner}>
                <input
                  className={styles.inp}
                  ref={(el: FocusEl | null) => { const arr = boxes.current; if (arr) arr[i] = el; }}
                  value={vals[i]}
                  aria-label={s.title}
                  placeholder={s.value}
                  onChange={(e: InpEvt) => {
                    setLive(false);
                    setVals((prev) => prev.map((v, n) => (n === i ? e.target.value : v)));
                  }}
                  onKeyDown={(e: KeyEvt) => {
                    if (e.key === "Enter") { e.preventDefault(); advance(i); }
                  }}
                />
                <button className={styles.next} type="button" onClick={() => advance(i)}>
                  {i + 1 < steps.length ? nextLabel : finishLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
