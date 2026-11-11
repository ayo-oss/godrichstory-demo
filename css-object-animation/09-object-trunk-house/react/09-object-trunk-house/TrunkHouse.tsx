// TrunkHouse — vanilla 판(run/078/demo/09-object-trunk-house/index.html) 의 React 포트.
// 램프는 lit 하나로 갓 온기와 방 밝기가 같이 바뀐다. 첫 클릭에 미리보기 루프를 뗀다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TrunkHouse.module.scss";

export type TrunkHouseProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialLamp?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TrunkHouse(props: TrunkHouseProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "ease-out";
  const color = props.color ?? "#fff7e6";
  const [lit, setLit] = useState<boolean>(props.initialLamp ?? false);
  const [preview, setPreview] = useState<boolean>(true);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const rootClass = ["tk", preview ? "is-demo" : "", lit ? "is-lamp" : ""]
    .filter(Boolean).map((c) => (styles as { [k: string]: string })[c]).join(" ");

  return (
    <main className={styles.stage}>
      <div className={rootClass} style={vars}>
        <div className={styles["tk__trunk"]}>
          <div className={styles["tk__lid"]}>
            <span className={styles["tk__paper"]}></span>
            <span className={styles["tk__wire"]}></span>
            <span className={styles["tk__bulb"] + " " + styles["tk__bulb--a"]}></span>
            <span className={styles["tk__bulb"] + " " + styles["tk__bulb--b"]}></span>
            <span className={styles["tk__bulb"] + " " + styles["tk__bulb--c"]}></span>
            <span className={styles["tk__bulb"] + " " + styles["tk__bulb--d"]}></span>
            <span className={styles["tk__bulb"] + " " + styles["tk__bulb--e"]}></span>
            <span className={styles["tk__bulb"] + " " + styles["tk__bulb--f"]}></span>
            <span className={styles["tk__mirror"]}>
              <span className={styles["tk__glass"]}></span>
              <span className={styles["tk__mshine"]}></span>
            </span>
            <span className={styles["tk__frame"] + " " + styles["tk__frame--a"]}></span>
            <span className={styles["tk__frame"] + " " + styles["tk__frame--b"]}></span>
            <span className={styles["tk__frame"] + " " + styles["tk__frame--c"]}></span>
            <span className={styles["tk__frame"] + " " + styles["tk__frame--d"]}></span>
            <span className={styles["tk__frame"] + " " + styles["tk__frame--e"]}></span>
            <span className={styles["tk__frame"] + " " + styles["tk__frame--f"]}></span>
            <span className={styles["tk__shelf"] + " " + styles["tk__shelf--l"]}>
              <span className={styles["tk__book"]}></span>
              <span className={styles["tk__book"] + " " + styles["tk__book--lean"]}></span>
            </span>
            <span className={styles["tk__shelf"] + " " + styles["tk__shelf--r"]}>
              <span className={styles["tk__book"]}></span>
            </span>
            <span className={styles["tk__pendant"]}></span>
          </div>
          <div className={styles["tk__base"]}>
            <span className={styles["tk__wood"]}></span>
            <span className={styles["tk__sofa"]}>
              <span className={styles["tk__cushion"] + " " + styles["tk__cushion--a"]}></span>
              <span className={styles["tk__cushion"] + " " + styles["tk__cushion--b"]}></span>
            </span>
            <span className={styles["tk__pot"]}>
              <span className={styles["tk__leaf"] + " " + styles["tk__leaf--l"]}></span>
              <span className={styles["tk__leaf"] + " " + styles["tk__leaf--r"]}></span>
            </span>
            <span className={styles["tk__ladder"]}></span>
            <button
              className={styles["tk__lamp"]}
              type="button"
              aria-pressed={lit ? "true" : "false"}
              aria-label="램프"
              onClick={() => { setPreview(false); setLit((l) => !l); }}
            >
              <span className={styles["tk__lstand"]}></span>
              <span className={styles["tk__lshade"]}></span>
              <span className={styles["tk__lglow"]}></span>
            </button>
            <span className={styles["tk__warm"]}></span>
          </div>
          <span className={styles["tk__hinge"] + " " + styles["tk__hinge--l"]}></span>
          <span className={styles["tk__hinge"] + " " + styles["tk__hinge--r"]}></span>
          <span className={styles["tk__handle"]}></span>
          <span className={styles["tk__latch"] + " " + styles["tk__latch--l"]}></span>
          <span className={styles["tk__latch"] + " " + styles["tk__latch--r"]}></span>
        </div>
        <p className={styles["tk__hint"]}>램프를 눌러 보세요</p>
      </div>
    </main>
  );
}
