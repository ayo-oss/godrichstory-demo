import { CSSProperties, PointerEvent, useCallback, useRef } from "react";
import styles from "./SpotlightNeighbors.module.scss";

type Vars = CSSProperties & { "--color"?: string; "--mx"?: string; "--my"?: string };

export interface SpotlightNeighborsProps {
  color?: string;
}

const LABELS = ["Product", "Design", "Growth", "Support"];

// 실사용: 진짜 pointermove 로 --mx·--my 를 갱신한다. 켜고 끄는 건 CSS :has() 가 한다
export default function SpotlightNeighbors({ color = "#2f6df6" }: SpotlightNeighborsProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const el = gridRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%";
    const y = (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%";
    el.style.setProperty("--mx", x);
    el.style.setProperty("--my", y);
  }, []);

  const style: Vars = { "--color": color };

  return (
    <div className={styles.grid} style={style} ref={gridRef} onPointerMove={handleMove}>
      {LABELS.map((label) => (
        <div key={label} className={styles.tile}>
          <span className={styles.tag}>{label}</span>
        </div>
      ))}
    </div>
  );
}
