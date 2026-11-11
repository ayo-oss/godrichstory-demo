// FontStackCompare — vanilla 판(run/074/demo/01-font-stack-compare/index.html) 의 React 포트.
// 같은 문장을 serif·sans·mono 세 판에 나란히 놓고 탭으로 표본 문장을 바꾼다.
// 스택 목록과 미리보기 루프의 키프레임은 vanilla 와 같은 글자다 (값을 다시 타이핑하지 않는다).
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FontStackCompare.module.scss";

export type FontStackCompareProps = {
  duration?: number;
  easing?: string;
  color?: string;
  samples?: string[];
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const TAB_LABELS = ["한글", "영문", "혼합"];
const DEFAULT_SAMPLES = ["동해물과 백두산이", "Hello Type 0123", "CSS 타이포 2026"];
const NOTE = "버튼으로 표본 문장을 바꿔 보세요";
const ARIA_LABEL = "시스템 서체 스택 비교";
const PANES = [
  { chip: "SERIF", stack: "ui-serif · Georgia", spec: "serif" },
  { chip: "SANS", stack: "system-ui · Segoe UI", spec: "sans" },
  { chip: "MONO", stack: "ui-monospace · Consolas", spec: "mono" },
];

export default function FontStackCompare(props: FontStackCompareProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#5b8cf8";
  const samples = props.samples ?? DEFAULT_SAMPLES;
  const [active, setActive] = useState<number>(0);
  const [preview, setPreview] = useState<boolean>(true);
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <section
        className={styles.root + (preview ? " " + styles.isDemo : "")}
        style={vars}
        aria-label={ARIA_LABEL}
        onPointerDown={() => setPreview(false)}
      >
        <div className={styles.tabs}>
          {TAB_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={styles.tab}
              aria-pressed={String(i === active)}
              onClick={() => {
                setPreview(false);
                setActive(i);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.grid}>
          {PANES.map((pane) => (
            <article key={pane.chip} className={styles.pane}>
              <header className={styles.head}>
                <span className={styles.chip}>{pane.chip}</span>
                <span className={styles.mark} aria-hidden="true"></span>
              </header>
              <p className={styles.spec + " " + styles["spec--" + pane.spec]}>{samples[active]}</p>
              <p className={styles.stack}>{pane.stack}</p>
            </article>
          ))}
        </div>
        <p className={styles.note}>{NOTE}</p>
      </section>
    </main>
  );
}
