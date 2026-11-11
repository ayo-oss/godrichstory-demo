// HouseGlow — vanilla 판(run/078/demo/02-object-house-glow/index.html) 의 React 포트.
// 불 끄기/켜기는 night 하나로 갈리고, 첫 클릭에 미리보기 루프(is-demo)를 뗀다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HouseGlow.module.scss";

export type HouseGlowProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialNight?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HouseGlow(props: HouseGlowProps) {
  const duration = props.duration ?? 600;
  const easing = props.easing ?? "ease-out";
  const color = props.color ?? "#ff4d1f";
  const [night, setNight] = useState<boolean>(props.initialNight ?? false);
  const [preview, setPreview] = useState<boolean>(true);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const rootClass = ["hs", preview ? "is-demo" : "", night ? "is-night" : ""]
    .filter(Boolean).map((c) => (styles as { [k: string]: string })[c]).join(" ");

  return (
    <main className={styles.stage}>
      <div className={rootClass} style={vars}>
        <div className={styles["hs__scene"]}>
          <span className={styles["hs__skyday"]}></span>
          <div className={styles["hs__skynight"]}>
            <span className={styles["hs__star"] + " " + styles["hs__star--a"]}></span>
            <span className={styles["hs__star"] + " " + styles["hs__star--b"]}></span>
            <span className={styles["hs__star"] + " " + styles["hs__star--c"]}></span>
            <span className={styles["hs__moon"]}></span>
          </div>
          <span className={styles["hs__sun"]}></span>
          <span className={styles["hs__cloud"] + " " + styles["hs__cloud--a"]}></span>
          <span className={styles["hs__cloud"] + " " + styles["hs__cloud--b"]}></span>
          <span className={styles["hs__ground"]}></span>
          <div className={styles["hs__house"]}>
            <span className={styles["hs__smoke"] + " " + styles["hs__smoke--1"]}></span>
            <span className={styles["hs__smoke"] + " " + styles["hs__smoke--2"]}></span>
            <span className={styles["hs__smoke"] + " " + styles["hs__smoke--3"]}></span>
            <span className={styles["hs__chimney"]}></span>
            <span className={styles["hs__roof"]}></span>
            <span className={styles["hs__gable"]}></span>
            <span className={styles["hs__win"] + " " + styles["hs__win--round"]}></span>
            <span className={styles["hs__wall"]}></span>
            <span className={styles["hs__win"] + " " + styles["hs__win--l"]}></span>
            <span className={styles["hs__win"] + " " + styles["hs__win--r"]}></span>
            <span className={styles["hs__door"]}></span>
            <span className={styles["hs__step"]}></span>
            <span className={styles["hs__bush"] + " " + styles["hs__bush--l"]}></span>
            <span className={styles["hs__bush"] + " " + styles["hs__bush--r"]}></span>
          </div>
        </div>
        <button
          className={styles["hs__btn"]}
          type="button"
          aria-pressed={night ? "true" : "false"}
          onClick={() => { setPreview(false); setNight((n) => !n); }}
        >
          {night ? "불 켜기" : "불 끄기"}
        </button>
      </div>
    </main>
  );
}
