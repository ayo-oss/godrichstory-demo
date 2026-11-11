import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./AvatarShapeSizeSet.module.scss";

export type AvatarShapeSizeSetProps = {
  label?: string;
  pickerLabel?: string;
  name?: string;
  shapeLabels?: { circle: string; squircle: string; hex: string };
  sizes?: number[];
  /** 모양 컷·팝 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 아바타 면 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--size"?: string;
  "--pop-delay"?: string;
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

// 이니셜은 표시 문자열에서 계산한다 — 하드코딩하지 않아야 언어팩이 바뀌어도 따라간다
function initialOf(name: string): string {
  const words = name.trim().split(/\s+/);
  if (/[A-Za-z]/.test(words[0].charAt(0))) {
    return words.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");
  }
  return words[0].charAt(0);
}

function swatchClass(key: string): string {
  if (key === "squircle") return styles.swatchSquircle;
  if (key === "hex") return styles.swatchHex;
  return styles.swatchCircle;
}

export default function AvatarShapeSizeSet({
  label = "아바타 모양과 크기",
  pickerLabel = "모양 고르기",
  name = "디자이너",
  shapeLabels = { circle: "원", squircle: "모난 원", hex: "육각" },
  sizes = [28, 36, 48, 64],
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#5b4bd6",
}: AvatarShapeSizeSetProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [shape, setShape] = useState<string>("circle");
  const initial = initialOf(name);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const shapes = [
    { key: "circle", text: shapeLabels.circle },
    { key: "squircle", text: shapeLabels.squircle },
    { key: "hex", text: shapeLabels.hex },
  ];

  return (
    <section
      className={loop ? `${styles.as} ${styles.isDemo}` : styles.as}
      data-shape={shape}
      style={vars}
      aria-label={label}
      onPointerDown={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <div className={styles.shapes} role="group" aria-label={pickerLabel}>
        {shapes.map((s) => (
          <button
            key={s.key}
            className={styles.shapeBtn}
            type="button"
            aria-pressed={shape === s.key ? "true" : "false"}
            onClick={() => setShape(s.key)}
          >
            <span className={`${styles.swatch} ${swatchClass(s.key)}`} aria-hidden="true" />
            {s.text}
          </button>
        ))}
      </div>

      <div className={styles.row}>
        {sizes.map((size, i) => (
          <span
            key={size}
            className={styles.slot}
            style={{ "--size": `${size}px`, "--pop-delay": `${i * 120}ms` } as Vars}
          >
            <span className={styles.av} aria-hidden="true">{initial}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
