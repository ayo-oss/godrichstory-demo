// ColorFlood — vanilla 판(run/016/demo/09-intro-color-flood/index.html) 의 React 포트.
// 색 띠 세 장이 scaleX 로 차례로 화면을 훑고 지나가며, 마지막 띠가 오른쪽으로 접혀 빠지면 콘텐츠가 남는다.
// @keyframes 본문은 vanilla 와 같은 글자다 (값을 다시 타이핑하지 않는다).
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ColorFlood.module.scss";

export type ColorFloodProps = {
  duration?: number;   // ms — 실제 인트로(띠 셋 훑기 + 안착) 한 번의 길이
  easing?: string;
  color?: string;      // 첫 번째 띠 색
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string };
type AnimEvt = { target: unknown; currentTarget: unknown };

const KEY = "godrich-intro09-seen";
const LABEL = "사이트 첫 화면";
const KICKER = "2026 컬렉션";
const TITLE = "컬러 스튜디오";
const SUB = "색으로 짠 새 컬렉션";
const CTA = "컬렉션 보기";
const SKIP = "건너뛰기";
const STATUS_PLAY = "인트로 재생 중";
const STATUS_DONE = "인트로가 끝났습니다";

export default function ColorFlood(props: ColorFloodProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#2f6df6";
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
        className={styles.cf + (preview ? " " + styles.isDemo : "") + (done ? " " + styles.isDone : "")}
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
        <div className={styles.band + " " + styles.band1} aria-hidden="true" />
        <div className={styles.band + " " + styles.band2} aria-hidden="true" />
        <div className={styles.band + " " + styles.band3} aria-hidden="true" />
        <button className={styles.skip} type="button" onClick={() => setDone(true)}>{SKIP}</button>
        <p className={styles.sr} aria-live="polite">{done ? STATUS_DONE : STATUS_PLAY}</p>
      </section>
    </main>
  );
}
