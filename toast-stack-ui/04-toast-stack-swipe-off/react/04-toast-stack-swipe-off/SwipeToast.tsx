import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SwipeToast.module.scss";

export type SwipeToastProps = {
  message?: string;
  under?: string;
  hint?: string;
  regionLabel?: string;
  threshold?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--dx"?: string; "--duration"?: string; "--easing"?: string; "--color"?: string };
// React 이벤트 타입은 'react' 에서 import 하지 않는다 — 필요한 모양만 여기서 선언한다
type PointerEvt = { clientX: number; pointerId: number; currentTarget: { setPointerCapture: (id: number) => void } };
type KeyEvt = { key: string; preventDefault: () => void };

export default function SwipeToast({
  message = "You have a new message",
  under = "More unread updates behind this",
  hint = "Drag sideways to dismiss",
  regionLabel = "Swipe-to-dismiss notification",
  threshold = 72,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SwipeToastProps) {
  const [demo, setDemo] = useState(true);
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const [out, setOut] = useState(false);
  const from = useRef<number[]>([0]);
  const back = useRef<number[]>([0]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cardVars: CSSProperties & { "--dx"?: string } = { "--dx": `${dx}px` };

  function fling(dir: number) {
    setOut(true);
    setDx(dir * 420);
    const b = back.current ?? [0];
    clearTimeout(b[0]);
    b[0] = setTimeout(() => { setOut(false); setDx(0); }, 900) as unknown as number;
  }

  return (
    <div className={`${styles.sw} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.box}>
        <article className={styles.under} aria-hidden="true">
          <span className={styles.ic}>
            <svg viewBox="0 0 256 256" width="20" height="20"><g fill="currentColor"><path d="M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12" opacity=".2" /><path d="M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z" /></g></svg>
          </span>
          <span className={styles.msg}>{under}</span>
        </article>
        <article
          className={`${styles.card} ${drag ? styles.isDrag : ""} ${out ? styles.isOut : ""}`}
          style={cardVars}
          tabIndex={0}
          role="region"
          aria-label={regionLabel}
          onPointerDown={(e: PointerEvt) => {
            setDemo(false);
            setDrag(true);
            const f = from.current ?? [0];
            f[0] = e.clientX;
            e.currentTarget.setPointerCapture(e.pointerId); // 손가락이 카드를 벗어나도 move 가 계속 온다
          }}
          onPointerMove={(e: PointerEvt) => {
            if (!drag) return;
            setDx(e.clientX - (from.current ?? [0])[0]);
          }}
          onPointerUp={() => {
            if (!drag) return;
            setDrag(false);
            if (Math.abs(dx) > threshold) fling(dx < 0 ? -1 : 1); else setDx(0);
          }}
          onKeyDown={(e: KeyEvt) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            setDemo(false);
            e.preventDefault();
            fling(e.key === "ArrowLeft" ? -1 : 1);
          }}
        >
          <span className={styles.ic}>
            <svg viewBox="0 0 256 256" width="20" height="20"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" /><path d="M144 176a8 8 0 0 1-8 8a16 16 0 0 1-16-16v-40a8 8 0 0 1 0-16a16 16 0 0 1 16 16v40a8 8 0 0 1 8 8m88-48A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88m-92-32a12 12 0 1 0-12-12a12 12 0 0 0 12 12" /></g></svg>
          </span>
          <span className={styles.msg}>{message}</span>
        </article>
      </div>
      <p className={styles.hint}>
        <span className={styles.hic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="16" height="16"><g fill="currentColor"><path d="M208 80v96H48V80Z" opacity=".2" /><path d="m213.66 181.66l-32 32a8 8 0 0 1-11.32-11.32L188.69 184H48a8 8 0 0 1 0-16h140.69l-18.35-18.34a8 8 0 0 1 11.32-11.32l32 32a8 8 0 0 1 0 11.32m-139.32-64a8 8 0 0 0 11.32-11.32L67.31 88H208a8 8 0 0 0 0-16H67.31l18.35-18.34a8 8 0 0 0-11.32-11.32l-32 32a8 8 0 0 0 0 11.32Z" /></g></svg>
        </span>
        {hint}
      </p>
    </div>
  );
}
