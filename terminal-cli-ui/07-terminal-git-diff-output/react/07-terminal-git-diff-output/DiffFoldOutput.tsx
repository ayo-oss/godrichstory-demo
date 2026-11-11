// DiffFoldOutput — vanilla 판(run/294/demo/07-terminal-git-diff-output/index.html) 의 React 포트.
// 터미널이 찍어 놓은 diff 를 묶음(hunk) 단위로 접는다. 머리를 누르면 grid-template-rows 가
// 0fr 과 1fr 사이를 오가며 높이가 보간된다. 격자 미리보기(isDemo)는 머리를 누르면 꺼진다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DiffFoldOutput.module.scss";

export type DiffFoldOutputProps = {
  /** 격자 미리보기용 2초 자동 루프. 묶음 머리를 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const BODY_ID = "dhBody";

// vanilla index.html 의 인라인 아이콘 그대로 — JSX 문법에 맞게 viewBox 만 camelCase 다
function CaretIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="m176 128l-80 80V48Z" opacity=".2"/><path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z"/></g></svg>
  );
}

export default function DiffFoldOutput({
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2b9d74",
}: DiffFoldOutputProps) {
  const [live, setLive] = useState(demo);
  const [open, setOpen] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function handleToggle() {
    setLive(false);
    setOpen((prev) => !prev);
  }

  const cls = [styles.root, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <div className={cls}>
        <p className={styles.stat}>
          <span className={styles.chip + " " + styles.chipAdd}>+6</span>
          <span className={styles.chip + " " + styles.chipDel}>-2</span>
          <span className={styles.statTxt}>파일 2개가 바뀌었습니다</span>
        </p>
        <section className={styles.hunk}>
          <button
            className={styles.head}
            type="button"
            aria-expanded={open}
            aria-controls={BODY_ID}
            aria-label="바뀐 줄 묶음 접고 펼치기"
            onClick={handleToggle}
          >
            <span className={styles.caret} aria-hidden="true"><CaretIcon /></span>
            <span className={styles.at}>@@ -14,6 +14,8 @@ function boot()</span>
          </button>
          <div className={styles.body} id={BODY_ID}>
            <div className={styles.inner}>
              <p className={styles.row}><span className={styles.sign} aria-hidden="true">&nbsp;</span>const app = createApp()</p>
              <p className={styles.row + " " + styles.rowDel}><span className={styles.sign} aria-hidden="true">-</span>app.use(legacyRouter)</p>
              <p className={styles.row + " " + styles.rowAdd}><span className={styles.sign} aria-hidden="true">+</span>app.use(router)</p>
              <p className={styles.row + " " + styles.rowAdd}><span className={styles.sign} aria-hidden="true">+</span>app.use(store)</p>
              <p className={styles.row}><span className={styles.sign} aria-hidden="true">&nbsp;</span>return app</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
