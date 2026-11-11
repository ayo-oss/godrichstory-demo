// ConflictTable — vanilla 판(run/288/demo/07-shortcut-conflict-table/index.html) 의 React 포트.
// 같은 조합이 두 줄에 걸리면 그 줄에 경고 배지와 outline 이 붙고, 경고문은 aria-live 로 한 번 읽힌다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ConflictTable.module.scss";

export type ConflictTableProps = {
  /** 격자 미리보기용 2초 자동 루프. 바꾸기 버튼을 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ACTIONS = ["명령 실행", "줄 복제", "빠른 열기"];

/** 조합마다 몇 줄이 쓰는지 세어, 두 줄 이상이면 그 줄을 충돌로 본다 */
function conflictFlags(letters: string[]): boolean[] {
  const counts = new Map<string, number>();
  letters.forEach((letter) => {
    const key = "Ctrl+" + letter;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return letters.map((letter) => (counts.get("Ctrl+" + letter) || 0) > 1);
}

export default function ConflictTable({
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: ConflictTableProps) {
  const [live, setLive] = useState(demo);
  const [letters, setLetters] = useState<string[]>(["K", "D", "K"]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const flags = conflictFlags(letters);
  const hasConflict = flags.some(Boolean);

  function applySwap() {
    setLive(false);
    setLetters(["K", "D", "J"]);
  }

  const cls = [styles.root, live ? styles.isDemo : "", hasConflict ? styles.hasConflict : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <div className={cls}>
        <p className={styles.cap}>단축키 목록</p>
        <div className={styles.table} role="table" aria-label="단축키 목록">
          {ACTIONS.map((action, i) => (
            <div
              className={[styles.row, flags[i] ? styles.isConflict : styles.isOk].join(" ")}
              role="row"
              key={action}
            >
              <span className={styles.act} role="cell">{action}</span>
              <span className={styles.bind} role="cell">
                <kbd className={styles.key}>Ctrl</kbd>
                <kbd className={styles.key}>
                  <span className={styles.letterText}>{letters[i]}</span>
                  {i === 2 ? <span className={styles.letterAlt} aria-hidden="true">J</span> : null}
                </kbd>
              </span>
              <span className={styles.state} role="cell">
                <span className={styles.warn}>충돌</span>
                <span className={styles.ok}>확인</span>
              </span>
            </div>
          ))}
        </div>
        <p className={styles.live} aria-live="polite">같은 조합이 두 줄에 있습니다</p>
        <button type="button" className={styles.swap} disabled={!hasConflict} onClick={applySwap}>
          마지막 줄을 Ctrl+J 로
        </button>
      </div>
    </main>
  );
}
