// GlitchBoot — vanilla 판(run/016/demo/08-intro-glitch-boot/index.html) 의 React 포트.
// 제목이 clip-path 로 잘린 두 겹으로 어긋났다가 잔상이 수렴하며 한 줄로 붙는다. 해독·타이핑 아님.
// @keyframes 본문은 vanilla 와 같은 글자다 (값을 다시 타이핑하지 않는다).
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GlitchBoot.module.scss";

export type GlitchBootProps = {
  duration?: number;   // ms — 실제 인트로(한 번 재생) 길이
  easing?: string;
  color?: string;      // 글리치 잔상 A 색
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string };
type AnimEvt = { target: unknown; currentTarget: unknown };

const KEY = "godrich-intro08-seen";
const LABEL = "사이트 첫 화면";
const KICKER = "신작 발표";
const TITLE = "네온 아케이드";
const SUB = "오늘 밤 8시, 신작 공개";
const CTA = "알림 받기";
const SKIP = "건너뛰기";
const STATUS_PLAY = "인트로 재생 중";
const STATUS_DONE = "인트로가 끝났습니다";

export default function GlitchBoot(props: GlitchBootProps) {
  const duration = props.duration ?? 600;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
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
        className={styles.gl + (preview ? " " + styles.isDemo : "") + (done ? " " + styles.isDone : "")}
        style={vars}
        aria-label={LABEL}
        onPointerDown={() => setPreview(false)}
      >
        <div className={styles.head}>
          <p className={styles.kicker}>{KICKER}</p>
          <div className={styles.titlewrap}>
            <h1 className={styles.title}>{TITLE}</h1>
            <span className={styles.slice + " " + styles.sliceA} aria-hidden="true">{TITLE}</span>
            <span className={styles.slice + " " + styles.sliceB} aria-hidden="true">{TITLE}</span>
          </div>
        </div>
        <div
          className={styles.aside}
          onAnimationEnd={(e: AnimEvt) => { if (e.target === e.currentTarget) setDone(true); }}
        >
          <p className={styles.sub}>{SUB}</p>
          <button className={styles.cta} type="button">{CTA}</button>
        </div>
        <button className={styles.skip} type="button" onClick={() => setDone(true)}>{SKIP}</button>
        <p className={styles.sr} aria-live="polite">{done ? STATUS_DONE : STATUS_PLAY}</p>
      </section>
    </main>
  );
}
