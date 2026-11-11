import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PasswordChangeForm.module.scss";

export type HintKey = "idle" | "bad" | "ok" | "saved";
export type PasswordChangeFormProps = {
  labels?: { current: string; next: string; confirm: string; save: string };
  hints?: Record<HintKey, string>;
  /** 강도 눈금 네 칸 중 몇 칸이 차야 저장이 열리는가 */
  need?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type InputEvt = { target: { value: string } };
type Fields = { current: string; next: string; confirm: string };

// 네 칸 눈금과 같은 규칙 — 길이 · 숫자 · 기호 · 대소문자 섞임
function strength(v: string): number {
  let n = 0;
  if (v.length >= 8) n += 1;
  if (/[0-9]/.test(v)) n += 1;
  if (/[^A-Za-z0-9]/.test(v)) n += 1;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) n += 1;
  return n;
}

export default function PasswordChangeForm({
  labels = {
    current: "Current password",
    next: "New password",
    confirm: "Confirm new password",
    save: "Change password",
  },
  hints = {
    idle: "Eight characters or more, mixed with digits and symbols",
    bad: "The confirm field does not match the new password",
    ok: "Both fields match",
    saved: "Password changed",
  },
  need = 3,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: PasswordChangeFormProps) {
  const [demo, setDemo] = useState(true);
  const [v, setV] = useState<Fields>({ current: "", next: "", confirm: "" });
  const [saved, setSaved] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const score = strength(v.next);
  const bad = v.confirm.length > 0 && v.confirm !== v.next;
  const ok = v.current.length > 0 && score >= need && v.confirm.length > 0 && !bad;
  const msg: HintKey = saved && ok ? "saved" : bad ? "bad" : ok ? "ok" : "idle";

  function set(key: keyof Fields) {
    return (e: InputEvt) => {
      setDemo(false); // 사람이 치기 시작했으니 자동 루프를 끈다
      setSaved(false);
      setV((p) => ({ ...p, [key]: e.target.value }));
    };
  }

  // 진짜 disabled 가 아니라 aria-disabled — 눌리면 왜 잠겼는지 읽어 준다
  function submit() {
    setDemo(false);
    setSaved(ok);
  }

  const ghost = (n: number) => "•".repeat(n);

  return (
    <section
      className={`${styles.pw} ${demo ? styles.isDemo : ""}`}
      data-strength={String(score)}
      data-msg={msg}
      data-bad={String(bad)}
      style={vars}
    >
      <div className={styles.card}>
        <div className={styles.row}>
          <div className={styles.box}>
            <label className={styles.lab} htmlFor="pw-cur">{labels.current}</label>
            <div className={styles.field}>
              <input
                className={styles.in}
                id="pw-cur"
                type="password"
                autoComplete="current-password"
                value={v.current}
                onChange={set("current")}
              />
              <span className={styles.ghost} data-g="cur" aria-hidden="true">{ghost(8)}</span>
            </div>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.box}>
            <label className={styles.lab} htmlFor="pw-new">{labels.next}</label>
            <div className={styles.field}>
              <input
                className={styles.in}
                id="pw-new"
                type="password"
                autoComplete="new-password"
                value={v.next}
                onChange={set("next")}
              />
              <span className={styles.ghost} data-g="new" aria-hidden="true">{ghost(12)}</span>
            </div>
          </div>
          <div className={styles.meter} aria-hidden="true">
            {[1, 2, 3, 4].map((n) => (
              <span className={styles.cell} key={n}>
                <i className={styles.fill} data-n={String(n)} />
              </span>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.box} data-box="confirm">
            <label className={styles.lab} htmlFor="pw-confirm">{labels.confirm}</label>
            <div className={styles.field}>
              <input
                className={styles.in}
                id="pw-confirm"
                type="password"
                autoComplete="new-password"
                aria-describedby="pw-hint"
                value={v.confirm}
                onChange={set("confirm")}
              />
              <span className={styles.ghost} data-g="confirm" aria-hidden="true">{ghost(12)}</span>
            </div>
          </div>
        </div>

        <p className={styles.hint} id="pw-hint" role="status" aria-live="polite">
          <span className={styles.msg} data-msg="idle">{hints.idle}</span>
          <span className={styles.msg} data-msg="bad">{hints.bad}</span>
          <span className={styles.msg} data-msg="ok">{hints.ok}</span>
          <span className={styles.msg} data-msg="saved">{hints.saved}</span>
        </p>

        <button className={styles.save} type="button" aria-disabled={!ok} onClick={submit}>
          {labels.save}
        </button>
      </div>
    </section>
  );
}
