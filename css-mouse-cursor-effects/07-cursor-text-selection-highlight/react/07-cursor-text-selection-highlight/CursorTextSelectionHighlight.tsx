import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./CursorTextSelectionHighlight.module.scss";

export type CursorTextSelectionHighlightProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** selectionchange 로 실제 텍스트 선택을 감지해 복사 배지를 선택 영역 위에 띄운다. 색은 ::selection 으로 지정 */
export default function CursorTextSelectionHighlight({
  duration = 300,
  easing = "ease-out",
  color = "#ff9ebb",
}: CursorTextSelectionHighlightProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [badge, setBadge] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    const onChange = () => {
      const card = cardRef.current;
      const sel = window.getSelection();
      if (!card || !sel || sel.isCollapsed || !card.contains(sel.anchorNode)) {
        setBadge((b) => ({ ...b, show: false }));
        return;
      }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const cr = card.getBoundingClientRect();
      setBadge({ x: r.left - cr.left + r.width / 2, y: r.top - cr.top - 28, show: true });
    };
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, []);

  return (
    <div ref={cardRef} className={styles.card} style={vars}>
      <p className={styles.text}>
        드래그로 문장을 선택하면 <mark className={styles.mark}>형광펜 색</mark>으로 칠해진다.
      </p>
      <span
        className={`${styles.badge} ${badge.show ? styles.shown : ""}`}
        style={{ left: badge.x, top: badge.y }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 256 256"><g fill="currentColor"><path d="M216 40v128h-48V88H88V40Z" opacity=".2" /><path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" /></g></svg>
        복사
      </span>
    </div>
  );
}
