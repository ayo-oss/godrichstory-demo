import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, ReactNode } from "react";
import styles from "./FooterNewsletter.module.scss";

/* ambient 에 FormEvent 가 없어 파일 안에 필요한 만큼만 선언한다 */
type SubmitEvt = { preventDefault(): void };

export type NewsletterState = "idle" | "sending" | "done" | "error";

export type FooterNewsletterProps = {
  title?: string;
  desc?: string;
  label?: string;
  placeholder?: string;
  sendText?: string;
  idleText?: string;
  sendingText?: string;
  doneText?: string;
  emptyError?: string;
  atError?: string;
  legal?: string;
  /** 입력 대기 → 보냄 → 완료 → 다시 대기 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 무대 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const Plane = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" focusable="false">
    <g fill="currentColor">
      <path d="m223.69 42.18l-58.22 192a8 8 0 0 1-14.92 1.25L108 148l-87.42-42.55a8 8 0 0 1 1.25-14.92l192-58.22a8 8 0 0 1 9.86 9.87" opacity=".2" />
      <path d="M227.32 28.68a16 16 0 0 0-15.66-4.08h-.15L19.57 82.84a16 16 0 0 0-2.49 29.8L102 154l41.3 84.87a15.86 15.86 0 0 0 14.44 9.13q.69 0 1.38-.06a15.88 15.88 0 0 0 14-11.51l58.2-191.94v-.15a16 16 0 0 0-4-15.66m-69.49 203.17l-.05.14v-.07l-40.06-82.3l48-48a8 8 0 0 0-11.31-11.31l-48 48l-82.33-40.06h-.07h.14L216 40Z" />
    </g>
  </svg>
);

const CheckCircle = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="18" height="18" focusable="false">
    <g fill="currentColor">
      <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
      <path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
    </g>
  </svg>
);

export default function FooterNewsletter({
  title = "주간 소식 받기",
  desc = "새 글과 코드 조각을 한 주에 한 번만 보내 드립니다.",
  label = "이메일 주소",
  placeholder = "name@mail.com",
  sendText = "구독",
  idleText = "언제든 한 번에 구독을 끊을 수 있습니다.",
  sendingText = "보내는 중입니다.",
  doneText = "확인 메일을 보냈습니다.",
  emptyError = "이메일 주소를 입력해 주세요.",
  atError = "주소에 @ 가 빠졌습니다.",
  legal = "© 2026 스튜디오",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ffd23f",
}: FooterNewsletterProps): ReactNode {
  const [state, setState] = useState<NewsletterState>("idle");
  const [value, setValue] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loop, setLoop] = useState<boolean>(true);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) { window.clearTimeout(timer.current); }
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const submit = (e: SubmitEvt): void => {
    e.preventDefault();
    setLoop(false);
    if (timer.current !== null) { window.clearTimeout(timer.current); }
    const v = value.trim();
    /* 오류도 같은 aria-live 영역으로 알린다 — 결과가 한 곳에서만 들린다 */
    if (v === "") { setError(emptyError); setState("error"); return; }
    if (v.indexOf("@") < 0) { setError(atError); setState("error"); return; }
    setState("sending");
    timer.current = window.setTimeout(() => setState("done"), 900);
  };

  const onInput = (e: ChangeEvent<HTMLInputElement>): void => {
    setLoop(false);
    setValue(e.target.value);
    if (state === "error") { setState("idle"); }
  };

  const stateClass =
    state === "sending" ? styles.isSending : state === "done" ? styles.isDone : state === "error" ? styles.isError : styles.isIdle;

  return (
    <footer
      className={`${styles.fn} ${stateClass}${loop ? ` ${styles.isDemo}` : ""}`}
      style={vars}
      role="contentinfo"
      onPointerEnter={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <p className={styles.title}>{title}</p>
      <p className={styles.desc}>{desc}</p>

      <form className={styles.form} noValidate onSubmit={submit}>
        <label className={styles.label} htmlFor="fn-mail">{label}</label>
        <div className={styles.row}>
          <input
            className={styles.input}
            id="fn-mail"
            type="email"
            name="email"
            autoComplete="email"
            placeholder={placeholder}
            value={value}
            onChange={onInput}
          />
          <button className={styles.send} type="submit">
            <span className={styles.sendT}>{sendText}</span>
            <span className={styles.icons} aria-hidden="true">
              <span className={`${styles.ic} ${styles.icPlane}`}><Plane /></span>
              <span className={`${styles.ic} ${styles.icLoad}`}><span className={styles.spin} /></span>
              <span className={`${styles.ic} ${styles.icDone}`}><CheckCircle /></span>
            </span>
          </button>
        </div>
        <span className={styles.bar} aria-hidden="true" />
      </form>

      <p className={styles.msg} role="status" aria-live="polite">
        <span className={`${styles.m} ${styles.mIdle}`}>{idleText}</span>
        <span className={`${styles.m} ${styles.mSend}`}>{sendingText}</span>
        <span className={`${styles.m} ${styles.mDone}`}>{doneText}</span>
        <span className={`${styles.m} ${styles.mErr}`}>{error}</span>
      </p>

      <p className={styles.legal}>{legal}</p>
    </footer>
  );
}
