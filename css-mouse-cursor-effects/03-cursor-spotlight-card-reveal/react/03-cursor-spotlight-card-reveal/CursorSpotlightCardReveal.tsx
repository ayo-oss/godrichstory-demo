import { useRef, type CSSProperties, type PointerEvent } from "react";
import styles from "./CursorSpotlightCardReveal.module.scss";

export type CursorSpotlightCardRevealProps = {
  text?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** pointermove 좌표를 그대로 spotlight 엘리먼트의 translate 에 반영한다. mix-blend-mode 로 글자가 밝아진다 */
export default function CursorSpotlightCardReveal({
  text = "마우스를 올리면 숨어 있던 글자가 빛을 받아 드러난다",
  duration = 220,
  easing = "ease-out",
  color = "#ffffff",
}: CursorSpotlightCardRevealProps) {
  const spotRef = useRef<HTMLSpanElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const spot = spotRef.current;
    if (!spot) return;
    const r = e.currentTarget.getBoundingClientRect();
    spot.style.transform = `translate(${e.clientX - r.left}px,${e.clientY - r.top}px)`;
  };
  const leave = () => { if (spotRef.current) spotRef.current.style.transform = ""; };

  return (
    <div className={styles.card} style={vars} onPointerMove={move} onPointerLeave={leave}>
      <span ref={spotRef} className={styles.spot} aria-hidden="true" />
      <p className={styles.text}>{text}</p>
    </div>
  );
}
