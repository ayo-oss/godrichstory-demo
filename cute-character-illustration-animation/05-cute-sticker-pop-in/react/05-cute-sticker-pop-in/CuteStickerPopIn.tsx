// CuteStickerPopIn — vanilla 판(run/075/demo/05-cute-sticker-pop-in) 의 React 포트.
// 다섯 번째 누름에 윙크, 여섯 번째에 원래 표정. 누를 때마다 살짝 튀는 반응이 key 재마운트로 재시동된다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CuteStickerPopIn.module.scss";

export type CuteStickerPopInProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const SPARKLE_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="m194.82 151.43l-55.09 20.3l-20.3 55.09a7.92 7.92 0 0 1-14.86 0l-20.3-55.09l-55.09-20.3a7.92 7.92 0 0 1 0-14.86l55.09-20.3l20.3-55.09a7.92 7.92 0 0 1 14.86 0l20.3 55.09l55.09 20.3a7.92 7.92 0 0 1 0 14.86" opacity=".2"/><path d="M197.58 129.06L146 110l-19-51.62a15.92 15.92 0 0 0-29.88 0L78 110l-51.62 19a15.92 15.92 0 0 0 0 29.88L78 178l19 51.62a15.92 15.92 0 0 0 29.88 0L146 178l51.62-19a15.92 15.92 0 0 0 0-29.88ZM137 164.22a8 8 0 0 0-4.74 4.74L112 223.85L91.78 169a8 8 0 0 0-4.78-4.78L32.15 144L87 123.78a8 8 0 0 0 4.78-4.78L112 64.15L132.22 119a8 8 0 0 0 4.74 4.74L191.85 144ZM144 40a8 8 0 0 1 8-8h16V16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 0 16h-16v16a8 8 0 0 1-16 0V48h-16a8 8 0 0 1-8-8m104 48a8 8 0 0 1-8 8h-8v8a8 8 0 0 1-16 0v-8h-8a8 8 0 0 1 0-16h8v-8a8 8 0 0 1 16 0v8h8a8 8 0 0 1 8 8"/></g></svg>
);

export default function CuteStickerPopIn(props: CuteStickerPopInProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
  const color = props.color ?? "#ffd23f";
  const [hits, setHits] = useState<number>(0);
  const [preview, setPreview] = useState<boolean>(true);
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const wink = hits > 0 && hits % 5 === 0;

  return (
    <main className={styles.stage}>
      <div className={styles.st + (preview ? " " + styles.isDemo : "")} style={vars}>
        <output className={styles.count} aria-hidden="true">{hits}</output>
        <button
          className={styles.hit}
          type="button"
          aria-label="스티커 누르기"
          onClick={() => setHits(hits + 1)}
          onPointerDown={() => setPreview(false)}
        >
          <span
            className={styles.sticker + (wink ? " " + styles.wink : "") + (hits > 0 ? " " + styles.nudge : "")}
            key={"nudge" + hits}
            aria-hidden="true"
          >
            <span className={styles.face}>
              <span className={styles.ear + " " + styles.earL}></span>
              <span className={styles.ear + " " + styles.earR}></span>
              <span className={styles.eyeOpen + " " + styles.eyeOpenL}></span>
              <span className={styles.eyeOpen + " " + styles.eyeOpenR}></span>
              <span className={styles.eyeWink + " " + styles.eyeWinkL}></span>
              <span className={styles.eyeWink + " " + styles.eyeWinkR}></span>
              <span className={styles.snout}><span className={styles.nose}></span><span className={styles.mouth}></span></span>
              <span className={styles.cheek + " " + styles.cheekL}></span>
              <span className={styles.cheek + " " + styles.cheekR}></span>
            </span>
            <span className={styles.spark + " " + styles.sparkL}>{SPARKLE_SVG}</span>
            <span className={styles.spark + " " + styles.sparkR}>{SPARKLE_SVG}</span>
          </span>
        </button>
      </div>
    </main>
  );
}
