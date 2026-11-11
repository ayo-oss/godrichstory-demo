import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./ChatHelpFab.module.scss";

export type ChatHelpFabProps = {
  panelLabel?: string;
  headName?: string;
  greeting?: string;
  placeholder?: string;
  inputLabel?: string;
  sendLabel?: string;
  openLabel?: string;
  closeLabel?: string;
  groupLabel?: string;
  /** 격자 루프에서만 보이는 보기용 대화 */
  loopAsk?: string;
  loopDots?: string;
  loopReply?: string;
  /** 사람이 보낸 말에 붙는 자동 응답 */
  replyText?: string;
  replyDelay?: number;
  panelId?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

// ambient 에 FormEvent 가 없다 — 쓰는 것만 로컬로 선언한다
type SubmitEvt = { preventDefault(): void };

type Line = { id: number; text: string; me: boolean };

function Send() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <path d="M227.91,134.86,59.93,231a8,8,0,0,1-11.44-9.67L80,128,48.49,34.72a8,8,0,0,1,11.44-9.67l168,95.85A8,8,0,0,1,227.91,134.86Z" opacity=".2" />
      <path d="M231.87,114l-168-95.89A16,16,0,0,0,40.92,37.34L71.55,128,40.92,218.67A16,16,0,0,0,56,240a16.15,16.15,0,0,0,7.93-2.1l167.92-96.05a16,16,0,0,0,.05-27.89ZM56,224a.56.56,0,0,0,0-.12L85.74,136H144a8,8,0,0,0,0-16H85.74L56.06,32.16A.46.46,0,0,0,56,32l168,95.83Z" />
    </svg>
  );
}

function Chat() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <path d="M224,128A96,96,0,0,1,79.93,211.11h0L42.54,223.58a8,8,0,0,1-10.12-10.12l12.47-37.39h0A96,96,0,1,1,224,128Z" opacity=".2" />
      <path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-4-1.08,7.85,7.85,0,0,0-2.53.42L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Zm12-88a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,96,128Zm88,0a12,12,0,1,1-12-12A12,12,0,0,1,184,128Z" />
    </svg>
  );
}

export default function ChatHelpFab({
  panelLabel = "Help chat",
  headName = "How can we help?",
  greeting = "Tell us what you need. A human answers on weekday afternoons.",
  placeholder = "Write a message",
  inputLabel = "Message",
  sendLabel = "Send message",
  openLabel = "Open help chat",
  closeLabel = "Close help chat",
  groupLabel = "Help button that opens a chat panel",
  loopAsk = "When does it ship?",
  loopDots = "...",
  loopReply = "It leaves first thing tomorrow morning.",
  replyText = "Got it. Hang on a moment.",
  replyDelay = 900,
  panelId = "ch-panel",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff4d1f",
}: ChatHelpFabProps) {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(demo);
  const [draft, setDraft] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusT = useRef<number>(null);
  const replyT = useRef<number>(null);
  const seq = useRef<number>(0);

  useEffect(() => () => {
    if (focusT.current !== null) window.clearTimeout(focusT.current);
    if (replyT.current !== null) window.clearTimeout(replyT.current);
  }, []);

  function toggle() {
    setLive(false);
    const next = !open;
    setOpen(next);
    if (focusT.current !== null) window.clearTimeout(focusT.current);
    if (!next) return;
    // 판이 다 올라온 뒤에 커서를 넣는다
    focusT.current = window.setTimeout(() => {
      const el = inputRef.current;
      if (el) el.focus({ preventScroll: true });
    }, duration);
  }

  // 보낸 말은 진짜로 쌓인다 — 먼저 "..." 이 붙고 잠시 뒤 그 말풍선이 답으로 바뀐다
  function send(e: SubmitEvt) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setLive(false);
    const mineId = (seq.current === null ? 0 : seq.current) + 1;
    const botId = mineId + 1;
    seq.current = botId;
    setLines((prev) => prev.concat([
      { id: mineId, text: text, me: true },
      { id: botId, text: loopDots, me: false },
    ]));
    setDraft("");
    if (replyT.current !== null) window.clearTimeout(replyT.current);
    replyT.current = window.setTimeout(() => {
      setLines((prev) => prev.map((l) => (l.id === botId ? { id: l.id, text: replyText, me: false } : l)));
    }, replyDelay);
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.ch, live ? styles.isDemo : "", open ? styles.isOpen : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <div className={styles.panel} id={panelId} role="dialog" aria-label={panelLabel} aria-modal="false">
        <header className={styles.head}>
          <span className={styles.name}>{headName}</span>
        </header>
        <div className={styles.log} aria-live="polite">
          <p className={[styles.bubble, styles.bubbleBot].join(" ")}>{greeting}</p>
          <p className={[styles.bubble, styles.loopMe].join(" ")} aria-hidden="true">{loopAsk}</p>
          <p className={[styles.bubble, styles.loopDots].join(" ")} aria-hidden="true">{loopDots}</p>
          <p className={[styles.bubble, styles.loopReply].join(" ")} aria-hidden="true">{loopReply}</p>
          {lines.map((l) => (
            <p key={l.id} className={[styles.bubble, l.me ? styles.bubbleMe : styles.bubbleBot].join(" ")}>{l.text}</p>
          ))}
        </div>
        <form className={styles.form} onSubmit={send}>
          <input
            className={styles.input}
            ref={inputRef}
            type="text"
            value={draft}
            placeholder={placeholder}
            aria-label={inputLabel}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
          />
          <button className={styles.send} type="submit" aria-label={sendLabel}>
            <span aria-hidden="true"><Send /></span>
          </button>
        </form>
      </div>
      <button
        className={styles.fab}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? closeLabel : openLabel}
        onClick={toggle}
      >
        <span aria-hidden="true"><Chat /></span>
      </button>
    </section>
  );
}
