// RetroSunGrid — vanilla 판(run/078/demo/06-object-retro-sun-grid/index.html) 의 React 포트.
// 유성: 누를 때마다 한 번 대각선으로 가로지른다(is-shot). 첫 클릭에 미리보기 루프를 뗀다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RetroSunGrid.module.scss";

export type RetroSunGridProps = {
  duration?: number;
  easing?: string;
  color?: string;
  title?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function RetroSunGrid(props: RetroSunGridProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "ease-out";
  const color = props.color ?? "#ff9ebb";
  const title = props.title ?? "RETRO CSS";
  const [shot, setShot] = useState<boolean>(false);
  const [preview, setPreview] = useState<boolean>(true);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const rootClass = ["rt", preview ? "is-demo" : "", shot ? "is-shot" : ""]
    .filter(Boolean).map((c) => (styles as { [k: string]: string })[c]).join(" ");

  return (
    <main className={styles.stage}>
      <div className={rootClass} style={vars}>
        <span className={styles["rt__star"] + " " + styles["rt__star--a"]}></span>
        <span className={styles["rt__star"] + " " + styles["rt__star--b"]}></span>
        <span className={styles["rt__star"] + " " + styles["rt__star--c"]}></span>
        <span className={styles["rt__star"] + " " + styles["rt__star--d"]}></span>
        <span className={styles["rt__comet"]}></span>
        <span className={styles["rt__shot"]}><span className={styles["rt__streak"]}></span></span>
        <div className={styles["rt__sun"]}>
          <span className={styles["rt__sunball"]}></span>
          <span className={styles["rt__sunlines"]}></span>
        </div>
        <span className={styles["rt__mount"] + " " + styles["rt__mount--l"]}></span>
        <span className={styles["rt__mount"] + " " + styles["rt__mount--r"]}></span>
        <div className={styles["rt__floor"]}>
          <div className={styles["rt__grid"]}></div>
        </div>
        <span className={styles["rt__palm"] + " " + styles["rt__palm--big"]}></span>
        <span className={styles["rt__palm"] + " " + styles["rt__palm--small"]}></span>
        <p className={styles["rt__title"]}>{title}</p>
        <button
          className={styles["rt__fire"]}
          type="button"
          aria-pressed={shot ? "true" : "false"}
          onClick={() => { setPreview(false); setShot(false); requestAnimationFrame(() => setShot(true)); }}
        >
          유성 쏘기
        </button>
      </div>
    </main>
  );
}
