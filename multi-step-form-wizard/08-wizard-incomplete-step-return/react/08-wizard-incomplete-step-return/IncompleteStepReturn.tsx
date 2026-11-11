import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./IncompleteStepReturn.module.scss";

export type IncompleteStepReturnProps = {
  /** 단계마다 { 제목, 칸 이름, 처음 값 }. 처음 값이 빈 문자열인 단계가 제출 시 되돌아갈 단계다 */
  steps?: { title: string; label: string; value: string; placeholder?: string }[];
  markerLabel?: string;
  panelLabel?: string;
  cleanHint?: string;
  badHint?: string;
  submitLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--step"?: string };

type KeyEvt = { key: string; preventDefault(): void };
type ChEvt = { target: { value: string } };
// ambient 가 얇아 DOM 전역 타입을 못 쓴다 — 초점 받을 요소의 최소 꼴만 로컬로 선언
type Focusable = { focus: (o: { preventScroll: boolean }) => void };

const DEFAULT_STEPS = [
  { title: "Step 1 · Name", label: "Name", value: "Dana Kim", placeholder: "" },
  { title: "Step 2 · Contact", label: "Mobile", value: "+1 555 0134", placeholder: "" },
  { title: "Step 3 · Delivery", label: "Address", value: "", placeholder: "Street address" },
  { title: "Step 4 · Request", label: "Request", value: "Leave with the front desk", placeholder: "" },
];

function WarnDot() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
        <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m-8-80V80a8 8 0 0 1 16 0v56a8 8 0 0 1-16 0m20 36a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
      </g>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="m223.69 42.18l-58.22 192a8 8 0 0 1-14.92 1.25L108 148l-87.42-42.55a8 8 0 0 1 1.25-14.92l192-58.22a8 8 0 0 1 9.86 9.87" opacity=".2" />
        <path d="M227.32 28.68a16 16 0 0 0-15.66-4.08h-.15L19.57 82.84a16 16 0 0 0-2.49 29.8L102 154l41.3 84.87a15.86 15.86 0 0 0 14.44 9.13q.69 0 1.38-.06a15.88 15.88 0 0 0 14-11.51l58.2-191.94v-.15a16 16 0 0 0-4-15.66m-69.49 203.17l-.05.14v-.07l-40.06-82.3l48-48a8 8 0 0 0-11.31-11.31l-48 48l-82.33-40.06h-.07h.14L216 40Z" />
      </g>
    </svg>
  );
}

export default function IncompleteStepReturn({
  steps = DEFAULT_STEPS,
  markerLabel = "Step markers",
  panelLabel = "Application steps",
  cleanHint = "Submits once no field is blank",
  badHint = "Sent back to the step with a blank",
  submitLabel = "Submit",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: IncompleteStepReturnProps) {
  const [values, setValues] = useState<string[]>(steps.map((s) => s.value));
  const [step, setStep] = useState(steps.length - 1);          // 처음엔 마지막 검토 단계에 서 있다
  const [bad, setBad] = useState<number | null>(null);
  const [live, setLive] = useState(demo);
  // useRef<T>(null) 은 T | null 이라 인덱스 접근이 번거롭다 — 초기 더미로 T 를 채운 상자 하나로 둔다
  const titles = useState<Focusable[]>(steps.map(() => ({ focus: () => {} })))[0];

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--step": String(step),
  };

  function submit() {
    setLive(false);
    // 단계를 앞에서부터 훑어 빈 값이 처음 나온 단계로 되돌아간다
    let first = -1;
    for (let i = 0; i < steps.length; i++) {
      if (values[i].trim() === "" && first < 0) first = i;
    }
    setBad(first >= 0 ? first : null);
    setStep(first >= 0 ? first : steps.length - 1);
    if (first >= 0) titles[first].focus({ preventScroll: true });   // iframe 안에서 부모를 끌지 않게
  }

  function edit(i: number, v: string) {
    setLive(false);
    setValues((prev) => prev.map((p, n) => (n === i ? v : p)));
    if (bad === i && v.trim() !== "") setBad(null);
  }

  function headingKey(e: KeyEvt, i: number) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    setStep(i);
  }

  const cls = [styles.ir, live ? styles.isDemo : "", bad !== null ? styles.isBad : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={panelLabel}>
      <ol className={styles.steps} aria-label={markerLabel}>
        {steps.map((s, i) => (
          <li
            key={s.title}
            className={[styles.step, i === step ? styles.isNow : "", bad === i ? styles.isBad : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <span className={styles.bar} aria-hidden="true" />
            <span className={styles.cap}>
              {i + 1}
              <span className={styles.warn} aria-hidden="true"><WarnDot /></span>
            </span>
          </li>
        ))}
      </ol>
      <div className={styles.view}>
        <div className={styles.track}>
          {steps.map((s, i) => (
            <div className={styles.panel} key={s.title} aria-hidden={i === step ? undefined : true}>
              <h3
                className={styles.title}
                tabIndex={-1}
                onFocus={() => setLive(false)}
                onKeyDown={(e: KeyEvt) => headingKey(e, i)}
                ref={(el: Focusable | null) => { if (el) titles[i] = el; }}
              >
                {s.title}
              </h3>
              <div className={styles.field}>
                <label className={styles.lab} htmlFor={`ir-in-${i}`}>{s.label}</label>
                <input
                  className={[styles.in, bad === i && values[i].trim() === "" ? styles.invalid : ""]
                    .filter(Boolean)
                    .join(" ")}
                  id={`ir-in-${i}`}
                  type="text"
                  value={values[i]}
                  placeholder={s.placeholder || ""}
                  aria-invalid={bad === i && values[i].trim() === "" ? true : undefined}
                  autoComplete="off"
                  onChange={(e: ChEvt) => edit(i, e.target.value)}
                  onKeyDown={(e: KeyEvt) => {
                    if (e.key === "Enter") { e.preventDefault(); submit(); }
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.foot}>
        <p className={styles.msg}>
          <span className={styles.msgA}>{cleanHint}</span>
          <span className={styles.msgB}>{badHint}</span>
        </p>
        <button className={styles.submit} type="button" onClick={submit}>
          <span className={styles.send} aria-hidden="true"><SendIcon /></span>
          {submitLabel}
        </button>
      </div>
    </section>
  );
}
