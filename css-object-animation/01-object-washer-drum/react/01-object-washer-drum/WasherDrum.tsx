// WasherDrum — vanilla 판(run/078/demo/01-object-washer-drum/index.html) 의 React 포트.
// 시작/정지는 paused 하나로 갈리고, 첫 클릭에 미리보기 루프(is-demo)를 뗀다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WasherDrum.module.scss";

export type WasherDrumProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialPaused?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function WasherDrum(props: WasherDrumProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "ease-out";
  const color = props.color ?? "#fff7e6";
  const [paused, setPaused] = useState<boolean>(props.initialPaused ?? false);
  const [preview, setPreview] = useState<boolean>(true);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const rootClass = ["ws", preview ? "is-demo" : "", paused ? "is-pause" : ""]
    .filter(Boolean).map((c) => (styles as { [k: string]: string })[c]).join(" ");

  return (
    <main className={styles.stage}>
      <div className={rootClass} style={vars}>
        <div className={styles["ws__machine"]}>
          <span className={styles["ws__side"]}></span>
          <div className={styles["ws__top"]}>
            <span className={styles["ws__mark"]}></span>
            <span className={styles["ws__mark"] + " " + styles["ws__mark--short"]}></span>
            <span className={styles["ws__dial"]}></span>
            <span className={styles["ws__led"] + " " + styles["ws__led--run"]}></span>
            <span className={styles["ws__led"] + " " + styles["ws__led--pause"]}></span>
          </div>
          <div className={styles["ws__door"]}>
            <span className={styles["ws__ring"]}></span>
            <div className={styles["ws__glass"]}>
              <div className={styles["ws__drum"]}>
                <span className={styles["ws__water"] + " " + styles["ws__water--a"]}></span>
                <span className={styles["ws__water"] + " " + styles["ws__water--b"]}></span>
                <span className={styles["ws__sock"]}></span>
                <span className={styles["ws__shirt"]}></span>
              </div>
              <span className={styles["ws__cat"]}>
                <span className={styles["ws__ear"] + " " + styles["ws__ear--l"]}></span>
                <span className={styles["ws__ear"] + " " + styles["ws__ear--r"]}></span>
                <span className={styles["ws__tail"]}></span>
                <span className={styles["ws__head"]}></span>
                <span className={styles["ws__eye"] + " " + styles["ws__eye--l"]}></span>
                <span className={styles["ws__eye"] + " " + styles["ws__eye--r"]}></span>
              </span>
              <span className={styles["ws__shine"]}></span>
              <span className={styles["ws__shine"] + " " + styles["ws__shine--b"]}></span>
            </div>
            <span className={styles["ws__notch"]}></span>
          </div>
          <span className={styles["ws__label"]}></span>
        </div>
        <button
          className={styles["ws__btn"]}
          type="button"
          aria-pressed={paused ? "true" : "false"}
          onClick={() => { setPreview(false); setPaused((p) => !p); }}
        >
          {paused ? "일시정지" : "세탁 시작"}
        </button>
      </div>
    </main>
  );
}
