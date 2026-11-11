import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LightboxFlip.module.scss";

export type LightboxFlipProps = {
  thumbLabels?: string[];
  dialogLabel?: string;
  closeLabel?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };

const Close = () => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true">
    <g fill="currentColor">
      <path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
      <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
    </g>
  </svg>
);

export default function LightboxFlip({
  thumbLabels = ["Open the first photo", "Open the second photo", "Open the third photo"],
  dialogLabel = "Photo viewer",
  closeLabel = "Close",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: LightboxFlipProps) {
  const thumbsRef = useRef<HTMLButtonElement[]>([]);
  const thumbs: HTMLButtonElement[] = thumbsRef.current || (thumbsRef.current = []);
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [live, setLive] = useState(demo);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(2);

  // FLIP — 두 자리를 재고, 차이만큼 되돌려 놓고, 한 프레임 뒤에 푼다
  function flipFrom(i: number) {
    const from = thumbs[i - 1] ? thumbs[i - 1].getBoundingClientRect() : null;
    const to = panel.current ? panel.current.getBoundingClientRect() : null;
    if (!from || !to || !panel.current) return;
    panel.current.style.transition = "none";
    panel.current.style.transform =
      `translate(${from.left - to.left + (from.width - to.width) / 2}px,` +
      `${from.top - to.top + (from.height - to.height) / 2}px) ` +
      `scale(${from.width / to.width},${from.height / to.height})`;
    requestAnimationFrame(() => {
      if (!panel.current) return;
      panel.current.style.transition = "";
      panel.current.style.transform = "";
      if (closeBtn.current) closeBtn.current.focus({ preventScroll: true });
    });
  }

  function openAt(i: number) {
    setLive(false);
    setIndex(i);
    setOpen(true);
    flipFrom(i);
  }

  function close() {
    setOpen(false);
    const t = thumbs[index - 1];
    if (t) t.focus({ preventScroll: true });
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.root, live ? styles.isDemo : "", open ? styles.isOpen : ""].join(" ");

  return (
    <div
      className={cls}
      style={vars}
      data-i={index}
      onKeyDown={(e: KeyEvt) => {
        if (!open) return;
        if (e.key === "Escape") { e.preventDefault(); close(); }
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          const n = index + (e.key === "ArrowRight" ? 1 : -1);
          setIndex(n < 1 ? 3 : n > 3 ? 1 : n);
        }
      }}
    >
      <div className={styles.grid}>
        {[1, 2, 3].map((i) => (
          <button
            key={i}
            className={[styles.t, i === 1 ? styles.t1 : i === 2 ? styles.t2 : styles.t3].join(" ")}
            type="button"
            aria-label={thumbLabels[i - 1]}
            ref={(el: HTMLButtonElement) => { thumbs[i - 1] = el; }}
            onClick={() => openAt(i)}
          />
        ))}
      </div>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={dialogLabel}>
        <div className={styles.scrim} onClick={close} />
        <div className={styles.panel} ref={panel}>
          <button className={styles.x} type="button" aria-label={closeLabel} ref={closeBtn} onClick={close}>
            <Close />
          </button>
        </div>
      </div>
    </div>
  );
}
