// LitReactionPad — vanilla 판(run/301/demo/01-lit-reaction-pad/index.html) 의 React 포트.
// 게임 판정은 전부 CSS(:checked 연쇄 + counter)다. React 는 상태(체크 9개)를 들고 있고
// 재시작과 키보드 초점(켜진 패드로 이동)만 담당한다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LitReactionPad.module.scss";

export type LitReactionPadProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type PadVars = CSSProperties & { "--i"?: string };

const TOTAL = 9;
const TITLE = "불 켜지는 패드 누르기";
const HINT = "켜진 패드만 눌립니다. 스페이스로도 누를 수 있어요";
const RESTART_LABEL = "다시 시작";
const PAD_LABEL = "{n}번 패드";
const DONE_TEXT = "9개 패드 클리어!";
const TALLY_LABEL = "누른 수";

function RestartIcon() {
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" />
        <path d="M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0" />
      </g>
    </svg>
  );
}

export default function LitReactionPad({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  accentColor = "#0a4fe8",
}: LitReactionPadProps) {
  const [checks, setChecks] = useState<boolean[]>(Array(TOTAL).fill(false));
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": accentColor };

  const litIndex = checks.findIndex((v) => !v);

  function toggle(i: number) {
    setDemo(false);
    setChecks((prev) => prev.map((v, k) => (k === i ? !v : v)));
  }
  function restart() {
    setDemo(false);
    setChecks(Array(TOTAL).fill(false));
  }
  function padVars(i: number): PadVars {
    return { "--i": String(i) };
  }
  function padLabel(i: number): string {
    return PAD_LABEL.replace("{n}", String(i + 1));
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <header className={styles.bar}>
          <p className={styles.title}>{TITLE}</p>
          <button className={styles.restart} type="button" aria-label={RESTART_LABEL} onClick={restart}>
            <RestartIcon />
          </button>
        </header>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.board}>
          {checks.map((v, i) => (
            <input
              key={i}
              className={styles.check}
              type="checkbox"
              id={`rpP${i + 1}`}
              aria-label={padLabel(i)}
              checked={v}
              tabIndex={litIndex === i || litIndex < 0 ? 0 : -1}
              onChange={() => toggle(i)}
            />
          ))}
          <div className={styles.grid}>
            {checks.map((v, i) => (
              <label key={i} className={styles.pad} htmlFor={`rpP${i + 1}`} style={padVars(i)}>
                <span className={styles.no}>{i + 1}</span>
              </label>
            ))}
          </div>
          <p className={styles.done} role="status">
            <b>{DONE_TEXT}</b>
          </p>
        </div>
        <p className={styles.tally}>
          <span className={styles.tallyLabel}>{TALLY_LABEL}</span> <b className={styles.count}></b>
        </p>
      </div>
    </main>
  );
}
