// CuteCookieBiteCounter — vanilla 판(run/075/demo/09-cute-cookie-bite-counter) 의 React 포트.
// 누를 때마다 한 입: 쿠키가 네 단계로 줄고(data-bite) 볼이 부푼다. 다 먹으면 다시 단추가 나타난다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CuteCookieBiteCounter.module.scss";

export type CuteCookieBiteCounterProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CuteCookieBiteCounter(props: CuteCookieBiteCounterProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
  const color = props.color ?? "#4cd4a6";
  const [bites, setBites] = useState<number>(0);
  const [preview, setPreview] = useState<boolean>(true);
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const done = bites >= 4;

  return (
    <main className={styles.stage}>
      <div
        className={styles.ck + (preview ? " " + styles.isDemo : "")}
        style={vars}
        data-bite={Math.min(bites, 4)}
      >
        <button
          className={styles.hit}
          type="button"
          aria-label="쿠키 한 입 먹기"
          onClick={() => { if (!done) { setBites(bites + 1); } }}
          onPointerDown={() => setPreview(false)}
        >
          <span className={styles.scene} aria-hidden="true">
            <span className={styles.cookieWrap}>
              <span className={styles.cookie} key={"bite" + bites}>
                <span className={styles.chip + " " + styles.chip1}></span>
                <span className={styles.chip + " " + styles.chip2}></span>
                <span className={styles.chip + " " + styles.chip3}></span>
                <span className={styles.chip + " " + styles.chip4}></span>
                <span className={styles.chip + " " + styles.chip5}></span>
                <span className={styles.crumb + " " + styles.crumb1}></span>
                <span className={styles.crumb + " " + styles.crumb2}></span>
                <span className={styles.crumb + " " + styles.crumb3}></span>
              </span>
            </span>
            <span className={styles.char}>
              <span className={styles.eye + " " + styles.eyeL}></span>
              <span className={styles.eye + " " + styles.eyeR}></span>
              <span className={styles.sad + " " + styles.sadL}></span>
              <span className={styles.sad + " " + styles.sadR}></span>
              <span className={styles.cheek + " " + styles.cheekL}></span>
              <span className={styles.cheek + " " + styles.cheekR}></span>
              <span className={styles.mouth}></span>
              <span className={styles.arm}></span>
            </span>
          </span>
        </button>
        {done ? (
          <button className={styles.reset} type="button" onClick={() => setBites(0)}>다시</button>
        ) : null}
      </div>
    </main>
  );
}
