// CrowWordmark — vanilla 판(run/078/demo/04-object-crow-wordmark/index.html) 의 React 포트.
// 까마귀를 누르면 깃털이 한 장 떨어진다(drop). 첫 클릭에 미리보기 루프(is-demo)를 뗀다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CrowWordmark.module.scss";

export type CrowWordmarkProps = {
  duration?: number;
  easing?: string;
  color?: string;
  word?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CrowWordmark(props: CrowWordmarkProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "ease-out";
  const color = props.color ?? "#17141a";
  const word = props.word ?? "까마귀";
  const [drop, setDrop] = useState<boolean>(false);
  const [preview, setPreview] = useState<boolean>(true);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const rootClass = ["cr", preview ? "is-demo" : "", drop ? "is-drop" : ""]
    .filter(Boolean).map((c) => (styles as { [k: string]: string })[c]).join(" ");

  return (
    <main className={styles.stage}>
      <div className={rootClass} style={vars}>
        <div className={styles["cr__scene"]}>
          <span className={styles["cr__wordghost"]} aria-hidden="true">{word}</span>
          <span className={styles["cr__word"]}>{word}</span>
          <span className={styles["cr__feather"] + " " + styles["cr__feather--a"]}></span>
          <span className={styles["cr__feather"] + " " + styles["cr__feather--b"]}></span>
          <span className={styles["cr__feather"] + " " + styles["cr__feather--c"]}></span>
          <span className={styles["cr__drop"]}><span className={styles["cr__dropleaf"]}></span></span>
          <button
            className={styles["cr__crow"]}
            type="button"
            aria-label="까마귀"
            onClick={() => { setPreview(false); setDrop(false); requestAnimationFrame(() => setDrop(true)); }}
          >
            <span className={styles["cr__body"]}></span>
            <span className={styles["cr__tail"]}></span>
            <span className={styles["cr__beak"]}></span>
            <span className={styles["cr__eye"]}></span>
            <span className={styles["cr__leg"] + " " + styles["cr__leg--l"]}></span>
            <span className={styles["cr__leg"] + " " + styles["cr__leg--r"]}></span>
          </button>
        </div>
        <p className={styles["cr__hint"]}>까마귀를 눌러 보세요</p>
      </div>
    </main>
  );
}
