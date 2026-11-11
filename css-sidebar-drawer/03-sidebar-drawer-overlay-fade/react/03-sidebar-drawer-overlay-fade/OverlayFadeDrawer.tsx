import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./OverlayFadeDrawer.module.scss";

export type OverlayFadeDrawerProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

export default function OverlayFadeDrawer({
  duration = 300,
  easing = "ease-out",
  color = "#fff7e6",
}: OverlayFadeDrawerProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) { triggerRef.current?.focus({ preventScroll: true }); return; }
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>("a, button"));
    focusables()[0]?.focus({ preventScroll: true });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus({ preventScroll: true }); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus({ preventScroll: true }); e.preventDefault(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <div className={styles.page} inert={open || undefined} aria-hidden={open}>
        <button ref={triggerRef} className={styles.trigger} type="button" onClick={() => setOpen(true)}>
          필터 열기
        </button>
      </div>
      <div className={styles.overlay} data-open={open} onClick={() => setOpen(false)} />
      <div ref={panelRef} className={styles.drawer} data-open={open} role="dialog" aria-modal="true" aria-label="필터">
        <h2>필터</h2>
        <p>가격·배송·색상 옵션을 여기서 고른다.</p>
        <button className={styles.close} type="button" onClick={() => setOpen(false)}>닫기</button>
      </div>
    </div>
  );
}
