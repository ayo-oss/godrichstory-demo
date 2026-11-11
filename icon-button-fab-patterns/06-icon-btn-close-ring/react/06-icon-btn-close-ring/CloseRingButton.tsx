import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CloseRingButton.module.scss";

export type CloseRingButtonProps = {
  msg?: string;
  /** 닫은 뒤 남는 줄 */
  goneText?: string;
  undoLabel?: string;
  closeLabel?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  /** 점선 링이 한 바퀴 도는 시간(ms) */
  duration?: number;
  easing?: string;
  /** 아이콘과 초점 테두리의 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

// react ambient 에 KeyboardEvent 가 없어 쓰는 자리에 맞춰 직접 좁게 선언한다
type KeyEvt = { key: string };

function X() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <path d="M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z" opacity=".2" />
      <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
    </svg>
  );
}

export default function CloseRingButton({
  msg = "Your 10% first-order coupon is good for ten more days",
  goneText = "Notice closed",
  undoLabel = "Undo",
  closeLabel = "Close notice",
  groupLabel = "Notice card with a close button that keeps circling",
  demo = true,
  duration = 900,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: CloseRingButtonProps) {
  const [gone, setGone] = useState(false);
  const [live, setLive] = useState(demo);
  const [refocus, setRefocus] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 닫기 버튼은 접힌 뒤 display:none 이라, 되돌린 다음 프레임에서 초점을 준다
  useEffect(() => {
    if (!refocus) return;
    setRefocus(false);
    if (btnRef.current) btnRef.current.focus({ preventScroll: true });
  }, [refocus]);

  function close() {
    setLive(false);
    setGone(true);
  }

  function undo() {
    setGone(false);
    setRefocus(true);
  }

  function onKey(e: KeyEvt) {
    if (e.key === "Escape") undo();
  }

  const cls = [styles.cl, live ? styles.isDemo : "", gone ? styles.isGone : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel} onKeyDown={onKey}>
      <article className={styles.card}>
        <p className={styles.msg}>{msg}</p>
        <p className={styles.undo} aria-live="polite">
          {gone ? goneText : ""}{" "}
          <button className={styles.back} type="button" onClick={undo}>
            {undoLabel}
          </button>
        </p>
        <button className={styles.btn} type="button" aria-label={closeLabel} onClick={close} ref={btnRef}>
          {/* 호버·:focus-visible 에서만 도는 점선 링 */}
          <span className={styles.ring} aria-hidden="true" />
          <span className={styles.x} aria-hidden="true">
            <X />
          </span>
        </button>
      </article>
    </section>
  );
}
