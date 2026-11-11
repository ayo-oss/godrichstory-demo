import { useRef, type CSSProperties, type PointerEvent } from "react";
import styles from "./CursorShapeMorphLink.module.scss";

export type CursorShapeMorphLinkProps = {
  href?: string;
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** pointermove 로 커서 점이 따라가고, 링크 위에서 화살표 든 원으로 커진다. 터치 기기는 CSS 로 커서를 숨긴다 */
export default function CursorShapeMorphLink({
  href = "#",
  label = "자세히 보기",
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffffff",
}: CursorShapeMorphLinkProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const area = areaRef.current, cursor = cursorRef.current;
    if (!area || !cursor) return;
    const r = area.getBoundingClientRect();
    cursor.style.transform = `translate(${e.clientX - r.left}px,${e.clientY - r.top}px)`;
  };

  return (
    <div ref={areaRef} className={styles.area} style={vars} onPointerMove={move}>
      <a
        className={styles.link}
        href={href}
        onPointerEnter={() => cursorRef.current?.classList.add(styles.isLink)}
        onPointerLeave={() => cursorRef.current?.classList.remove(styles.isLink)}
      >
        {label}
      </a>
      <div ref={cursorRef} className={styles.cursor} aria-hidden="true">
        <span className={styles.shape}>
          <svg viewBox="0 0 256 256"><g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2" /><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z" /></g></svg>
        </span>
      </div>
    </div>
  );
}
