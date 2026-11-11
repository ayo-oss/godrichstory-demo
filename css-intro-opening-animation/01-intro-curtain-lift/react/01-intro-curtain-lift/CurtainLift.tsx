// CurtainLift — vanilla 판(run/016/demo/01-intro-curtain-lift/index.html) 의 React 포트.
// 두 겹 가림막이 위아래로 갈라지고 제목이 한 박자 늦게 translateY 로 떠오르는 인트로.
// @keyframes 본문은 vanilla 와 같은 글자다 (값을 다시 타이핑하지 않는다).
// 건너뛰기·Esc·sessionStorage 재방문은 애니메이션을 끊는 것(= 기본 상태)으로 완료 상태를 만든다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CurtainLift.module.scss";

export type CurtainLiftProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 타입에 맞춰 로컬 타입을 쓴다 — 이벤트 제네릭을 react 에서 import 하면 tsc 가 죽는다
type KeyEvt = { key: string };

const KEY = "godrich-intro-016-01";
const TITLE = "새 이야기를 엽니다";
const SUB = "매주 새로운 이야기";
const CTA = "시작하기";
const BRAND = "GODRICH";
const SKIP = "건너뛰기";
const SKIPPED = "인트로를 건너뛰었습니다";

export default function CurtainLift(props: CurtainLiftProps) {
  const duration = props.duration ?? 600;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#2f6df6";
  const [preview, setPreview] = useState<boolean>(true);
  const [done, setDone] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // 인트로를 완료 상태로 보낸다 — 애니메이션을 끄면 기본 상태(열린 화면)가 그대로 드러난다
  const finish = (announce: boolean) => {
    setPreview(false);
    setDone(true);
    try { window.sessionStorage.setItem(KEY, "1"); } catch { }
    if (announce) setMessage(SKIPPED);
  };

  useEffect(() => {
    let seen = false;
    try { seen = window.sessionStorage.getItem(KEY) !== null; } catch { seen = false; }
    if (seen) {
      setPreview(false);
      setDone(true);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyEvt) => { if (e.key === "Escape") finish(true); };
    window.addEventListener("keydown", onKey as (e: KeyboardEvent) => void);
    return () => window.removeEventListener("keydown", onKey as (e: KeyboardEvent) => void);
  }, []);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const rootCls = styles.cl + (preview && !done ? " " + styles.isDemo : "") + (done ? " " + styles.isDone : "");

  return (
    <main className={styles.stage}>
      <div className={rootCls} style={vars}>
        <section className={styles.site}>
          <h1 className={styles.title}>{TITLE}</h1>
          <p className={styles.sub}>{SUB}</p>
          <button className={styles.cta} type="button">{CTA}</button>
        </section>
        <div className={styles.veil + " " + styles.veilTop} aria-hidden="true" />
        <div className={styles.veil + " " + styles.veilBot} aria-hidden="true">
          <span className={styles.brand}>{BRAND}</span>
        </div>
        {!done ? (
          <button className={styles.skip} type="button" onClick={() => finish(true)}>{SKIP}</button>
        ) : null}
        <p className={styles.live} aria-live="polite">{message}</p>
      </div>
    </main>
  );
}
