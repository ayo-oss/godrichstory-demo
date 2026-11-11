import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import styles from "./DeleteAccountZone.module.scss";

export type DeleteAccountZoneProps = {
  word?: string;
  head?: string;
  desc?: string;
  label?: string;
  action?: string;
  logs?: { lock: string; open: string; sent: string };
  dialog?: { title: string; body: string; no: string; yes: string };
  duration?: number;
  easing?: string;
  color?: string;
};

// ambient d.ts 에 React 이벤트 제네릭이 없다 — 파일 안 로컬 타입으로 받는다
type KeyEvt = { key: string; preventDefault(): void };
type TextEvt = { target: { value: string } };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const WARNING = (
  <g fill="currentColor">
    <path d="M215.46 216H40.54c-12.62 0-20.54-13.21-14.41-23.91l87.46-151.87c6.3-11 22.52-11 28.82 0l87.46 151.87c6.13 10.7-1.79 23.91-14.41 23.91" opacity=".2" />
    <path d="M236.8 188.09L149.35 36.22a24.76 24.76 0 0 0-42.7 0L19.2 188.09a23.51 23.51 0 0 0 0 23.72A24.35 24.35 0 0 0 40.55 224h174.9a24.35 24.35 0 0 0 21.33-12.19a23.51 23.51 0 0 0 .02-23.72m-13.87 15.71a8.5 8.5 0 0 1-7.48 4.2H40.55a8.5 8.5 0 0 1-7.48-4.2a7.59 7.59 0 0 1 0-7.72l87.45-151.87a8.75 8.75 0 0 1 15 0l87.45 151.87a7.59 7.59 0 0 1-.04 7.72M120 144v-40a8 8 0 0 1 16 0v40a8 8 0 0 1-16 0m20 36a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
  </g>
);

const TRASH = (
  <g fill="currentColor">
    <path d="M200 56v152a8 8 0 0 1-8 8H64a8 8 0 0 1-8-8V56Z" opacity=".2" />
    <path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16M96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0m48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0" />
  </g>
);

export default function DeleteAccountZone({
  word = "DELETE",
  head = "Danger zone",
  desc = "Deleting the account removes your posts and files with it. Type DELETE exactly to confirm.",
  label = "Confirm phrase",
  action = "Delete account",
  logs = {
    lock: "Type DELETE exactly to unlock",
    open: "The delete button is unlocked",
    sent: "Delete request sent",
  },
  dialog = {
    title: "Delete for real?",
    body: "You can undo this within 30 days.",
    no: "Cancel",
    yes: "Yes, delete",
  },
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: DeleteAccountZoneProps) {
  const [demo, setDemo] = useState(true);
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState("");
  const noRef = useRef<HTMLButtonElement>(null);
  const yesRef = useRef<HTMLButtonElement>(null);
  const delRef = useRef<HTMLButtonElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const isLocked = typed !== word;

  // 초점은 확인창이 열리면 안으로, 닫히면 삭제 버튼으로 돌아온다. 언제나 preventScroll
  useEffect(() => {
    if (!demo) {
      const t = open ? noRef.current : delRef.current;
      if (t !== null) t.focus({ preventScroll: true });
    }
  }, [open, demo]);

  function handleInput(e: TextEvt) {
    setDemo(false); // 사람이 만졌으니 자동 루프를 끈다
    setTyped(e.target.value);
    setLive(e.target.value !== word ? logs.lock : logs.open);
  }

  // 초점이 확인창 밖으로 못 나간다
  function trapFocus(e: KeyEvt) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key !== "Tab") return;
    e.preventDefault();
    const current = noRef.current;
    const next = current !== null && document.activeElement === current ? yesRef.current : noRef.current;
    if (next !== null) next.focus({ preventScroll: true });
  }

  return (
    <section
      className={`${styles.dz} ${demo ? styles.isDemo : ""}`}
      data-open={open ? "yes" : "no"}
      style={vars}
    >
      <p className={styles.head}>
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="16" height="16">{WARNING}</svg>
        </span>
        {head}
      </p>
      <p className={styles.desc}>{desc}</p>
      <label className={styles.label} htmlFor="dz-input">{label}</label>
      <span className={styles.slot}>
        <input
          className={styles.input}
          id="dz-input"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={word}
          value={typed}
          onChange={handleInput}
        />
        <span className={styles.ghost} aria-hidden="true">
          <span className={styles.typed}>{word}</span>
        </span>
      </span>
      <button
        className={styles.btn}
        type="button"
        ref={delRef}
        aria-disabled={isLocked}
        onClick={() => { if (!isLocked) setOpen(true); }}
      >
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="14" height="14">{TRASH}</svg>
        </span>
        {action}
      </button>
      <p className={styles.live} role="status" aria-live="polite">
        {live ? (
          live
        ) : (
          <>
            <span className={styles.word} data-word="lock">{logs.lock}</span>
            <span className={styles.word} data-word="open">{logs.open}</span>
          </>
        )}
      </p>
      <span className={styles.scrim} aria-hidden="true" />
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dz-dtitle"
        aria-describedby="dz-dbody"
        onKeyDown={trapFocus}
      >
        <p className={styles.dtitle} id="dz-dtitle">{dialog.title}</p>
        <p className={styles.dbody} id="dz-dbody">{dialog.body}</p>
        <span className={styles.drow}>
          <button
            className={`${styles.dbtn} ${styles.dbtnNo}`}
            type="button"
            ref={noRef}
            onClick={() => setOpen(false)}
          >
            {dialog.no}
          </button>
          <button
            className={`${styles.dbtn} ${styles.dbtnYes}`}
            type="button"
            ref={yesRef}
            onClick={() => { setOpen(false); setLive(logs.sent); }}
          >
            {dialog.yes}
          </button>
        </span>
      </div>
    </section>
  );
}
