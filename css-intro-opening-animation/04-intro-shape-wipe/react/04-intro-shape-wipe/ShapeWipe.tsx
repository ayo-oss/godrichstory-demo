// ShapeWipe — vanilla 판(run/016/demo/04-intro-shape-wipe/index.html) 의 React 포트.
// 잉크 덮개 위의 첫 화면이 clip-path: circle() 하나로 중앙의 점에서부터 펼쳐지는 원형 마스크 와이프.
// 스킵 버튼·Esc·sessionStorage 재방문 처리를 훅으로 옮겼고, @keyframes 본문은 vanilla 와 같은 글자다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShapeWipe.module.scss";

export type ShapeWipeProps = {
  duration?: number;              // ms — 미리보기 루프 주기
  easing?: string;                // 원의 확장 이징
  color?: string;                 // CTA 면색
  storageKey?: string;            // sessionStorage 키 — 편마다 다르게
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string };

const KICKER = "포트폴리오 2026";
const TITLE = "빛으로 그리는 화면";
const SUB = "스크롤하면 프로젝트가 이어집니다";
const CTA = "프로젝트 보기";
const SKIP = "건너뛰기";
const MSG_SKIP = "인트로를 건너뛰었습니다";
const MSG_AGAIN = "이미 본 인트로라 바로 열었습니다";

export default function ShapeWipe(props: ShapeWipeProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "ease-out";
  const color = props.color ?? "#0a4fe8";
  const key = props.storageKey ?? "intro04-seen";
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
      /* sessionStorage 접근이 막히면 그냥 인트로를 보여준다 */
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
      <div className={styles.root + (done ? "" : " " + styles.isDemo)} id="iw" style={vars}>
        <div className={styles.cover} aria-hidden="true"><span className={styles.seed} /></div>
        <div className={styles.site}>
          <div className={styles.box}>
            <p className={styles.kicker}>{KICKER}</p>
            <h1 className={styles.title}>{TITLE}</h1>
            <p className={styles.sub}>{SUB}</p>
            <a className={styles.cta} href="#">{CTA}</a>
          </div>
        </div>
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
