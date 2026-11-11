// LogoAssemble — vanilla 판(run/016/demo/02-intro-logo-assemble/index.html) 의 React 포트.
// 사방에서 날아온 조각 네 개가 animation-delay 를 한 칸씩 달리해 가운데로 모이는 인트로.
// @keyframes 본문은 vanilla 와 같은 글자다 (값을 다시 타이핕하지 않는다).
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LogoAssemble.module.scss";

export type LogoAssembleProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 타입에 맞춰 로컬 타입을 쓴다 — 이벤트 제네릭을 react 에서 import 하면 tsc 가 죽는다
type KeyEvt = { key: string };

const KEY = "godrich-intro-016-02";
const WORD = "GODRICH";
const TAG = "새 브랜드의 첫 인사";
const GO = "둘러보기";
const SKIP = "건너뛰기";
const SKIPPED = "인트로를 건너뛰었습니다";

export default function LogoAssemble(props: LogoAssembleProps) {
  const duration = props.duration ?? 600;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#2f6df6";
  const [preview, setPreview] = useState<boolean>(true);
  const [done, setDone] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // 인트로를 완료 상태로 보낸다 — 조각의 기본 상태는 맞춰진 자리라 애니메이션을 끄면 로고가 완성되어 있다
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
  const rootCls = styles.la + (preview && !done ? " " + styles.isDemo : "") + (done ? " " + styles.isDone : "");

  return (
    <main className={styles.stage}>
      <div className={rootCls} style={vars}>
        <div className={styles.mark} aria-hidden="true">
          <i className={styles.q + " " + styles.qTl} />
          <i className={styles.q + " " + styles.qTr} />
          <i className={styles.q + " " + styles.qBr} />
          <i className={styles.q + " " + styles.qBl} />
        </div>
        <p className={styles.word}>{WORD}</p>
        <p className={styles.tag}>{TAG}</p>
        <button className={styles.go} type="button">{GO}</button>
        {!done ? (
          <button className={styles.skip} type="button" onClick={() => finish(true)}>{SKIP}</button>
        ) : null}
        <p className={styles.live} aria-live="polite">{message}</p>
      </div>
    </main>
  );
}
