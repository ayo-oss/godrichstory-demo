// CuteSpeechBubbleChatter — vanilla 판(run/075/demo/06-cute-speech-bubble-chatter) 의 React 포트.
// 누르면 왼쪽(내 쪽) 말풍선이 즉시 뜬다 — 상태는 aria-pressed 한 곳, 보임은 CSS 가 고른다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CuteSpeechBubbleChatter.module.scss";

export type CuteSpeechBubbleChatterProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const HEART_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M232 102c0 66-104 122-104 122S24 168 24 102a54 54 0 0 1 54-54c22.59 0 41.94 12.31 50 32c8.06-19.69 27.41-32 50-32a54 54 0 0 1 54 54" opacity=".2"/><path d="M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62m-50 174.8c-18.26-10.64-96-59.11-96-112.8a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8"/></g></svg>
);
const COOKIE_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a48 48 0 0 0 48 48a48 48 0 0 0 48 48" opacity=".2"/><path d="M164.49 163.51a12 12 0 1 1-17 0a12 12 0 0 1 17 0m-81-8a12 12 0 1 0 17 0a12 12 0 0 0-16.98 0Zm9-39a12 12 0 1 0-17 0a12 12 0 0 0 17-.02Zm48-1a12 12 0 1 0 0 17a12 12 0 0 0 0-17M232 128A104 104 0 1 1 128 24a8 8 0 0 1 8 8a40 40 0 0 0 40 40a8 8 0 0 1 8 8a40 40 0 0 0 40 40a8 8 0 0 1 8 8m-16.31 7.39A56.13 56.13 0 0 1 168.5 87.5a56.13 56.13 0 0 1-47.89-47.19a88 88 0 1 0 95.08 95.08"/></g></svg>
);

export default function CuteSpeechBubbleChatter(props: CuteSpeechBubbleChatterProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
  const color = props.color ?? "#4cd4a6";
  const [mine, setMine] = useState<boolean>(false);
  const [preview, setPreview] = useState<boolean>(true);
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div
        className={styles.ch + (preview ? " " + styles.isDemo : "") + (mine ? " " + styles.mine : "")}
        style={vars}
      >
        <button
          className={styles.hit}
          type="button"
          aria-pressed={mine}
          aria-label="내 차례에 말풍선 띄우기"
          onClick={() => setMine(!mine)}
          onPointerDown={() => setPreview(false)}
        >
          <span className={styles.scene} aria-hidden="true">
            <span className={styles.bubble + " " + styles.bubbleL}>
              <span className={styles.tail}></span>
              <span className={styles.icon + " " + styles.iconHeart}>{HEART_SVG}</span>
            </span>
            <span className={styles.bubble + " " + styles.bubbleR}>
              <span className={styles.tail}></span>
              <span className={styles.icon + " " + styles.iconCookie}>{COOKIE_SVG}</span>
            </span>
            <span className={styles.char + " " + styles.charL}>
              <span className={styles.eye + " " + styles.eyeL1}></span>
              <span className={styles.eye + " " + styles.eyeL2}></span>
              <span className={styles.smile}></span>
            </span>
            <span className={styles.char + " " + styles.charR}>
              <span className={styles.eye + " " + styles.eyeR1}></span>
              <span className={styles.eye + " " + styles.eyeR2}></span>
              <span className={styles.smile}></span>
            </span>
          </span>
        </button>
      </div>
    </main>
  );
}
