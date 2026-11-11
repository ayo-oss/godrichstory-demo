import { useRef, useState } from "react";
import styles from "./ThumbnailLightboxMorph.module.scss";

export interface ThumbnailLightboxMorphProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function ThumbnailLightboxMorph({
  duration = "600ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
}: ThumbnailLightboxMorphProps) {
  const thumbRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  function openFlip() {
    const t = thumbRef.current?.getBoundingClientRect();
    const p = panelRef.current?.getBoundingClientRect();
    if (!t || !p || !panelRef.current) return;
    panelRef.current.style.transform = `translate(${t.left - p.left}px,${t.top - p.top}px) scale(${t.width / p.width},${t.height / p.height})`;
    setOpen(true);
    requestAnimationFrame(() => {
      if (panelRef.current) panelRef.current.style.transform = "translate(0,0) scale(1,1)";
    });
  }
  function closeFlip() {
    setOpen(false);
    if (panelRef.current) panelRef.current.style.transform = "";
  }

  return (
    <div className={styles.frame} style={{ transitionDuration: duration, transitionTimingFunction: easing }}>
      <button ref={thumbRef} className={styles.thumb} type="button" onClick={openFlip}>
        <span className={styles.thumbPhoto} />
      </button>
      <div
        ref={panelRef}
        className={`${styles.panel} ${open ? styles.isOpen : ""}`}
        style={{ transitionDuration: duration, transitionTimingFunction: easing }}
        onClick={closeFlip}
      >
        <span className={styles.panelPhoto} />
      </div>
    </div>
  );
}
