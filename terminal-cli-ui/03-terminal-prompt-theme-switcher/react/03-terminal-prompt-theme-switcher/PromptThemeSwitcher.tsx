// PromptThemeSwitcher — vanilla 판(run/294/demo/03-terminal-prompt-theme-switcher/index.html) 의 React 포트.
// 같은 한 줄 프롬프트를 기본·물결·조각 세 모양으로 갈아 끼운다. 버튼을 한 번 누르면
// 격자 미리보기 루프(demo)가 꺼지고 사람이 고른 모양만 남는다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PromptThemeSwitcher.module.scss";

export type PromptThemeSwitcherProps = {
  /** 격자 미리보기용 2초 자동 루프. 모양 버튼을 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 값은 data-shape 에 그대로 들어가는 영어 key, 이름은 화면에 찍히는 한국어 문구 */
const SHAPES = [
  { value: "plain", label: "기본" },
  { value: "wave", label: "물결" },
  { value: "seg", label: "조각" },
];

export default function PromptThemeSwitcher({
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2b9d74",
}: PromptThemeSwitcherProps) {
  const [live, setLive] = useState(demo);
  const [shape, setShape] = useState("plain");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function pickShape(next: string) {
    setLive(false);
    setShape(next);
  }

  const cls = [styles.root, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <div className={cls} data-shape={shape}>
        <div className={styles.pick} role="group" aria-label="프롬프트 모양">
          {SHAPES.map((s) => (
            <button
              className={styles.btn}
              type="button"
              key={s.value}
              data-shape={s.value}
              aria-pressed={shape === s.value}
              onClick={() => pickShape(s.value)}
            >
              {s.label}
              <span className={styles.bar} aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className={styles.screen}>
          <div className={`${styles.view} ${styles.viewPlain}`}>
            <span className={styles.path}>~/work/site</span>
            <span className={styles.git}>git:(main)</span>
            <span className={styles.caret}>❯</span>
          </div>
          <div className={`${styles.view} ${styles.viewWave}`}>
            <span className={styles.user}>you</span><span className={styles.at}>@</span><span className={styles.host}>mac</span>
            <span className={styles.path}>~/work/site</span>
            <span className={`${styles.caret} ${styles.caretWave}`}>❯❯</span>
          </div>
          <div className={`${styles.view} ${styles.viewSeg}`}>
            <span className={`${styles.seg} ${styles.segA}`}>~/work/site</span><span className={`${styles.seg} ${styles.segB}`}>main</span><span className={`${styles.seg} ${styles.segC}`}>node 22</span>
          </div>
        </div>
      </div>
    </main>
  );
}
