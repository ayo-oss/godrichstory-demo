import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import styles from "./CursorContextMenuCustom.module.scss";

export type CursorContextMenuCustomProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** contextmenu 를 막고 클릭 좌표(클램프 처리)에 커스텀 메뉴를 띄운다. 바깥 클릭·Escape 로 닫는다 */
export default function CursorContextMenuCustom({
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ffffff",
}: CursorContextMenuCustomProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 68, y: 52 });
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const onContext = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    setPos({
      x: Math.min(e.clientX - r.left, r.width - 132),
      y: Math.min(e.clientY - r.top, r.height - 112),
    });
    setOpen(true);
  };

  useEffect(() => {
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div ref={padRef} className={styles.pad} style={vars} onContextMenu={onContext}>
      <p className={styles.hint}>여기서 우클릭</p>
      <div
        className={`${styles.menu} ${open ? styles.open : ""}`}
        role="menu"
        style={{ left: pos.x, top: pos.y }}
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        <button className={styles.item} type="button" role="menuitem">
          <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M216 40v128h-48V88H88V40Z" opacity=".2" /><path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" /></g></svg>
          복사
        </button>
        <button className={styles.item} type="button" role="menuitem">
          <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M221.66 90.34L192 120l-56-56l29.66-29.66a8 8 0 0 1 11.31 0L221.66 79a8 8 0 0 1 0 11.34" opacity=".2" /><path d="m227.31 73.37l-44.68-44.69a16 16 0 0 0-22.63 0L36.69 152A15.86 15.86 0 0 0 32 163.31V208a16 16 0 0 0 16 16h44.69a15.86 15.86 0 0 0 11.31-4.69L227.31 96a16 16 0 0 0 0-22.63M92.69 208H48v-44.69l88-88L180.69 120ZM192 108.68L147.31 64l24-24L216 84.68Z" /></g></svg>
          수정
        </button>
        <button className={`${styles.item} ${styles.danger}`} type="button" role="menuitem">
          <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M200 56v152a8 8 0 0 1-8 8H64a8 8 0 0 1-8-8V56Z" opacity=".2" /><path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16M96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0m48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0" /></g></svg>
          삭제
        </button>
      </div>
    </div>
  );
}
