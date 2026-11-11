import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AutoHeightTransition.module.scss";

export type AutoHeightStep = {
  /** "1 / 3 · Account" */
  title: string;
  /** placeholder of each field on this step */
  fields: string[];
  note?: string;
};

export type AutoHeightTransitionProps = {
  steps?: AutoHeightStep[];
  prevLabel?: string;
  nextLabel?: string;
  groupLabel?: string;
  progressLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };

const DEFAULT_STEPS: AutoHeightStep[] = [
  { title: "1 / 3 · Account", fields: ["Email", "Password"] },
  { title: "2 / 3 · Delivery", fields: ["Recipient", "Address", "Phone"] },
  {
    title: "3 / 3 · Review",
    fields: ["Coupon code"],
    note: "Check what you typed on earlier steps before sending. Go back if something needs a fix.",
  },
];

export default function AutoHeightTransition({
  steps = DEFAULT_STEPS,
  prevLabel = "Back",
  nextLabel = "Next",
  groupLabel = "Application form with uneven field counts",
  progressLabel = "Step progress",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: AutoHeightTransitionProps) {
  const [step, setStep] = useState(1);
  const [live, setLive] = useState(demo);
  const [h, setH] = useState<number | null>(null);
  const panels = useRef<HTMLDivElement[]>([]) as Box<HTMLDivElement[]>;

  // 다음 패널의 실제 높이를 재서 --h 에 넣는다 — 짐작한 고정 높이가 아니다
  const measure = useCallback((n: number) => {
    const el = panels.current[n - 1];
    if (el) setH(Math.ceil(el.getBoundingClientRect().height));
  }, []);

  useEffect(() => {
    measure(step);
  }, [measure, step]);

  function move(d: number) {
    setLive(false);
    setStep((p) => Math.max(1, Math.min(steps.length, p + d)));
  }

  function onKey(e: KeyEvt) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      move(1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(-1);
    }
  }

  const vars: CSSProperties = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  const boxVars: CSSProperties = h === null ? {} : { "--h": `${h}px` };
  const cls = [styles.ah, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel} onKeyDown={onKey}>
      <div
        className={styles.bar}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={step}
        aria-label={progressLabel}
      >
        {steps.map((s, i) => (
          <span
            key={s.title}
            className={[styles.seg, i + 1 <= step ? styles.isDone : ""].filter(Boolean).join(" ")}
            data-seg={i + 1}
          >
            <span className={styles.segF} />
          </span>
        ))}
      </div>
      <div className={styles.box} style={boxVars}>
        {steps.map((s, i) => (
          <div
            key={s.title}
            className={[styles.panel, i + 1 === step ? styles.isOn : ""].filter(Boolean).join(" ")}
            data-step={i + 1}
            ref={(el: HTMLDivElement | null) => {
              if (el) panels.current[i] = el;
            }}
          >
            <p className={styles.t}>{s.title}</p>
            {s.fields.map((f) => (
              <input key={f} className={styles.f} type="text" placeholder={f} />
            ))}
            {s.note ? <p className={styles.note}>{s.note}</p> : null}
          </div>
        ))}
      </div>
      <div className={styles.foot}>
        <button className={styles.btn} type="button" onClick={() => move(-1)}>
          {prevLabel}
        </button>
        <button className={[styles.btn, styles.btnGo].join(" ")} type="button" onClick={() => move(1)}>
          {nextLabel}
        </button>
      </div>
    </section>
  );
}
