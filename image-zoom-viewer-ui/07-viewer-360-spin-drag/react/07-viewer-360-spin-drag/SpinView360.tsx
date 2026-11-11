import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SpinView360.module.scss";

export type SpinView360Props = {
  label?: string;
  /** 한 바퀴를 이루는 칸 수. module.scss 의 steps(N, end) 와 같아야 한다 */
  frames?: number;
  /** 한 칸을 넘기는 데 필요한 드래그 거리(px) */
  dragStep?: number;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type DragEvt = { clientX: number; pointerId: number };
type KeyEvt = { key: string; preventDefault: () => void };

export default function SpinView360({
  label = "Mug in 360 degrees. Turn it with the arrow keys",
  frames = 12,
  dragStep = 18,
  demo = true,
  duration = 300,
  easing = "ease-out",
  color = "#17141a",
}: SpinView360Props) {
  const drag = useRef<{ x: number; i: number } | null>(null);
  const [live, setLive] = useState(demo);
  const [i, setI] = useState(0);

  function go(next: number) {
    setLive(false);
    setI(((next % frames) + frames) % frames);
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const track: CSSProperties = { transform: `translateX(${(-i * 100) / frames}%)` };

  return (
    <div className={[styles.root, live ? styles.isDemo : ""].join(" ")} style={vars}>
      <div
        className={styles.win}
        tabIndex={0}
        role="img"
        aria-label={label}
        onPointerDown={(e: DragEvt) => { drag.current = { x: e.clientX, i }; }}
        onPointerMove={(e: DragEvt) => {
          const d = drag.current;
          if (!d) return;
          go(d.i - Math.round((e.clientX - d.x) / dragStep));
        }}
        onPointerUp={() => { drag.current = null; }}
        onKeyDown={(e: KeyEvt) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          go(i + (e.key === "ArrowRight" ? 1 : -1));
        }}
      >
        <div className={styles.track} style={live ? undefined : track}>
          {Array.from({ length: frames }, (_, k) => (
            <div className={styles.f} key={k}>
              <i className={styles.handle} />
              <i className={styles.body} />
              <i className={styles.logo} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
