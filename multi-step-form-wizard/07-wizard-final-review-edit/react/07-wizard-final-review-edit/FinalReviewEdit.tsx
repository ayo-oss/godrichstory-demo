import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import styles from "./FinalReviewEdit.module.scss";

export type ReviewField = { label: string; value: string };
export type ReviewGroup = {
  name: string;
  editLabel: string;
  fields: ReviewField[];
};

export type FinalReviewEditProps = {
  heading?: string;
  groups?: ReviewGroup[];
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type FocusEl = { focus(opt: { preventScroll: boolean }): void };
type KeyEvt = { key: string; preventDefault(): void };
type InpEvt = { target: { value: string } };

const DEFAULT_GROUPS: ReviewGroup[] = [
  {
    name: "Delivery",
    editLabel: "Edit the delivery address",
    fields: [
      { label: "Recipient", value: "Hong Gildong" },
      { label: "Address", value: "12-34 Yeoksam-dong, Gangnam-gu, Seoul" },
    ],
  },
  {
    name: "Contact",
    editLabel: "Edit the contact details",
    fields: [
      { label: "Phone", value: "010-2345-6789" },
      { label: "Email", value: "gildong@mail.com" },
    ],
  },
  {
    name: "Payment",
    editLabel: "Edit the payment method",
    fields: [
      { label: "Card", value: "Personal card · 4444" },
      { label: "Plan", value: "Pay in full" },
    ],
  },
];

function Pencil() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M221.66 90.34L192 120l-56-56l29.66-29.66a8 8 0 0 1 11.31 0L221.66 79a8 8 0 0 1 0 11.34" opacity=".2" />
        <path d="m227.31 73.37l-44.68-44.69a16 16 0 0 0-22.63 0L36.69 152A15.86 15.86 0 0 0 32 163.31V208a16 16 0 0 0 16 16h44.69a15.86 15.86 0 0 0 11.31-4.69L227.31 96a16 16 0 0 0 0-22.63M92.69 208H48v-44.69l88-88L180.69 120ZM192 108.68L147.31 64l24-24L216 84.68Z" />
      </g>
    </svg>
  );
}

export default function FinalReviewEdit({
  heading = "Last check",
  groups = DEFAULT_GROUPS,
  groupLabel = "Final review before sending",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: FinalReviewEditProps) {
  const [editing, setEditing] = useState<number | null>(null);
  const [values, setValues] = useState<string[][]>(groups.map((g) => g.fields.map((f) => f.value)));
  const [live, setLive] = useState(demo);
  const firstBox = useRef<FocusEl | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 편집에 들어가면 첫 칸에 초점 — iframe 안이라 preventScroll 이 필수
  useEffect(() => {
    if (editing !== null) {
      const el = firstBox.current;
      if (el) el.focus({ preventScroll: true });
    }
  }, [editing]);

  // 연필: 눌린 묶음의 값이 진짜 input 으로 바뀌고, 다시 누르면 고친 값이 텍스트로 남는다
  function press(gi: number) {
    setLive(false);
    setEditing((prev) => (prev === gi ? null : gi));
  }

  const cls = [styles.rv, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <p className={styles.h}>{heading}</p>
      {groups.map((g, gi) => {
        const isEdit = editing === gi;
        return (
          <div key={g.name} className={[styles.g, isEdit ? styles.isEdit : ""].filter(Boolean).join(" ")} data-g={gi + 1}>
            <div className={styles.top}>
              <p className={styles.name}>{g.name}</p>
              <button
                className={styles.pen}
                type="button"
                data-step={gi + 1}
                aria-label={g.editLabel}
                aria-pressed={isEdit}
                onClick={() => press(gi)}
              >
                <Pencil />
              </button>
            </div>
            <dl className={styles.kv}>
              {g.fields.map((f, fi) => (
                <div key={f.label} className={styles.row}>
                  <dt className={styles.k}>{f.label}</dt>
                  <dd className={styles.dd}>
                    {isEdit ? (
                      <input
                        className={styles.inp}
                        value={values[gi][fi]}
                        aria-label={f.label}
                        ref={fi === 0 ? (el: FocusEl | null) => { firstBox.current = el; } : undefined}
                        onChange={(e: InpEvt) => {
                          setValues((prev) => prev.map((row, n) => (n === gi ? row.map((v, m) => (m === fi ? e.target.value : v)) : row)));
                        }}
                        onKeyDown={(e: KeyEvt) => {
                          if (e.key === "Enter") { e.preventDefault(); setEditing(null); }
                        }}
                      />
                    ) : (
                      <span className={styles.val}>{values[gi][fi] || "—"}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </section>
  );
}
