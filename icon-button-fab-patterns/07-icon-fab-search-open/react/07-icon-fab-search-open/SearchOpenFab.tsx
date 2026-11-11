import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./SearchOpenFab.module.scss";

export type SearchOpenFabProps = {
  closedHint?: string;
  openHint?: string;
  openLabel?: string;
  closeLabel?: string;
  placeholder?: string;
  inputLabel?: string;
  /** 격자 루프에서만 보이는 보기용 검색어. 진짜 입력칸은 비어 있다 */
  loopQuery?: string;
  keptLog?: string;
  groupLabel?: string;
  inputId?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--w"?: string;
};

// ambient 에 KeyboardEvent 가 없다 — 쓰는 필드만 로컬로 선언한다
type KeyEvt = { key: string };

const OPEN_W = "264px";
const SHUT_W = "48px";

function Glass() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <path d="M192,112a80,80,0,1,1-80-80A80,80,0,0,1,192,112Z" opacity=".2" />
      <path d="M229.66,218.34,179.6,168.28a88.21,88.21,0,1,0-11.32,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
    </svg>
  );
}

export default function SearchOpenFab({
  closedHint = "Open search",
  openHint = "Type what you are looking for",
  openLabel = "Open search",
  closeLabel = "Close search",
  placeholder = "What can we find for you?",
  inputLabel = "Search term",
  loopQuery = "spring dress",
  keptLog = "Search term kept",
  groupLabel = "Search FAB that expands into an input",
  inputId = "se-input",
  demo = true,
  duration = 320,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SearchOpenFabProps) {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(demo);
  const [q, setQ] = useState("");
  const [log, setLog] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const focusT = useRef<number>(null);

  useEffect(() => () => {
    if (focusT.current !== null) window.clearTimeout(focusT.current);
  }, []);

  function clearFocusT() {
    if (focusT.current !== null) {
      window.clearTimeout(focusT.current);
      focusT.current = null;
    }
  }

  // 열기: 알약이 다 펼쳐진 뒤에 커서를 넣어야 펼침이 끊기지 않는다
  function openUp() {
    setLive(false);
    setOpen(true);
    clearFocusT();
    focusT.current = window.setTimeout(() => {
      const el = inputRef.current;
      if (el) el.focus({ preventScroll: true });
    }, duration);
  }

  // 닫기: 남은 검색어가 있으면 그 사실만 알린다 (text 는 Escape 로 비운 값도 받는다)
  function shut(text: string) {
    setLive(false);
    setOpen(false);
    clearFocusT();
    setLog(text.trim() ? keptLog : "");
    const el = inputRef.current;
    if (el) el.blur();
  }

  function toggle() {
    if (open) shut(q);
    else openUp();
  }

  function onKey(e: KeyEvt) {
    if (e.key === "Enter") shut(q);
    if (e.key === "Escape") {
      setQ("");
      shut("");
    }
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  // 루프 중에는 --w 를 애니메이션이 굴린다 — 사람이 손댄 뒤에만 인라인으로 고정한다
  const pillVars: Vars = live ? {} : { "--w": open ? OPEN_W : SHUT_W };
  const cls = [styles.se, live ? styles.isDemo : "", open ? styles.isOpen : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <p className={styles.hint}>{open ? openHint : closedHint}</p>
      <div className={styles.dock}>
        <div className={styles.pill} style={pillVars}>
          <button
            className={styles.go}
            type="button"
            aria-expanded={open}
            aria-controls={inputId}
            aria-label={open ? closeLabel : openLabel}
            onClick={toggle}
          >
            <span aria-hidden="true"><Glass /></span>
          </button>
          <input
            className={styles.input}
            id={inputId}
            ref={inputRef}
            type="text"
            value={q}
            placeholder={placeholder}
            aria-label={inputLabel}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
            onKeyDown={onKey}
          />
          <span className={styles.q} aria-hidden="true">{loopQuery}</span>
        </div>
        <p className={styles.log} aria-live="polite">{log}</p>
      </div>
    </section>
  );
}
