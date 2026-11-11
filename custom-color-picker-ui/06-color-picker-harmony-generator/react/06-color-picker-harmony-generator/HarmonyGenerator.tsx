// HarmonyGenerator — vanilla 판(run/286/demo/06-color-picker-harmony-generator) 의 React 포트.
// 변수 3개(duration·easing·color)는 props 로 받아 CSS 변수(var(--duration) 등)로 들어온다.
// 상태는 기준 색상값 하나와 고른 배색 이름 하나뿐이다. 칩 색과 각도 글자는 JS 가 쓰지 않는다 —
// "기준에 더할 각도" 다섯 개(--o1 ~ --o5)만 넘기면 hsl() 이 색을, counter-set 이 각도 숫자를 찍는다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HarmonyGenerator.module.scss";

type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };

/** 배색 = 기준 색상값에 더할 각도 다섯 개. 셋째 칸은 언제나 0 이라 기준 색 그대로다 */
type HarmonyName = "comp" | "ana" | "tri";

export type HarmonyGeneratorProps = {
  baseLabel?: string;
  /** "기준 색상값 %h도" 처럼 자리표시자 하나를 가진 틀 */
  baseFormat?: string;
  groupLabel?: string;
  /** 탭 라벨 셋 — 보색·유사색·삼각 */
  tabLabels?: string[];
  /** 배색 이름 셋 — 탭보다 긴 형태 */
  setLabels?: string[];
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--base"?: number;
  "--o1"?: number;
  "--o2"?: number;
  "--o3"?: number;
  "--o4"?: number;
  "--o5"?: number;
};

const SETS: Record<HarmonyName, number[]> = {
  comp: [0, 0, 0, 180, 180],
  ana: [-60, -30, 0, 30, 60],
  tri: [-120, -120, 0, 120, 120],
};

const ORDER: HarmonyName[] = ["comp", "ana", "tri"];

export default function HarmonyGenerator({
  baseLabel = "기준 색상값",
  baseFormat = "기준 색상값 %h도",
  groupLabel = "배색 고르기",
  tabLabels = ["보색", "유사색", "삼각"],
  setLabels = ["보색 배색", "유사색 배색", "삼각 배색"],
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: HarmonyGeneratorProps) {
  const [live, setLive] = useState(demo);
  const [hue, setHue] = useState(262);
  const [current, setCurrent] = useState<HarmonyName>("comp");

  const offsets = SETS[current];
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--base": hue,
    "--o1": offsets[0],
    "--o2": offsets[1],
    "--o3": offsets[2],
    "--o4": offsets[3],
    "--o5": offsets[4],
  };

  function pick(name: HarmonyName) {
    setLive(false);
    setCurrent(name);
  }

  function keyBase(e: KeyEvt) {
    const step = e.shiftKey ? 15 : 3;
    if (e.key === "ArrowRight") setHue((hue + step) % 360);
    else if (e.key === "ArrowLeft") setHue((hue - step + 360) % 360);
    else return;
    e.preventDefault();
    setLive(false);
  }

  const baseText = baseFormat.replace("%h", String(hue));

  return (
    <div className={[styles.hm, live ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
      <div className={styles.top}>
        <div
          className={styles.base}
          role="slider"
          tabIndex={0}
          aria-label={baseLabel}
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={hue}
          aria-valuetext={baseText}
          onKeyDown={keyBase}
        />
        <span className={styles.basev} aria-hidden="true" />
        <span className={styles.names} aria-hidden="true">
          {setLabels.map((label, i) => (
            <b
              key={label}
              className={[styles.name, styles[`name${i + 1}`], ORDER[i] === current ? styles.isOn : ""]
                .filter(Boolean)
                .join(" ")}
            >
              {label}
            </b>
          ))}
        </span>
      </div>
      <div className={styles.tabs} role="group" aria-label={groupLabel}>
        {tabLabels.map((label, i) => (
          <button
            key={label}
            type="button"
            className={styles.tab}
            aria-pressed={ORDER[i] === current}
            onClick={() => pick(ORDER[i])}
          >
            {label}
          </button>
        ))}
      </div>
      <ul className={styles.chips}>
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className={styles.chip}>
            <span className={styles.sw} />
            <span className={styles.deg} />
          </li>
        ))}
      </ul>
    </div>
  );
}
