import { CSSProperties, PointerEvent, useCallback, useRef } from "react";
import styles from "./RefractionHover.module.scss";

type Vars = CSSProperties & {
  "--color"?: string;
  "--mx"?: string;
  "--my"?: string;
};

export interface RefractionHoverProps {
  color?: string;
}

// 실사용: 진짜 pointermove 가 --mx·--my 를 갱신한다. 하이라이트는 CSS 만으로 그 좌표를 그린다
export default function RefractionHover({ color = "#fff7e6" }: RefractionHoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const el = panelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%";
    const y = (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%";
    el.style.setProperty("--mx", x);
    el.style.setProperty("--my", y);
  }, []);

  const style: Vars = { "--color": color };

  return (
    <div className={styles.panel} style={style} ref={panelRef} onPointerMove={handleMove}>
      <span className={styles.title}>Hover the glass</span>
      <span className={styles.desc}>Specular light follows the cursor</span>
    </div>
  );
}
