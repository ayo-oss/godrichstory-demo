// PoolGradient — vanilla 판(run/078/demo/07-object-pool-gradient/index.html) 의 React 포트.
// 색 자리 바꾸기는 swapped 하나로 갈린다. 첫 클릭에 미리보기 루프(is-demo)를 뗀다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PoolGradient.module.scss";

export type PoolGradientProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialSwap?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PoolGradient(props: PoolGradientProps) {
  const duration = props.duration ?? 1000;
  const easing = props.easing ?? "ease-in-out";
  const color = props.color ?? "#2bb3e6";
  const [swap, setSwap] = useState<boolean>(props.initialSwap ?? false);
  const [preview, setPreview] = useState<boolean>(true);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const rootClass = ["pl", preview ? "is-demo" : "", swap ? "is-swap" : ""]
    .filter(Boolean).map((c) => (styles as { [k: string]: string })[c]).join(" ");

  return (
    <main className={styles.stage}>
      <div className={rootClass} style={vars}>
        <div className={styles["pl__board"]}>
          <svg className={styles["pl__svg"]} viewBox="0 0 300 160" role="img" aria-label="물웅덩이 배경">
            <defs>
              <radialGradient id="plTeal" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#2bb3e6"></stop>
                <stop offset="55%" stopColor="#1a8fa8"></stop>
                <stop offset="100%" stopColor="#14647a"></stop>
              </radialGradient>
              <radialGradient id="plPink" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f2827f"></stop>
                <stop offset="55%" stopColor="#c96a78"></stop>
                <stop offset="100%" stopColor="#8d4f66"></stop>
              </radialGradient>
              <radialGradient id="plViolet" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#8a5cd6"></stop>
                <stop offset="55%" stopColor="#5b3fd4"></stop>
                <stop offset="100%" stopColor="#392a7a"></stop>
              </radialGradient>
            </defs>
            <g className={styles["pl__blob"] + " " + styles["pl__blob--teal"]}>
              <ellipse cx="96" cy="84" rx="64" ry="44" fill="url(#plTeal)" opacity=".34"></ellipse>
              <ellipse cx="99" cy="81" rx="52" ry="35" fill="url(#plTeal)" opacity=".5" transform="rotate(-8 99 81)"></ellipse>
              <ellipse cx="93" cy="86" rx="40" ry="26" fill="url(#plTeal)" opacity=".7" transform="rotate(7 93 86)"></ellipse>
              <ellipse cx="98" cy="82" rx="29" ry="18" fill="url(#plTeal)" opacity=".9" transform="rotate(-4 98 82)"></ellipse>
              <ellipse cx="96" cy="84" rx="18" ry="11" fill="#29d8c0"></ellipse>
            </g>
            <g className={styles["pl__blob"] + " " + styles["pl__blob--pink"]}>
              <ellipse cx="34" cy="26" rx="44" ry="30" fill="url(#plPink)" opacity=".34"></ellipse>
              <ellipse cx="37" cy="24" rx="33" ry="22" fill="url(#plPink)" opacity=".55" transform="rotate(10 37 24)"></ellipse>
              <ellipse cx="31" cy="28" rx="22" ry="14" fill="url(#plPink)" opacity=".8" transform="rotate(-6 31 28)"></ellipse>
              <ellipse cx="34" cy="26" rx="12" ry="8" fill="#f2a39b"></ellipse>
            </g>
            <g className={styles["pl__blob"] + " " + styles["pl__blob--violet"]}>
              <ellipse cx="238" cy="128" rx="52" ry="34" fill="url(#plViolet)" opacity=".34"></ellipse>
              <ellipse cx="241" cy="125" rx="40" ry="25" fill="url(#plViolet)" opacity=".55" transform="rotate(-9 241 125)"></ellipse>
              <ellipse cx="235" cy="130" rx="28" ry="17" fill="url(#plViolet)" opacity=".8" transform="rotate(5 235 130)"></ellipse>
              <ellipse cx="238" cy="128" rx="16" ry="10" fill="#9a77e8"></ellipse>
            </g>
          </svg>
        </div>
        <button
          className={styles["pl__btn"]}
          type="button"
          aria-pressed={swap ? "true" : "false"}
          onClick={() => { setPreview(false); setSwap((s) => !s); }}
        >
          색 자리 바꾸기
        </button>
      </div>
    </main>
  );
}
