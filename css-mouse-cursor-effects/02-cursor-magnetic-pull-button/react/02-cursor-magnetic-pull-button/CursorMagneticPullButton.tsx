import { useRef, type CSSProperties, type PointerEvent } from "react";
import styles from "./CursorMagneticPullButton.module.scss";

export type CursorMagneticPullButtonProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
const STRENGTH = 0.4;

/** 버튼 히트 존 안에서 pointermove 좌표로 자석처럼 끌려오는 translate 를 계산한다 */
export default function CursorMagneticPullButton({
  label = "시작하기",
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff9ebb",
}: CursorMagneticPullButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    btn.style.transform = `translate(${dx * STRENGTH}px,${dy * STRENGTH}px)`;
  };
  const leave = () => { if (btnRef.current) btnRef.current.style.transform = ""; };

  return (
    <div className={styles.zone} style={vars} onPointerMove={move} onPointerLeave={leave}>
      <button ref={btnRef} className={styles.btn} type="button">
        <span>{label}</span>
        <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2" /><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z" /></g></svg>
      </button>
    </div>
  );
}
