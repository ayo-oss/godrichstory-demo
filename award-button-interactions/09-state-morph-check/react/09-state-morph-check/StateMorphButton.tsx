import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StateMorphButton.module.scss";

export type StateMorphButtonProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
  onSubmit?: () => Promise<void>;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function StateMorphButton({
  label = "Pay now",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
  onSubmit,
}: StateMorphButtonProps) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function run() {
    if (state === "busy") { return; }
    setState("busy");
    const job = onSubmit ? onSubmit() : new Promise<void>((r) => setTimeout(r, 1200));
    job.then(() => setState("done"));
  }

  const cls = state === "busy" ? styles.busy : state === "done" ? styles.done : styles.loop;

  return (
    <button
      type="button"
      className={`${styles.morph} ${cls}`}
      style={vars}
      aria-busy={state === "busy"}
      onClick={run}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.spin} aria-hidden="true" />
      <svg className={styles.check} viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="5 12.5 10 17.5 19 7.5" />
      </svg>
    </button>
  );
}
