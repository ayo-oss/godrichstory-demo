// TitleMaskStagger — vanilla 판(run/016/demo/03-intro-title-mask-stagger/index.html) 의 React 포트.
// 글자마다 overflow: hidden 상자를 씌우고 --i 값만큼 animation-delay 를 줘 한 글자씩 올라오는 인트로.
// @keyframes 본문은 vanilla 와 같은 글자다 (값을 다시 타이핑하지 않는다).
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TitleMaskStagger.module.scss";

export type TitleMaskStaggerProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--i"?: number };
// ambient 타입에 맞춰 로컬 타입을 쓴다 — 이벤트 제네릭을 react 에서 import 하면 tsc 가 죽는다
type KeyEvt = { key: string };

const KEY = "godrich-intro-016-03";
const WORD = "GODRICH";
const LETTERS = WORD.split("");
const SUB = "이야기가 쌓이는 곳";
const GO = "구독하기";
const SKIP = "건너뛰기";
const SKIPPED = "인트로를 건너뛰었습니다";

export default function TitleMaskStagger(props: TitleMaskStaggerProps) {
  const duration = props.duration ?? 600;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#17141a";
  const [preview, setPreview] = useState<boolean>(true);
  const [done, setDone] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // 인트로를 완료 상태로 보낸다 — 낱글자의 기본 상태는 올라온 자리라 애니메이션을 끄면 제목이 완성되어 있다
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
  const rootCls = styles.tt + (preview && !done ? " " + styles.isDemo : "") + (done ? " " + styles.isDone : "");

  return (
    <main className={styles.stage}>
      <div className={rootCls} style={vars}>
        <h1 className={styles.row} aria-label={WORD}>
          {LETTERS.map((ch, i) => (
            <span className={styles.box} aria-hidden="true" key={i} style={{ "--i": i } as CSSProperties}>
              <span className={styles.ch}>{ch}</span>
            </span>
          ))}
        </h1>
        <span className={styles.line} aria-hidden="true" />
        <div className={styles.mbox}><p className={styles.sub}>{SUB}</p></div>
        <div className={styles.mbox}><button className={styles.go} type="button">{GO}</button></div>
        {!done ? (
          <button className={styles.skip} type="button" onClick={() => finish(true)}>{SKIP}</button>
        ) : null}
        <p className={styles.live} aria-live="polite">{message}</p>
      </div>
    </main>
  );
}
