import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StackGroupSwitch.module.scss";

export type StackGroupSwitchProps = {
  title?: string;
  toggleLabel?: string;
  sideLabel?: string;
  stackLabel?: string;
  seriesA?: string;
  seriesB?: string;
  categories?: string[];
  totals?: string[];
  hint?: string;
  chartLabel?: string;
  tableCaption?: string;
  headChannel?: string;
  headTotal?: string;
  rows?: [number, number][];
  duration?: number;
  easing?: string;
  color?: string;
};

// 값은 vanilla(run/264/demo/06) 의 표와 같다 — 합계 84·58·78·32
export default function StackGroupSwitch({
  title = "채널별 방문",
  toggleLabel = "막대 배열 바꾸기",
  sideLabel = "나란히 보기",
  stackLabel = "쌓기 보기",
  seriesA = "이번 달",
  seriesB = "지난 달",
  categories = ["검색", "직접", "추천", "소셜"],
  totals = ["84명", "58명", "78명", "32명"],
  hint = "눌러면 같은 막대가 쌓기와 나란히를 오갑니다",
  chartLabel = "채널 4개의 이번 달·지난 달 방문 막대. 검색 60·24, 직접 36·22, 추천 48·30, 소셜 20·12",
  tableCaption = "채널별 방문자 수",
  headChannel = "채널",
  headTotal = "합계",
  rows = [[60, 24], [36, 22], [48, 30], [20, 12]],
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: StackGroupSwitchProps) {
  const [demo, setDemo] = useState(true);
  const [side, setSide] = useState(false);
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;

  function toggle() {
    setDemo(false);
    setSide((v) => !v);
  }

  return (
    <div
      className={`${styles.sk} ${demo ? styles.isDemo : ""}`}
      data-mode={side ? "side" : "stack"}
      style={vars}
    >
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <button
          type="button"
          className={styles.btn}
          aria-pressed={side}
          aria-label={toggleLabel}
          onClick={toggle}
        >
          <span className={styles.labSide}>{sideLabel}</span>
          <span className={styles.labStack}>{stackLabel}</span>
        </button>
      </div>

      <div className={styles.legend} aria-hidden="true">
        <span className={styles.key}><i className={styles.dotA} />{seriesA}</span>
        <span className={styles.key}><i className={styles.dotB} />{seriesB}</span>
      </div>

      <div className={styles.plot} role="img" aria-label={chartLabel}>
        {categories.map((c, i) => (
          <div className={styles.col} key={c}>
            <span className={styles.tot}>{totals[i]}</span>
            <span className={`${styles.b} ${styles.bA}`} />
            <span className={`${styles.b} ${styles.bB}`} />
          </div>
        ))}
        {categories.map((c) => <span className={styles.x} key={"x" + c}>{c}</span>)}
      </div>

      <p className={styles.hint}>{hint}</p>

      <div className={styles.sr}>
        <span aria-live="polite">{side ? sideLabel : stackLabel}</span>
        <table>
          <caption>{tableCaption}</caption>
          <thead>
            <tr><th>{headChannel}</th><th>{seriesA}</th><th>{seriesB}</th><th>{headTotal}</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}><th>{categories[i]}</th><td>{r[0]}</td><td>{r[1]}</td><td>{r[0] + r[1]}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
