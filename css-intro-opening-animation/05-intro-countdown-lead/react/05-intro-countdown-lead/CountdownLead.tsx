// CountdownLead — vanilla 판(run/016/demo/05-intro-countdown-lead/index.html) 의 React 포트.
// 3·2·1 이 steps(1, end) 컷으로 갈아 끼워지고 숫자마다 scale 팝·카운트 전체 dolly-in 이 따라온다.
// 스킵 버튼·Esc·sessionStorage 재방문 처리를 훅으로 옮겼고, @keyframes 본문은 vanilla 와 같은 글자다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CountdownLead.module.scss";

export type CountdownLeadProps = {
  duration?: number;              // ms — 미리보기 루프 주기
  easing?: string;                // 숫자 팝 이징
  color?: string;                 // 숫자색
  storageKey?: string;            // sessionStorage 키 — 편마다 다르게
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string };

const KICKER = "실시간 라이브";
const TITLE = "오늘 밤 아홉 시";
const SUB = "카운트다운이 끝나면 바로 입장합니다";
const CTA = "입장하기";
const TAG = "곧 시작합니다";
const SKIP = "건너뛰기";
const MSG_SKIP = "인트로를 건너뛰었습니다";
const MSG_AGAIN = "이미 본 인트로라 바로 열었습니다";

export default function CountdownLead(props: CountdownLeadProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
  const color = props.color ?? "#ffd23f";
  const key = props.storageKey ?? "intro05-seen";
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
      /* sessionStorage 접근이 막히면 그냥 카운트다운을 보여준다 */
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
        <div className={styles.site}>
          <div className={styles.box}>
            <p className={styles.kicker}>{KICKER}</p>
            <h1 className={styles.title}>{TITLE}</h1>
            <p className={styles.sub}>{SUB}</p>
            <a className={styles.cta} href="#">{CTA}</a>
          </div>
        </div>
        <div className={styles.nums} aria-hidden="true">
          <span className={styles.n + " " + styles.n3}><span className={styles.pop}>3</span></span>
          <span className={styles.n + " " + styles.n2}><span className={styles.pop}>2</span></span>
          <span className={styles.n + " " + styles.n1}><span className={styles.pop}>1</span></span>
          <span className={styles.tag}>{TAG}</span>
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
