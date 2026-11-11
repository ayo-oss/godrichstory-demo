import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MagnifierLens.module.scss";

export type MagnifierLensProps = {
  label?: string;
  /** 렌즈 안 배율. style.scss 의 $zoom 과 같은 값이어야 두 겹이 겹친다 */
  zoom?: number;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault: () => void };

const HALF = 44;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export default function MagnifierLens({
  label = "Checked fabric. Move the magnifier with the arrow keys",
  zoom = 2.4,
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: MagnifierLensProps) {
  const photo = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(demo);
  const [at, setAt] = useState({ x: 76, y: 60 });

  function move(x: number, y: number) {
    const box = photo.current ? photo.current.getBoundingClientRect() : null;
    const w = box ? box.width : 288;
    const h = box ? box.height : 168;
    setLive(false);
    setAt({ x: clamp(x, HALF, w - HALF), y: clamp(y, HALF, h - HALF) });
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const lens: CSSProperties = {
    transform: `translate(${at.x - HALF}px,${at.y - HALF}px)`,
    backgroundPosition: `${-(at.x * zoom - HALF)}px ${-(at.y * zoom - HALF)}px`,
  };

  return (
    <div className={[styles.root, live ? styles.isDemo : ""].join(" ")} style={vars}>
      <div
        className={styles.photo}
        ref={photo}
        tabIndex={0}
        role="img"
        aria-label={label}
        onPointerMove={(e: PointerEvt) => {
          const box = photo.current ? photo.current.getBoundingClientRect() : { left: 0, top: 0 };
          move(e.clientX - box.left, e.clientY - box.top);
        }}
        onKeyDown={(e: KeyEvt) => {
          const step: { [k: string]: number[] } = {
            ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16],
          };
          if (!step[e.key]) return;
          e.preventDefault();
          move(at.x + step[e.key][0], at.y + step[e.key][1]);
        }}
      >
        <div className={styles.lens} aria-hidden="true" style={live ? undefined : lens} />
      </div>
    </div>
  );
}
