// SplitScreenOpen — vanilla 판(run/016/demo/07-intro-split-screen-open/index.html) 의 React 포트.
// 좌우 반쪽이 translateX 로 반대 방향으로 빠지며 첫 화면이 드러난다.
// @keyframes 본문은 vanilla 와 같은 글자다 (값을 다시 타이핑하지 않는다).
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SplitScreenOpen.module.scss";

export type SplitScreenOpenProps = {
  duration?: number;   // ms — 실제 인트로(한 번 재생) 길이
  easing?: string;
  color?: string;      // 왼쪽 반쪽 면색
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string };
type AnimEvt = { target: unknown; currentTarget: unknown };

const KEY = "godrich-intro07-seen";
const LABEL = "사이트 첫 화면";
const KICKER = "에디션 12";
const TITLE = "이야기 공작소";
const SUB = "매주 금요일, 짧은 이야기 하나";
const CTA = "구독하기";
const WORD_L = "이야기";
const WORD_R = "공작소";
const SKIP = "건너뛰기";
const STATUS_PLAY = "인트로 재생 중";
const STATUS_DONE = "인트로가 끝났습니다";

export default function SplitScreenOpen(props: SplitScreenOpenProps) {
  const duration = props.duration ?? 600;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#0a4fe8";
  // 한 번 본 브라우저에서는 처음부터 완료 상태
  const [done, setDone] = useState<boolean>(() => {
    try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
  });
  const [preview, setPreview] = useState<boolean>(true);

  useEffect(() => {
    if (!done) return;
    try { sessionStorage.setItem(KEY, "1"); } catch { /* 저장 불가 환경 무시 */ }
  }, [done]);

  useEffect(() => {
    const onKey = (e: KeyEvt) => { if (e.key === "Escape") setDone(true); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <section
        className={styles.scr + (preview ? " " + styles.isDemo : "") + (done ? " " + styles.isDone : "")}
        style={vars}
        aria-label={LABEL}
        onPointerDown={() => setPreview(false)}
      >
        <div
          className={styles.content}
          onAnimationEnd={(e: AnimEvt) => { if (e.target === e.currentTarget) setDone(true); }}
        >
          <p className={styles.kicker}>{KICKER}</p>
          <h1 className={styles.title}>{TITLE}</h1>
          <p className={styles.sub}>{SUB}</p>
          <button className={styles.cta} type="button">{CTA}</button>
        </div>
        <div className={styles.panel + " " + styles.panelL} aria-hidden="true">
          <span className={styles.word}>{WORD_L}</span>
        </div>
        <div className={styles.panel + " " + styles.panelR} aria-hidden="true">
          <span className={styles.word}>{WORD_R}</span>
        </div>
        <span className={styles.seam} aria-hidden="true" />
        <button className={styles.skip} type="button" onClick={() => setDone(true)}>{SKIP}</button>
        <p className={styles.sr} aria-live="polite">{done ? STATUS_DONE : STATUS_PLAY}</p>
      </section>
    </main>
  );
}
