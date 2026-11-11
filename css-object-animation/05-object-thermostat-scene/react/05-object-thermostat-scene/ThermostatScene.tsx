// ThermostatScene — vanilla 판(run/078/demo/05-object-thermostat-scene/index.html) 의 React 포트.
// 모드는 data-mode 하나. 해의 높이·다이얼 각도·온도 숫자가 같이 바뀐다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ThermostatScene.module.scss";

export type ThermostatSceneProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialMode?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const MODE_TEMPS: Record<string, string> = { snow: "18°", sun: "27°", cloud: "21°", flame: "24°" };

const ICONS: Record<string, string> = {
  snow: "M220 128a92 92 0 1 1-92-92a92.1 92.1 0 0 1 92 92M223.77 150.09a8 8 0 0 1-5.86 9.68l-24.64 6l6.46 24.11a8 8 0 0 1-5.66 9.8a8.3 8.3 0 0 1-2.07.32a8 8 0 0 1-7.72-5.93l-7.72-28.8L136 141.86v46.83l21.66 21.65a8 8 0 0 1-11.32 11.32L128 203.31l-18.34 18.35a8 8 0 0 1-11.32-11.32L120 188.69v-46.83l-40.55 23.41l-7.72 28.8A8 8 0 0 1 64 200a8.3 8.3 0 0 1-2.08-.27a8 8 0 0 1-5.66-9.8l6.46-24.11l-24.64-6a8 8 0 0 1 3.82-15.54l29.45 7.23L112 128l-40.64-23.46l-29.45 7.23A8 8 0 0 1 40 112a8 8 0 0 1-1.91-15.77l24.64-6l-6.46-24.16a8 8 0 0 1 15.46-4.14l7.72 28.8L120 114.14V67.31L98.34 45.66a8 8 0 0 1 11.32-11.32L128 52.69l18.34-18.35a8 8 0 0 1 11.32 11.32L136 67.31v46.83l40.55-23.41l7.72-28.8a8 8 0 0 1 15.46 4.14l-6.46 24.11l24.64 6A8 8 0 0 1 216 112a8 8 0 0 1-1.91-.23l-29.45-7.23L144 128l40.64 23.46l29.45-7.23a8 8 0 0 1 9.68 5.86",
  sun: "M120 40V16a8 8 0 0 1 16 0v24a8 8 0 0 1-16 0m72 88a64 64 0 1 1-64-64a64.07 64.07 0 0 1 64 64m-16 0a48 48 0 1 0-48 48a48.05 48.05 0 0 0 48-48M58.34 69.66a8 8 0 0 0 11.32-11.32l-16-16a8 8 0 0 0-11.32 11.32Zm0 116.68l-16 16a8 8 0 0 0 11.32 11.32l16-16a8 8 0 0 0-11.32-11.32M192 72a8 8 0 0 0 5.66-2.34l16-16a8 8 0 0 0-11.32-11.32l-16 16A8 8 0 0 0 192 72m5.66 114.34a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32-11.32ZM48 128a8 8 0 0 0-8-8H16a8 8 0 0 0 0 16h24a8 8 0 0 0 8-8m80 80a8 8 0 0 0-8 8v24a8 8 0 0 0 16 0v-24a8 8 0 0 0-8-8m112-88h-24a8 8 0 0 0 0 16h24a8 8 0 0 0 0-16",
  cloud: "M240 128a80 80 0 0 1-80 80H72A56 56 0 1 1 85.92 97.74v.1A80 80 0 0 1 240 128M160 40a88.09 88.09 0 0 0-78.71 48.67A64 64 0 1 0 72 216h88a88 88 0 0 0 0-176m0 160H72a48 48 0 0 1 0-96c1.1 0 2.2 0 3.29.11A88 88 0 0 0 72 128a8 8 0 0 0 16 0a72 72 0 1 1 72 72",
  flame: "M208 144a80 80 0 0 1-77.94 80A40 40 0 0 0 168 184c0-40-40-64-40-64s-40 24-40 64a40 40 0 0 0 37.94 40A80 80 0 0 1 48 144c0-72 80-120 80-120s80 48 80 120M173.79 51.48a221.3 221.3 0 0 0-41.67-34.34a8 8 0 0 0-8.24 0a221.3 221.3 0 0 0-41.67 34.34C54.59 80.48 40 112.47 40 144a88 88 0 0 0 176 0c0-31.53-14.59-63.52-42.21-92.52M96 184c0-27.67 22.53-47.28 32-54.3c9.48 7 32 26.63 32 54.3a32 32 0 0 1-64 0m77.27 15.93A47.8 47.8 0 0 0 176 184c0-44-42.09-69.79-43.88-70.86a8 8 0 0 0-8.24 0C122.09 114.21 80 140 80 184a47.8 47.8 0 0 0 2.73 15.93A71.88 71.88 0 0 1 56 144c0-34.41 20.4-63.15 37.52-81.19A216.2 216.2 0 0 1 128 33.54a215.8 215.8 0 0 1 34.48 29.27C193.49 95.5 200 125 200 144a71.88 71.88 0 0 1-26.73 55.93",
};

const DOTS: Record<string, string> = {
  snow: "M220 128a92 92 0 1 1-92-92a92.1 92.1 0 0 1 92 92",
  sun: "M184 128a56 56 0 1 1-56-56a56 56 0 0 1 56 56",
  cloud: "M240 128a80 80 0 0 1-80 80H72A56 56 0 1 1 85.92 97.74v.1A80 80 0 0 1 240 128",
  flame: "M208 144a80 80 0 0 1-77.94 80A40 40 0 0 0 168 184c0-40-40-64-40-64s-40 24-40 64a40 40 0 0 0 37.94 40A80 80 0 0 1 48 144c0-72 80-120 80-120s80 48 80 120",
};

const MODE_LABELS: Record<string, string> = { snow: "눈 모드", sun: "해 모드", cloud: "구름 모드", flame: "난방 모드" };

export default function ThermostatScene(props: ThermostatSceneProps) {
  const duration = props.duration ?? 300;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#3ddc97";
  const [mode, setMode] = useState<string>(props.initialMode ?? "sun");
  const [preview, setPreview] = useState<boolean>(true);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const rootClass = ["th", preview ? "is-demo" : ""]
    .filter(Boolean).map((c) => (styles as { [k: string]: string })[c]).join(" ");

  return (
    <main className={styles.stage}>
      <div className={rootClass} style={vars} data-mode={mode}>
        <div className={styles["th__device"]}>
          <div className={styles["th__window"]}>
            <span className={styles["th__sky"]}></span>
            <span className={styles["th__sunwrap"]}><span className={styles["th__sun"]}></span></span>
            <span className={styles["th__mount"] + " " + styles["th__mount--l"]}></span>
            <span className={styles["th__mount"] + " " + styles["th__mount--r"]}></span>
            <span className={styles["th__lake"]}><span className={styles["th__refl"]}></span></span>
          </div>
          <div className={styles["th__panel"]}>
            <div className={styles["th__rowtop"]}>
              <span className={styles["th__dial"]}><span className={styles["th__dialmark"]}></span></span>
              <span className={styles["th__temp"]}>{MODE_TEMPS[mode]}</span>
            </div>
            <div className={styles["th__modes"]}>
              {["snow", "sun", "cloud", "flame"].map((m) => (
                <button
                  key={m}
                  className={styles["th__mode"]}
                  type="button"
                  aria-pressed={mode === m ? "true" : "false"}
                  aria-label={MODE_LABELS[m]}
                  onClick={() => { setPreview(false); setMode(m); }}
                >
                  <svg viewBox="0 0 256 256" aria-hidden="true">
                    <g fill="currentColor">
                      <path d={DOTS[m]} opacity=".2"></path>
                      <path d={ICONS[m]}></path>
                    </g>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className={styles["th__hint"]}>눈·해·구름·난방 아이콘을 눌러 보세요</p>
      </div>
    </main>
  );
}
