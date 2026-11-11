// ShortcutRecorder — vanilla 판(run/288/demo/06-shortcut-recorder-input/index.html) 의 React 포트.
// 칸이 초점을 가진 동안 누른 조합을 그대로 받아 적는다. IME 조합 중(isComposing)은 건너뛴다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShortcutRecorder.module.scss";

export type ShortcutRecorderProps = {
  /** 격자 미리보기용 2초 자동 루프. 칸에서 키를 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
/** React 이벤트 제네릭이 ambient 에 없어 쓰는 필드만 지역 타입으로 선언한다 */
type KeyEvt = {
  key: string;
  isComposing: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  preventDefault(): void;
};

const TAKEN = ["Ctrl+Shift+K"];
const MODIFIER_KEYS = ["Control", "Alt", "Shift", "Meta"];
/** 미리보기 루프가 보여 주는 조합 — 실제 입력이 들어오면 그 조합으로 갈린다 */
const PREVIEW = ["Ctrl", "Shift", "K"];

export default function ShortcutRecorder({
  demo = true,
  duration = 140,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#17141a",
}: ShortcutRecorderProps) {
  const [live, setLive] = useState(demo);
  const [parts, setParts] = useState<string[]>(PREVIEW);
  const [recorded, setRecorded] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function handleKeyDown(e: KeyEvt) {
    // 한글·일본어 입력기가 조합 중일 때 오는 키는 글자를 만드는 중이라 단축키가 아니다
    if (e.isComposing) { return; }
    if (e.key === "Tab") { return; }
    // 칸이 초점을 가진 동안에는 Ctrl+S 같은 브라우저 기본 동작을 막고 조합만 받아 적는다
    e.preventDefault();
    setLive(false);
    const next: string[] = [];
    if (e.ctrlKey) { next.push("Ctrl"); }
    if (e.altKey) { next.push("Alt"); }
    if (e.shiftKey) { next.push("Shift"); }
    if (e.metaKey) { next.push("Meta"); }
    if (MODIFIER_KEYS.indexOf(e.key) < 0) {
      next.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    }
    setParts(next);
    setRecorded(next.length > 1);
  }

  const conflict = recorded && TAKEN.indexOf(parts.join("+")) >= 0;
  const cls = [styles.root, live ? styles.isDemo : "", recorded ? styles.hasCombo : "", conflict ? styles.isConflict : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <div className={cls}>
        <p className={styles.label} id="fieldLabel">새 단축키</p>
        <div className={styles.field} tabIndex={0} role="textbox" aria-readonly="true" aria-labelledby="fieldLabel" onKeyDown={handleKeyDown}>
          <span className={styles.slot}>
            <span className={styles.hint}>조합을 눌러 주세요</span>
            <span className={styles.combo} aria-live="polite">
              {parts.map((part) => (
                <kbd className={styles.key} key={part}>{part}</kbd>
              ))}
            </span>
          </span>
          <span className={styles.rec} aria-hidden="true" />
        </div>
        <p className={styles.warn}>이미 쓰고 있는 조합입니다</p>
      </div>
    </main>
  );
}
