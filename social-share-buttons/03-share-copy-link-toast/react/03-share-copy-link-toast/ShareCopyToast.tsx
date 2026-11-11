import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShareCopyToast.module.scss";

/* ambient 에 React 의 이벤트 제네릭·타이머 타입이 없어 필요한 것만 로컬로 선언한다 */
type Box<T> = { current: T };
type InputEl = { value: string; select(): void };

export type ShareCopyToastProps = {
  /** 복사될 주소 */
  url?: string;
  /** 누름 → 복사 → 토스트 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 완료 상태 색 */
  color?: string;
  autoPlay?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ShareCopyToast({
  url = "https://example.com/posts/share-ui",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#17694a",
  autoPlay = true,
}: ShareCopyToastProps) {
  const [demo, setDemo] = useState(autoPlay);
  const [done, setDone] = useState(false);
  const [bad, setBad] = useState(false);
  const [message, setMessage] = useState("주소를 복사했습니다");
  const inputRef = useRef<InputEl>(null) as Box<InputEl | null>;
  const timerRef = useRef<number>(0) as Box<number>;

  /* 사람이 손을 대면 자동 재생을 끈다 */
  function stopDemo() {
    setDemo(false);
  }

  function showResult(text: string, failed: boolean) {
    setMessage(text);
    setBad(failed);
    setDone(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDone(false), 1800) as unknown as number;
  }

  function applyCopy() {
    stopDemo();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        () => showResult("주소를 복사했습니다", false),
        () => showResult("복사가 막혔습니다. 직접 선택해 주세요", true)
      );
      return;
    }
    /* 클립보드 API 가 없는 환경의 대비책 */
    if (inputRef.current) inputRef.current.select();
    showResult("주소를 선택했습니다. 직접 복사해 주세요", true);
  }

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const rootClass =
    styles.copy + (done ? " " + styles.isDone : "") + (bad ? " " + styles.isBad : "");

  return (
    <div className={styles.stage + (demo ? " " + styles.isDemo : "")} style={vars}>
      <section className={rootClass} aria-label="링크 복사">
        <p className={styles.label}>공유 주소</p>
        <div className={styles.field}>
          <input
            className={styles.url}
            type="text"
            defaultValue={url}
            readOnly
            aria-label="공유 주소"
            ref={inputRef as unknown as never}
            onFocus={stopDemo}
          />
          <button className={styles.btn} type="button" onClick={applyCopy} onPointerDown={stopDemo}>
            <span className={styles.ics} aria-hidden="true">
              <span className={styles.ic + " " + styles.icCopy}><svg width="18" height="18" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M216,40V168H168V88H88V40Z" opacity="0.2"/><path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/></svg></span>
              <span className={styles.ic + " " + styles.icDone}><svg width="18" height="18" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M232,56V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Z" opacity="0.2"/><path d="M205.66,85.66l-96,96a8,8,0,0,1-11.32,0l-40-40a8,8,0,0,1,11.32-11.32L104,164.69l90.34-90.35a8,8,0,0,1,11.32,11.32Z"/></svg></span>
            </span>
            <span className={styles.btnLabel}>복사</span>
          </button>
        </div>

        <p className={styles.toast} role="status" aria-live="polite">
          <span className={styles.toastIcs} aria-hidden="true">
            <span className={styles.toastIc + " " + styles.toastIcOk}><svg width="16" height="16" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M232,56V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Z" opacity="0.2"/><path d="M205.66,85.66l-96,96a8,8,0,0,1-11.32,0l-40-40a8,8,0,0,1,11.32-11.32L104,164.69l90.34-90.35a8,8,0,0,1,11.32,11.32Z"/></svg></span>
            <span className={styles.toastIc + " " + styles.toastIcBad}><svg width="16" height="16" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z" opacity="0.2"/><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg></span>
          </span>
          <span className={styles.toastText}>{message}</span>
        </p>
      </section>
    </div>
  );
}
