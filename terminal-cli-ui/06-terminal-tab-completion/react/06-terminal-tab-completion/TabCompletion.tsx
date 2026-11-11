// TabCompletion — vanilla 판(run/294/demo/06-terminal-tab-completion/index.html) 의 React 포트.
// Tab 을 누르면 preventDefault 로 초점 이동을 막고 후보를 격자로 펼친다.
// 고른 후보는 색뿐 아니라 aria-selected 와 왼쪽 막대로도 표시하고, 입력칸의
// aria-activedescendant 가 그 id 를 가리켜 스크린리더가 같은 줄을 읽는다.
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TabCompletion.module.scss";

export type TabCompletionProps = {
  /** 격자 미리보기용 2초 자동 루프. 칸에서 Tab 을 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type IndexVar = CSSProperties & { "--i"?: number };
/** React 이벤트 제네릭이 ambient 에 없어 쓰는 필드만 지역 타입으로 선언한다 */
type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };
type InputEvt = { target: { value: string } };
type FocusBox = { focus(options: { preventScroll: boolean }): void };

const CANDS = ["checkout", "check-attr", "check-ignore", "check-mailmap", "check-ref-format", "checkout-index"];
/** 후보가 모두 나누어 가진 앞글자 — 셸이 여기까지는 대신 채워 준다 */
const STEM = "git check";

export default function TabCompletion({
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2b9d74",
}: TabCompletionProps) {
  const [live, setLive] = useState(demo);
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const [value, setValue] = useState(STEM);
  const inputRef = useRef<FocusBox>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function mark(index: number) {
    setAt((index + CANDS.length) % CANDS.length);
  }

  function openList() {
    setLive(false);
    setOpen(true);
    if (value.indexOf(STEM) !== 0) { setValue(STEM); }
    mark(0);
  }

  function handleKeyDown(e: KeyEvt) {
    if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); openList(); return; }
    if (!open) { return; }
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); mark(at + 1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); mark(at - 1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      setValue(`git ${CANDS[at]}`);
      setOpen(false);
    }
  }

  function handleCand(index: number) {
    openList();
    mark(index);
    const input = inputRef.current;
    if (input) { input.focus({ preventScroll: true }); }
  }

  const rootCls = [styles.tc, live ? styles.isDemo : "", open ? styles.isOpen : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <div className={rootCls}>
        <p className={styles.line}>
          <span className={styles.sign} aria-hidden="true">$</span>
          <input
            className={styles.input}
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e: InputEvt) => { setValue(e.target.value); }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={open ? "true" : "false"}
            aria-controls="cands"
            aria-activedescendant={open ? `c${at}` : undefined}
            aria-label="명령 입력칸. Tab 을 누르면 후보가 열립니다"
          />
        </p>
        <p className={styles.hint}>Tab 을 누르면 후보가 열립니다</p>
        <ul className={styles.cands} id="cands" role="listbox" aria-label="완성 후보">
          {CANDS.map((cand, i) => {
            const iv: IndexVar = { "--i": i };
            return (
              <li
                className={styles.cand}
                id={`c${i}`}
                key={cand}
                role="option"
                aria-selected={i === at ? "true" : "false"}
                style={iv}
                onClick={() => { handleCand(i); }}
              >
                {cand}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
