// CuteDoodleWalkCycle — vanilla 판(run/075/demo/04-cute-doodle-walk-cycle) 의 React 포트.
// 누르면 걷는 방향이 뒤집힌다 — data-dir 하나만 바꾸고 거울은 CSS 가 씌운다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CuteDoodleWalkCycle.module.scss";

export type CuteDoodleWalkCycleProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CuteDoodleWalkCycle(props: CuteDoodleWalkCycleProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
  const color = props.color ?? "#2f6df6";
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [preview, setPreview] = useState<boolean>(true);
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={styles.dw + (preview ? " " + styles.isDemo : "")} style={vars} data-dir={dir}>
        <button
          className={styles.hit}
          type="button"
          aria-label="걷는 방향 바꾸기"
          onClick={() => setDir(dir === "fwd" ? "back" : "fwd")}
          onPointerDown={() => setPreview(false)}
        >
          <svg className={styles.scene} viewBox="0 0 480 300" aria-hidden="true">
            <line className={styles.ground} x1="60" y1="228" x2="420" y2="228" pathLength="100" />
            <g className={styles.walker}>
              <g className={styles.flipper}>
                <path className={styles.draw + " " + styles.body} d="M150 96 C150 66 176 52 200 52 C224 52 250 66 250 96 C250 128 226 150 200 150 C174 150 150 128 150 96 Z" pathLength="100" />
                <path className={styles.draw + " " + styles.leg + " " + styles.legL} d="M184 148 L180 224" pathLength="100" />
                <path className={styles.draw + " " + styles.leg + " " + styles.legR} d="M216 148 L220 224" pathLength="100" />
                <path className={styles.draw + " " + styles.arm + " " + styles.armL} d="M156 104 L128 122" pathLength="100" />
                <path className={styles.draw + " " + styles.arm + " " + styles.armR} d="M244 104 L272 96" pathLength="100" />
                <path className={styles.draw + " " + styles.eye} d="M186 92 L190 92" pathLength="100" />
                <path className={styles.draw + " " + styles.eye} d="M210 92 L214 92" pathLength="100" />
                <path className={styles.draw + " " + styles.mouth} d="M192 110 Q200 118 208 110" pathLength="100" />
                <path className={styles.draw + " " + styles.crest} d="M184 54 Q200 40 216 54" pathLength="100" />
              </g>
            </g>
          </svg>
        </button>
      </div>
    </main>
  );
}
