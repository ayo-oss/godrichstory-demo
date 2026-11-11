import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ZoomMinimap.module.scss";

export type ZoomMinimapProps = {
  label?: string;
  /** 본 화면 배율. style.scss 의 scale 값과 같아야 미니맵 상자가 맞는다 */
  scale?: number;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type DragEvt = { clientX: number; clientY: number; pointerId: number };
type KeyEvt = { key: string; preventDefault: () => void };

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export default function ZoomMinimap({
  label = "Zoomed blueprint. Move the view with the arrow keys",
  scale = 2.4,
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: ZoomMinimapProps) {
  const view = useRef<HTMLDivElement>(null);
  const map = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [live, setLive] = useState(demo);
  const [p, setP] = useState({ x: 0, y: 0 });

  function moveBy(dx: number, dy: number) {
    setLive(false);
    setP({ x: clamp(p.x + dx, -1, 1), y: clamp(p.y + dy, -1, 1) });
  }

  const viewBox = view.current ? view.current.getBoundingClientRect() : null;
  const mapBox = map.current ? map.current.getBoundingClientRect() : null;
  const w = viewBox ? viewBox.width : 288;
  const h = viewBox ? viewBox.height : 160;
  const mw = mapBox ? mapBox.width : 76;
  const mh = mapBox ? mapBox.height : 42;
  const rest = (1 - 1 / scale) / 2;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const layer: CSSProperties = {
    transform: `scale(${scale}) translate(${(p.x * w * (scale - 1)) / 2 / scale}px,${(p.y * h * (scale - 1)) / 2 / scale}px)`,
  };
  const box: CSSProperties = {
    transform: `translate(${rest * mw * (1 - p.x)}px,${rest * mh * (1 - p.y)}px)`,
  };

  return (
    <div className={[styles.root, live ? styles.isDemo : ""].join(" ")} style={vars}>
      <div
        className={styles.view}
        ref={view}
        tabIndex={0}
        role="img"
        aria-label={label}
        onPointerDown={(e: DragEvt) => { drag.current = { x: e.clientX, y: e.clientY }; }}
        onPointerMove={(e: DragEvt) => {
          const d = drag.current;
          if (!d) return;
          moveBy(((e.clientX - d.x) / w) * 2, ((e.clientY - d.y) / h) * 2);
          drag.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => { drag.current = null; }}
        onKeyDown={(e: KeyEvt) => {
          const pan: { [k: string]: number[] } = {
            ArrowLeft: [0.2, 0], ArrowRight: [-0.2, 0], ArrowUp: [0, 0.2], ArrowDown: [0, -0.2],
          };
          if (!pan[e.key]) return;
          e.preventDefault();
          moveBy(pan[e.key][0], pan[e.key][1]);
        }}
      >
        <div className={styles.layer} style={live ? undefined : layer} />
        <div className={styles.map} ref={map} aria-hidden="true">
          <div className={styles.box} style={live ? undefined : box} />
        </div>
      </div>
    </div>
  );
}
