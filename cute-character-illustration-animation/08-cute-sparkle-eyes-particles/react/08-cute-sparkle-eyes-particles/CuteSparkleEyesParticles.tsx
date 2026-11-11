// CuteSparkleEyesParticles — vanilla 판(run/075/demo/08-cute-sparkle-eyes-particles) 의 React 포트.
// 무대를 누른 자리에서 하트가 피어오른다 — 누른 좌표를 state 로 남겨 그 자리에 하트를 띄운다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CuteSparkleEyesParticles.module.scss";

// 로컬 이벤트 타입 — ambient 선언에 React 마우스 이벤트 제네릭이 없다(237 실측 계열)
type ClickEvt = { clientX: number; clientY: number; currentTarget: HTMLButtonElement };

export type CuteSparkleEyesParticlesProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type Fly = { id: number; x: number; y: number };

const SPARKLE_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="m194.82 151.43l-55.09 20.3l-20.3 55.09a7.92 7.92 0 0 1-14.86 0l-20.3-55.09l-55.09-20.3a7.92 7.92 0 0 1 0-14.86l55.09-20.3l20.3-55.09a7.92 7.92 0 0 1 14.86 0l20.3 55.09l55.09 20.3a7.92 7.92 0 0 1 0 14.86" opacity=".2"/><path d="M197.58 129.06L146 110l-19-51.62a15.92 15.92 0 0 0-29.88 0L78 110l-51.62 19a15.92 15.92 0 0 0 0 29.88L78 178l19 51.62a15.92 15.92 0 0 0 29.88 0L146 178l51.62-19a15.92 15.92 0 0 0 0-29.88ZM137 164.22a8 8 0 0 0-4.74 4.74L112 223.85L91.78 169a8 8 0 0 0-4.78-4.78L32.15 144L87 123.78a8 8 0 0 0 4.78-4.78L112 64.15L132.22 119a8 8 0 0 0 4.74 4.74L191.85 144ZM144 40a8 8 0 0 1 8-8h16V16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 0 16h-16v16a8 8 0 0 1-16 0V48h-16a8 8 0 0 1-8-8m104 48a8 8 0 0 1-8 8h-8v8a8 8 0 0 1-16 0v-8h-8a8 8 0 0 1 0-16h8v-8a8 8 0 0 1 16 0v8h8a8 8 0 0 1 8 8"/></g></svg>
);
const HEART_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M232 102c0 66-104 122-104 122S24 168 24 102a54 54 0 0 1 54-54c22.59 0 41.94 12.31 50 32c8.06-19.69 27.41-32 50-32a54 54 0 0 1 54 54" opacity=".2"/><path d="M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62m-50 174.8c-18.26-10.64-96-59.11-96-112.8a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8"/></g></svg>
);

let flySeq = 0;

export default function CuteSparkleEyesParticles(props: CuteSparkleEyesParticlesProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
  const color = props.color ?? "#6ec8ff";
  const [sent, setSent] = useState<number>(0);
  const [flies, setFlies] = useState<Fly[]>([]);
  const [preview, setPreview] = useState<boolean>(true);
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  function send(e: ClickEvt) {
    const rect = (e.currentTarget.querySelector("." + styles.scene) as HTMLElement | null)?.getBoundingClientRect();
    if (!rect) { setSent(sent + 1); return; }
    const fly: Fly = { id: ++flySeq, x: e.clientX - rect.left, y: e.clientY - rect.top };
    setFlies(flies.concat(fly));
    setSent(sent + 1);
    window.setTimeout(function () {
      setFlies(function (cur) { return cur.filter(function (f) { return f.id !== fly.id; }); });
    }, 950);
  }

  return (
    <main className={styles.stage}>
      <div className={styles.sp + (preview ? " " + styles.isDemo : "")} style={vars}>
        <button
          className={styles.hit}
          type="button"
          aria-label="하트 보내기"
          onClick={send}
          onPointerDown={() => setPreview(false)}
        >
          <span className={styles.scene} aria-hidden="true">
            <span className={styles.char}>
              <span className={styles.eye + " " + styles.eyeL}>{SPARKLE_SVG}</span>
              <span className={styles.eye + " " + styles.eyeR}>{SPARKLE_SVG}</span>
              <span className={styles.mouth}></span>
              <span className={styles.cheek + " " + styles.cheekL}></span>
              <span className={styles.cheek + " " + styles.cheekR}></span>
            </span>
            <span className={styles.auto + " " + styles.auto1}>{HEART_SVG}</span>
            <span className={styles.auto + " " + styles.auto2}>{HEART_SVG}</span>
            <span className={styles.auto + " " + styles.auto3}>{HEART_SVG}</span>
            {flies.map(function (f) {
              return (
                <span className={styles.fly} key={f.id} style={{ left: f.x + "px", top: f.y + "px" }} aria-hidden="true">{HEART_SVG}</span>
              );
            })}
          </span>
        </button>
        <output className={styles.count} aria-hidden="true">{sent}</output>
      </div>
    </main>
  );
}
