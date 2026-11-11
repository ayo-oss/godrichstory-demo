// CarApproach — vanilla 판(run/078/demo/03-object-car-approach/index.html) 의 React 포트.
// 하이빔은 beam 하나로 갈리고, 첫 클릭에 미리보기 루프(is-demo)를 뗀다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CarApproach.module.scss";

export type CarApproachProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialBeam?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CarApproach(props: CarApproachProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "ease-in-out";
  const color = props.color ?? "#ffd23f";
  const [beam, setBeam] = useState<boolean>(props.initialBeam ?? false);
  const [preview, setPreview] = useState<boolean>(true);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const rootClass = ["ca", preview ? "is-demo" : "", beam ? "is-beam" : ""]
    .filter(Boolean).map((c) => (styles as { [k: string]: string })[c]).join(" ");

  return (
    <main className={styles.stage}>
      <div className={rootClass} style={vars}>
        <div className={styles["ca__scene"]}>
          <span className={styles["ca__lowsun"]}></span>
          <div className={styles["ca__road"]}>
            <div className={styles["ca__marks"]}>
              <span className={styles["ca__dash"]}></span>
              <span className={styles["ca__dash"]}></span>
              <span className={styles["ca__dash"]}></span>
              <span className={styles["ca__dash"]}></span>
              <span className={styles["ca__dash"]}></span>
              <span className={styles["ca__dash"]}></span>
            </div>
          </div>
          <div className={styles["ca__car"]}>
            <span className={styles["ca__glow"] + " " + styles["ca__glow--l"]}></span>
            <span className={styles["ca__glow"] + " " + styles["ca__glow--r"]}></span>
            <span className={styles["ca__body"]}></span>
            <span className={styles["ca__shield"]}></span>
            <span className={styles["ca__grille"]}></span>
            <span className={styles["ca__lamp"] + " " + styles["ca__lamp--l"]}></span>
            <span className={styles["ca__lamp"] + " " + styles["ca__lamp--r"]}></span>
            <span className={styles["ca__indi"] + " " + styles["ca__indi--l"]}></span>
            <span className={styles["ca__indi"] + " " + styles["ca__indi--r"]}></span>
            <span className={styles["ca__wheel"] + " " + styles["ca__wheel--l"]}></span>
            <span className={styles["ca__wheel"] + " " + styles["ca__wheel--r"]}></span>
          </div>
        </div>
        <button
          className={styles["ca__btn"]}
          type="button"
          aria-pressed={beam ? "true" : "false"}
          onClick={() => { setPreview(false); setBeam((b) => !b); }}
        >
          하이빔
        </button>
      </div>
    </main>
  );
}
