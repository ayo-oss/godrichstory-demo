import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LeadMagnetDownload.module.scss";

export type LeadMagnetDownloadProps = {
  /** 격자 미리보기용 루프 길이(ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type FormEvt = { preventDefault(): void };
type InputEvt = { target: { value: string } };
type CheckEvt = { target: { checked: boolean } };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const storageKey = "lead271";

function FilePdf() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true">
      <g fill="currentColor">
        <path d="M208 88h-56V32Z" opacity=".2" />
        <path d="M224 152a8 8 0 0 1-8 8h-24v16h16a8 8 0 0 1 0 16h-16v16a8 8 0 0 1-16 0v-56a8 8 0 0 1 8-8h32a8 8 0 0 1 8 8M92 172a28 28 0 0 1-28 28h-8v8a8 8 0 0 1-16 0v-56a8 8 0 0 1 8-8h16a28 28 0 0 1 28 28m-16 0a12 12 0 0 0-12-12h-8v24h8a12 12 0 0 0 12-12m88 8a36 36 0 0 1-36 36h-16a8 8 0 0 1-8-8v-56a8 8 0 0 1 8-8h16a36 36 0 0 1 36 36m-16 0a20 20 0 0 0-20-20h-8v40h8a20 20 0 0 0 20-20M40 112V40a16 16 0 0 1 16-16h96a8 8 0 0 1 5.66 2.34l56 56A8 8 0 0 1 216 88v24a8 8 0 0 1-16 0V96h-48a8 8 0 0 1-8-8V40H56v72a8 8 0 0 1-16 0m120-32h28.69L160 51.31Z" />
      </g>
    </svg>
  );
}

function DownloadSimple() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true">
      <g fill="currentColor">
        <path d="M216 48v160H40V48a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
        <path d="M224 144v64a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8v-64a8 8 0 0 1 16 0v56h160v-56a8 8 0 0 1 16 0m-101.66 5.66a8 8 0 0 0 11.32 0l40-40a8 8 0 0 0-11.32-11.32L136 124.69V32a8 8 0 0 0-16 0v92.69L93.66 98.34a8 8 0 0 0-11.32 11.32Z" />
      </g>
    </svg>
  );
}

function LockSimpleOpen() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true">
      <g fill="currentColor">
        <path d="M216 96v112a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
        <path d="M208 80H96V56a32 32 0 0 1 32-32c15.37 0 29.2 11 32.16 25.59a8 8 0 0 0 15.68-3.18C171.32 24.15 151.2 8 128 8a48.05 48.05 0 0 0-48 48v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16m0 128H48V96h160z" />
      </g>
    </svg>
  );
}

export default function LeadMagnetDownload({
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: LeadMagnetDownloadProps) {
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const [msg, setMsg] = useState("이메일만 넣으면 바로 받을 수 있어요");
  const [loop, setLoop] = useState(true);

  // 한 번 받은 사람은 localStorage 에 남겨 다음 방문에 곧장 완료 상태로 연다
  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey)) {
        setDone(true);
        setMsg("자료가 준비됐어요. 아래에서 받으세요");
      }
    } catch {
      // iframe 이 저장소를 막으면 처음 받는 사람과 똑같이 논다
    }
  }, []);

  function onSubmit(e: FormEvt) {
    e.preventDefault();
    setLoop(false);
    if (!emailPattern.test(email) || !agreed) {
      setShake(false);
      requestAnimationFrame(() => setShake(true));
      setMsg("이메일과 동의 칸을 확인해 주세요");
      return;
    }
    setBusy(true);
    setMsg("파일을 준비하고 있어요");
    setTimeout(() => {
      setBusy(false);
      try {
        localStorage.setItem(storageKey, "1");
      } catch {
        // 저장 실패해도 이번 화면은 완료로 간다
      }
      setDone(true);
      setMsg("자료가 준비됐어요. 아래에서 받으세요");
    }, 900);
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.lm, loop ? styles["is-demo"] : "", busy ? styles["is-busy"] : "", done ? styles["is-done"] : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <form className={cls} style={vars} onSubmit={onSubmit} onPointerDown={() => setLoop(false)} noValidate>
      <p className={styles.lm__title}>시작 가이드 무료로 받기</p>
      <p className={styles.lm__file}>
        <span className={styles["lm__file-ic"]} aria-hidden="true"><FilePdf /></span>
        vibe-start-guide.pdf · 2.4MB
      </p>
      <label className={styles.lm__lab} htmlFor="lm-email-r">이메일 주소</label>
      <input
        className={[styles.lm__in, shake ? styles["is-shake"] : ""].filter(Boolean).join(" ")}
        id="lm-email-r"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={(e: InputEvt) => setEmail(e.target.value)}
        onAnimationEnd={() => setShake(false)}
      />
      <label className={styles.lm__agree} htmlFor="lm-ok-r">
        <input
          className={styles.lm__cb}
          id="lm-ok-r"
          type="checkbox"
          checked={agreed}
          onChange={(e: CheckEvt) => setAgreed(e.target.checked)}
        />
        <span>업데이트 소식도 받을게요 (언제든 해지)</span>
      </label>
      <button className={styles.lm__btn} type="submit" disabled={busy} aria-busy={busy}>
        <span className={styles.lm__prog} aria-hidden="true" />
        <span className={styles["lm__btn-t"]}>
          <span className={styles["lm__btn-ic"]} aria-hidden="true"><DownloadSimple /></span>
          자료 받기
        </span>
      </button>
      <p className={styles.lm__msg} role="status" aria-live="polite">{msg}</p>
      <a
        className={styles.lm__chip}
        href="data:text/plain,vibe-start-guide%20sample"
        download="vibe-start-guide.txt"
      >
        <span className={styles["lm__chip-ic"]} aria-hidden="true"><LockSimpleOpen /></span>
        다운로드 준비됨 — 눌러서 받기
      </a>
    </form>
  );
}
