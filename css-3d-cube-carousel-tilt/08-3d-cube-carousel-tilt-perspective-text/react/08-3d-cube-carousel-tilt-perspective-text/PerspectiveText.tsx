import type { CSSProperties } from "react";
import styles from "./PerspectiveText.module.scss";

export type PerspectiveTextProps = {
  duration?: number;
  easing?: string;
  /** 글자 정면 색 */
  color?: string;
  text?: string;
  /** 압출 두께(겹) */
  depth?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

// 같은 색을 한 단계씩 어둡게 겹쳐서 글자에 두께(압출)가 있는 것처럼 보이게 한다 (vanilla 의 extrudeShadow() 와 같은 계산)
function extrudeShadow(hex: string, n: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let [r, g, b] = [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  const layers: string[] = [];
  for (let i = 1; i <= n; i++) {
    const f = 1 - i * 0.04;
    const rr = Math.max(0, Math.round(r * f));
    const gg = Math.max(0, Math.round(g * f));
    const bb = Math.max(0, Math.round(b * f));
    layers.push(`${i}px ${i}px rgb(${rr},${gg},${bb})`);
  }
  return layers.join(", ");
}

export default function PerspectiveText({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
  text = "환영합니다",
  depth = 8,
}: PerspectiveTextProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };
  return (
    <div className={styles.scene}>
      <h2 className={styles.sign} style={{ ...vars, textShadow: extrudeShadow(color, depth) } as CSSProperties}>
        {text}
      </h2>
    </div>
  );
}
