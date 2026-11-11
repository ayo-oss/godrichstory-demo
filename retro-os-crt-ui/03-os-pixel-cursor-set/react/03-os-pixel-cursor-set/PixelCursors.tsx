// PixelCursors — vanilla 판(run/023/demo/03-os-pixel-cursor-set/index.html) 의 React 포트.
// 화살표·모래시계·손가락을 1px 격자 그림으로 그려 scale 로 정수배 확대한다. 고르기 단추가
// data-cur 값을 바꿔 큰 칸의 커서를 갈아 낀다. 미리보기 루프는 CSS keyframes 그대로다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PixelCursors.module.scss";

export type PixelCursorsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const PICKS: { set: string; label: string }[] = [
  { set: "arrow", label: "화살표" },
  { set: "hour", label: "모래시계" },
  { set: "hand", label: "손가락" }
];

const ARIA_SLOT = "커서 미리보기";
const ARIA_GROUP = "커서 고르기";

export default function PixelCursors(props: PixelCursorsProps) {
  const vars: Vars = {
    "--duration": (props.duration ?? 2000) + "ms",
    "--easing": props.easing ?? "ease-out",
    "--color": props.color ?? "#ffd23f"
  };
  const [preview, setPreview] = useState<boolean>(true);
  const [cur, setCur] = useState<string>("arrow");

  return (
    <main className={styles.stage}>
      <div
        className={styles.pxc + (preview ? " " + styles.isDemo : "")}
        style={vars}
        onPointerDown={() => setPreview(false)}
      >
        <div className={styles.slot} data-cur={cur} aria-label={ARIA_SLOT}>
          <span className={styles.px + " " + styles.curArrow} aria-hidden="true" />
          <span className={styles.px + " " + styles.curHour} aria-hidden="true" />
          <span className={styles.px + " " + styles.curHand} aria-hidden="true" />
          <span className={styles.grid} aria-hidden="true" />
        </div>
        <div className={styles.row} role="group" aria-label={ARIA_GROUP}>
          {PICKS.map((p) => (
            <button
              key={p.set}
              type="button"
              className={styles.pick + (cur === p.set ? " " + styles.pickOn : "")}
              aria-pressed={cur === p.set}
              onClick={() => {
                setPreview(false);
                setCur(p.set);
              }}
            >
              <span
                className={
                  styles.px + " " + styles.mini + " " + styles["mini" + p.set.charAt(0).toUpperCase() + p.set.slice(1)]
                }
                aria-hidden="true"
              />
              <span className={styles.lbl}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
