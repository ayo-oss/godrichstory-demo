// LineDrawFrame — vanilla 판(run/016/demo/06-intro-line-draw-frame/index.html) 의 React 포트.
// SVG rect 를 pathLength 100 으로 고정하고 stroke-dashoffset 100 → 0 으로 한 붓 그리기를 만든다.
// 스킵 버튼·Esc·sessionStorage 재방문 처리를 훅으로 옮겼고, @keyframes 본문은 vanilla 와 같은 글자다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LineDrawFrame.module.scss";

export type LineDrawFrameProps = {
  duration?: number;              // ms — 미리보기 루프 주기
  easing?: string;                // 한 붓의 이징
  color?: string;                 // 테두리 선색
  storageKey?: string;            // sessionStorage 키 — 편마다 다르게
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string };

const KICKER = "가을 특별전";
const TITLE = "선의 방주";
const SUB = "10월 4일부터 28일까지";
const SKIP = "건너뛰기";
const MSG_SKIP = "인트로를 건너뛰었습니다";
const MSG_AGAIN = "이미 본 인트로라 바로 열었습니다";

export default function LineDrawFrame(props: LineDrawFrameProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#17141a";
  const key = props.storageKey ?? "intro06-seen";
  const [msg, setMsg] = useState<string>("");
  const [done, setDone] = useState<boolean>(() => {
    try {
      return !!sessionStorage.getItem(key);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (sessionStorage.getItem(key)) setMsg(MSG_AGAIN);
    } catch {
      /* sessionStorage 접근이 막히면 그냥 그리기를 보여준다 */
    }
  }, [key]);

  function skipNow() {
    setDone(true);
    setMsg(MSG_SKIP);
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* 접근이 막힌 브라우저는 저장 없이 진행 */
    }
  }

  useEffect(() => {
    function onKey(e: KeyEvt) {
      if (e.key === "Escape") skipNow();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [key]);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={styles.root + (done ? "" : " " + styles.isDemo)} style={vars}>
        <figure className={styles.frame}>
          <svg className={styles.svg} viewBox="0 0 320 200" aria-hidden="true" focusable="false">
            <rect className={styles.rect} x="6" y="6" width="308" height="188" rx="8" pathLength="100" />
          </svg>
          <div className={styles.inner}>
            <p className={styles.kicker}>{KICKER}</p>
            <h1 className={styles.title}>{TITLE}</h1>
            <p className={styles.sub}>{SUB}</p>
          </div>
        </figure>
        {!done && (
          <button className={styles.skip} type="button" onClick={skipNow}>
            {SKIP}
          </button>
        )}
        <p className={styles.sr} aria-live="polite">{msg}</p>
      </div>
    </main>
  );
}
