// ShakeError — 고개 젓는 실패. vanilla 판과 같은 마크업·타이밍.
// 정답은 가짜 값 guest — 실제 계정·비밀번호 문자열은 이 데모에 없다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShakeError.module.scss";

export type ShakeErrorProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string };
type InpEvt = { target: { value: string } };

const ANSWER = "guest";
const HINT_TEXT = "값이 틀리면 캐릭터가 고개를 젓습니다";
const CHAR_LABEL = "고개를 젓는 마스코트";
const LABEL_TEXT = "아이디";
const PLACEHOLDER = "예: guest";
const GO_TEXT = "로그인";
const ERROR_TEXT = "아이디를 다시 확인해 주세요";

export default function ShakeError({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: ShakeErrorProps) {
  const [value, setValue] = useState("");
  const [demo, setDemo] = useState(true);
  const [no, setNo] = useState(false);
  const [shake, setShake] = useState(false);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  function judge() {
    setDemo(false);
    const ok = value.trim().toLowerCase() === ANSWER;
    setNo(!ok);
    if (ok) return;
    setShake(false);
    // 두 프레임을 건너 뛰어 흔들림을 처음부터 다시 튀긴다 (vanilla 의 void offsetWidth 와 같은 역할)
    requestAnimationFrame(() => { requestAnimationFrame(() => setShake(true)); });
  }

  const cls = [
    styles.root,
    demo ? styles.isDemo : "",
    no ? styles.no : "",
    shake ? styles.shake : "",
  ].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-smiley" viewBox="0 0 256 256" fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88M80 108a12 12 0 1 1 12 12a12 12 0 0 1-12-12m96 0a12 12 0 1 1-12-12a12 12 0 0 1 12 12m-1.08 48c-10.29 17.79-27.39 28-46.92 28s-36.63-10.2-46.92-28a8 8 0 1 1 13.84-8c7.47 12.91 19.21 20 33.08 20s25.61-7.1 33.08-20a8 8 0 1 1 13.84 8"/></symbol>
          <symbol id="ico-smiley-sad" viewBox="0 0 256 256" fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88M80 108a12 12 0 1 1 12 12a12 12 0 0 1-12-12m96 0a12 12 0 1 1-12-12a12 12 0 0 1 12 12m-1.08 64a8 8 0 1 1-13.84 8c-7.47-12.91-19.21-20-33.08-20s-25.61 7.1-33.08 20a8 8 0 1 1-13.84-8c10.29-17.79 27.39-28 46.92-28s36.63 10.2 46.92 28"/></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-smiley" /></svg>
          <span>{HINT_TEXT}</span>
        </p>
        <div className={styles.row}>
          <div className={styles.char} aria-label={CHAR_LABEL} role="img">
            <span className={styles.body}>
              <span className={styles.head}>
                <span className={`${styles.face} ${styles.faceOk}`}>
                  <i className={`${styles.eye} ${styles.eyeL}`}></i>
                  <i className={`${styles.eye} ${styles.eyeR}`}></i>
                  <i className={`${styles.cheek} ${styles.cheekL}`}></i>
                  <i className={`${styles.cheek} ${styles.cheekR}`}></i>
                  <i className={`${styles.mouth} ${styles.mouthSmile}`}></i>
                </span>
                <span className={`${styles.face} ${styles.faceNo}`}>
                  <i className={`${styles.eye} ${styles.eyeL}`}></i>
                  <i className={`${styles.eye} ${styles.eyeR}`}></i>
                  <i className={`${styles.brow} ${styles.browL}`}></i>
                  <i className={`${styles.brow} ${styles.browR}`}></i>
                  <i className={`${styles.cheek} ${styles.cheekL}`}></i>
                  <i className={`${styles.cheek} ${styles.cheekR}`}></i>
                  <i className={`${styles.mouth} ${styles.mouthFrown}`}></i>
                </span>
              </span>
            </span>
            <span className={styles.shadow}></span>
          </div>
          <div className={styles.form}>
            <label className={styles.label} htmlFor="mbField">{LABEL_TEXT}</label>
            <div className={styles.box} onAnimationEnd={() => setShake(false)}>
              <input
                className={styles.input}
                id="mbField"
                type="text"
                placeholder={PLACEHOLDER}
                autoComplete="off"
                value={value}
                onChange={(e: InpEvt) => { setValue(e.target.value); setDemo(false); }}
                onKeyDown={(e: KeyEvt) => { if (e.key === "Enter") judge(); }}
              />
              <button className={styles.go} type="button" onClick={judge}>{GO_TEXT}</button>
            </div>
            <p className={styles.error} role="alert" aria-live="assertive">
              <svg className={styles.errIco} aria-hidden="true"><use href="#ico-smiley-sad" /></svg>
              <span>{ERROR_TEXT}</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
