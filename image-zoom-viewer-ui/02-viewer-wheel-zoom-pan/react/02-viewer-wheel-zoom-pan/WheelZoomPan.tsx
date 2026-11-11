import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WheelZoomPan.module.scss";

export type WheelZoomPanProps = {
  label?: string;
  minScale?: number;
  maxScale?: number;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type WheelEvt = { deltaY: number; preventDefault: () => void };
type DragEvt = { clientX: number; clientY: number; pointerId: number };
type KeyEvt = { key: string; preventDefault: () => void };

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export default function WheelZoomPan({
  label = "City map. Zoom with the wheel, pan with the arrow keys",
  minScale = 1,
  maxScale = 3,
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: WheelZoomPanProps) {
  const view = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [live, setLive] = useState(demo);
  const [scale, setScale] = useState(1);
  const [at, setAt] = useState({ x: 0, y: 0 });

  function fit(next: number, x: number, y: number) {
    const box = view.current ? view.current.getBoundingClientRect() : null;
    const w = box ? box.width : 288;
    const h = box ? box.height : 168;
    const maxX = (w * (next - 1)) / 2 / next;
    const maxY = (h * (next - 1)) / 2 / next;
    setLive(false);
    setScale(next);
    setAt({ x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) });
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const layer: CSSProperties = { transform: `scale(${scale}) translate(${at.x}px,${at.y}px)` };

  return (
    <div className={[styles.root, live ? styles.isDemo : ""].join(" ")} style={vars}>
      <div
        className={styles.view}
        ref={view}
        tabIndex={0}
        role="img"
        aria-label={label}
        onWheel={(e: WheelEvt) => {
          e.preventDefault();
          fit(clamp(scale - e.deltaY / 400, minScale, maxScale), at.x, at.y);
        }}
        onPointerDown={(e: DragEvt) => { drag.current = { x: e.clientX, y: e.clientY }; }}
        onPointerMove={(e: DragEvt) => {
          const d = drag.current;
          if (!d) return;
          fit(scale, at.x + (e.clientX - d.x) / scale, at.y + (e.clientY - d.y) / scale);
          drag.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => { drag.current = null; }}
        onKeyDown={(e: KeyEvt) => {
          const pan: { [k: string]: number[] } = {
            ArrowLeft: [24, 0], ArrowRight: [-24, 0], ArrowUp: [0, 24], ArrowDown: [0, -24],
          };
          if (pan[e.key]) {
            e.preventDefault();
            fit(scale, at.x + pan[e.key][0], at.y + pan[e.key][1]);
          }
          if (e.key === "+" || e.key === "=") { e.preventDefault(); fit(clamp(scale + 0.4, minScale, maxScale), at.x, at.y); }
          if (e.key === "-") { e.preventDefault(); fit(clamp(scale - 0.4, minScale, maxScale), at.x, at.y); }
        }}
      >
        <div className={styles.layer} style={live ? undefined : layer} />
        <span className={styles.badge} aria-hidden="true" />
      </div>
    </div>
  );
}
