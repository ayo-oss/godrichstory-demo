// GameHero — vanilla 판(run/078/demo/08-object-game-hero/index.html) 의 React 포트.
// 회전 반전은 rev 하나로 animation-direction 을 뒤집는다. 첫 클릭에 미리보기 루프를 뗀다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GameHero.module.scss";

export type GameHeroProps = {
  duration?: number;
  easing?: string;
  color?: string;
  tag?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function GameHero(props: GameHeroProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "ease-in-out";
  const color = props.color ?? "#8a5cd6";
  const tag = props.tag ?? "NEW WORLD";
  const [rev, setRev] = useState<boolean>(false);
  const [preview, setPreview] = useState<boolean>(true);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const rootClass = ["gh", preview ? "is-demo" : "", rev ? "is-rev" : ""]
    .filter(Boolean).map((c) => (styles as { [k: string]: string })[c]).join(" ");

  return (
    <main className={styles.stage}>
      <div className={rootClass} style={vars}>
        <div className={styles["gh__hero"]}>
          <span className={styles["gh__bloom"]}></span>
          <span className={styles["gh__swirl"]}></span>
          <span className={styles["gh__haze"]}></span>
          <span className={styles["gh__horizon"]}></span>
          <span className={styles["gh__dot"] + " " + styles["gh__dot--a"]}></span>
          <span className={styles["gh__dot"] + " " + styles["gh__dot--b"]}></span>
          <span className={styles["gh__dot"] + " " + styles["gh__dot--c"]}></span>
          <span className={styles["gh__dot"] + " " + styles["gh__dot--d"]}></span>
          <span className={styles["gh__dot"] + " " + styles["gh__dot--e"]}></span>
          <p className={styles["gh__tag"]}>{tag}</p>
        </div>
        <button
          className={styles["gh__btn"]}
          type="button"
          aria-pressed={rev ? "true" : "false"}
          onClick={() => { setPreview(false); setRev((r) => !r); }}
        >
          회전 반전
        </button>
      </div>
    </main>
  );
}
