import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SettingsForm.module.scss";

export type SettingsFormProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type SaveState = "idle" | "busy" | "done";

export default function SettingsForm({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: SettingsFormProps) {
  const [emailAlert, setEmailAlert] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (save === "busy") return;
    setSave("busy");
    setTimeout(() => {
      setSave("done");
      setTimeout(() => setSave("idle"), 1600);
    }, 700);
  }

  const label = save === "busy" ? "저장 중" : save === "done" ? "저장됨" : "저장";

  return (
    <form className={styles.sf} style={vars} onSubmit={onSubmit}>
      <h2 className={styles.title}>알림</h2>
      <label className={styles.row}>
        <span>이메일 알림</span>
        <span className={styles.switch} role="switch" aria-checked={emailAlert} tabIndex={0}
          onClick={() => setEmailAlert((v) => !v)}
          onKeyDown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEmailAlert((v) => !v); } }}
          data-on={emailAlert}
        >
          <span className={styles.knob} />
        </span>
      </label>
      <label className={styles.row}>
        <span>주간 리포트</span>
        <span className={styles.switch} role="switch" aria-checked={weeklyReport} tabIndex={0}
          onClick={() => setWeeklyReport((v) => !v)}
          onKeyDown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setWeeklyReport((v) => !v); } }}
          data-on={weeklyReport}
        >
          <span className={styles.knob} />
        </span>
      </label>
      <button type="submit" className={`${styles.save} ${save === "busy" ? styles.busy : ""} ${save === "done" ? styles.done : ""}`}>
        {label}
      </button>
    </form>
  );
}
