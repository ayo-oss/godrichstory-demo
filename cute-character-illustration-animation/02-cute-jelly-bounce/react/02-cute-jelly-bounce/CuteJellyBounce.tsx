// CuteJellyBounce — vanilla 판(run/075/demo/02-cute-jelly-bounce) 의 React 포트.
// 누를 때마다 카운터가 오르고 젤리가 크게 한 번 튄다 — 몸 요소를 key 로 다시 만들어 일회성 애니메이션을 재시동한다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CuteJellyBounce.module.scss";

export type CuteJellyBounceProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CuteJellyBounce(props: CuteJellyBounceProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
  const color = props.color ?? "#4cd4a6";
  const [hits, setHits] = useState<number>(0);
  const [preview, setPreview] = useState<boolean>(true);
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={styles.jl + (preview ? " " + styles.isDemo : "")} style={vars}>
        <output className={styles.count} aria-hidden="true">{hits}</output>
        <button
          className={styles.hit}
          type="button"
          aria-label="젤리 튀기"
          onClick={() => setHits(hits + 1)}
          onPointerDown={() => setPreview(false)}
        >
          <span className={styles.scene} aria-hidden="true">
            <span className={styles.shadow}></span>
            <span className={styles.body} key={"boing" + hits}>
              <span className={styles.eye + " " + styles.eyeL}></span>
              <span className={styles.eye + " " + styles.eyeR}></span>
              <span className={styles.mouth}></span>
              <span className={styles.shine}></span>
            </span>
          </span>
        </button>
      </div>
    </main>
  );
}
