import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SpotlightMask.module.scss";

export type SpotlightMaskProps = {
  label?: string;
  /** 마스크 원의 반지름(px). module.scss 의 mask-size 절반과 같아야 한다 */
  radius?: number;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type MaskStyle = CSSProperties & { WebkitMaskPosition?: string; maskPosition?: string };
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault: () => void };

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export default function SpotlightMask({
  label = "Group photo. Move the spotlight with the arrow keys",
  radius = 64,
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: SpotlightMaskProps) {
  const view = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(demo);
  const [at, setAt] = useState({ x: 76, y: 58 });

  function move(x: number, y: number) {
    const box = view.current ? view.current.getBoundingClientRect() : null;
    setLive(false);
    setAt({ x: clamp(x, 0, box ? box.width : 288), y: clamp(y, 0, box ? box.height : 168) });
  }

  const pos = `${at.x - radius}px ${at.y - radius}px`;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const lit: MaskStyle = { WebkitMaskPosition: pos, maskPosition: pos };

  return (
    <div className={[styles.root, live ? styles.isDemo : ""].join(" ")} style={vars}>
      <div
        className={styles.view}
        ref={view}
        tabIndex={0}
        role="img"
        aria-label={label}
        onPointerMove={(e: PointerEvt) => {
          const box = view.current ? view.current.getBoundingClientRect() : { left: 0, top: 0 };
          move(e.clientX - box.left, e.clientY - box.top);
        }}
        onKeyDown={(e: KeyEvt) => {
          const step: { [k: string]: number[] } = {
            ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20],
          };
          if (!step[e.key]) return;
          e.preventDefault();
          move(at.x + step[e.key][0], at.y + step[e.key][1]);
        }}
      >
        <div className={styles.dim} />
        <div className={styles.lit} style={live ? undefined : lit} />
      </div>
    </div>
  );
}
