import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BranchStepPath.module.scss";

export type BranchStep = {
  label: string;
  /** "all" = every path, "biz" = only the business path */
  kind: "all" | "biz";
};

export type BranchStepPathProps = {
  steps?: BranchStep[];
  personalLabel?: string;
  businessLabel?: string;
  pickLabel?: string;
  groupLabel?: string;
  note?: string;
  /** 1-based index of the step the user stands on */
  current?: number;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

const DEFAULT_STEPS: BranchStep[] = [
  { label: "Verify", kind: "all" },
  { label: "Account", kind: "all" },
  { label: "Business info", kind: "biz" },
  { label: "Done", kind: "all" },
];

function Person() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M192 96a64 64 0 1 1-64-64a64 64 0 0 1 64 64" opacity=".2" />
        <path d="M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8M72 96a56 56 0 1 1 56 56a56.06 56.06 0 0 1-56-56" />
      </g>
    </svg>
  );
}

function Briefcase() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M224 118.31V200a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8v-81.69A191.14 191.14 0 0 0 128 144a191.1 191.1 0 0 0 96-25.69" opacity=".2" />
        <path d="M104 112a8 8 0 0 1 8-8h32a8 8 0 0 1 0 16h-32a8 8 0 0 1-8-8m128-40v128a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V72a16 16 0 0 1 16-16h40v-8a24 24 0 0 1 24-24h48a24 24 0 0 1 24 24v8h40a16 16 0 0 1 16 16M96 56h64v-8a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8ZM40 72v41.62A184.1 184.1 0 0 0 128 136a184 184 0 0 0 88-22.39V72Zm176 128v-68.37A200.25 200.25 0 0 1 128 152a200.2 200.2 0 0 1-88-20.36V200z" />
      </g>
    </svg>
  );
}

export default function BranchStepPath({
  steps = DEFAULT_STEPS,
  personalLabel = "Personal",
  businessLabel = "Business",
  pickLabel = "Account type",
  groupLabel = "Signup path that branches on the answer you pick",
  note = "Only the steps that fit the type you picked are left",
  current = 2,
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: BranchStepPathProps) {
  const [biz, setBiz] = useState(true);
  const [live, setLive] = useState(demo);

  // 고른 값으로 배열을 다시 걸러 목록을 통째로 다시 그린다
  const list = steps.filter((s) => s.kind === "all" || biz);

  function pick(next: boolean) {
    setLive(false);
    setBiz(next);
  }

  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cols: CSSProperties = { gridTemplateColumns: `repeat(${list.length}, 1fr)` };
  const cls = [styles.bp, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <div className={styles.pick} role="radiogroup" aria-label={pickLabel}>
        <label className={styles.opt}>
          <input
            className={styles.r}
            type="radio"
            name="bp-kind"
            value="personal"
            checked={!biz}
            onChange={() => pick(false)}
          />
          <span className={styles.optB} data-opt="personal">
            <span className={styles.optI} aria-hidden="true"><Person /></span>
            <span>{personalLabel}</span>
          </span>
        </label>
        <label className={styles.opt}>
          <input
            className={styles.r}
            type="radio"
            name="bp-kind"
            value="business"
            checked={biz}
            onChange={() => pick(true)}
          />
          <span className={styles.optB} data-opt="business">
            <span className={styles.optI} aria-hidden="true"><Briefcase /></span>
            <span>{businessLabel}</span>
          </span>
        </label>
      </div>
      <ol className={styles.steps} style={cols}>
        {list.map((s, i) => (
          <li
            key={s.label}
            className={[styles.s, s.kind === "biz" ? styles.sBiz : ""].filter(Boolean).join(" ")}
            aria-current={i + 1 === current ? "step" : undefined}
          >
            <span className={styles.l}>{s.label}</span>
          </li>
        ))}
      </ol>
      <p className={styles.note}>{note}</p>
    </section>
  );
}
