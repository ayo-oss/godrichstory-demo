import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DialogFocusTrap.module.scss";

// 다이얼로그 포커스 트랩 — Tab 방향 값(+1/-1)으로 다음 인덱스를 순환 계산해 그 요소로 포커스를 옮긴다.
// 계산 겹: 열릴 때마다 [data-f] 개수를 다시 재고, (i % len + len) % len 순환 인덱스로만 --i 를 옮긴다.
export default function DialogFocusTrap() {
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openBtnRef = useRef<HTMLButtonElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const indexRef = useRef(0);
  const autoplayRef = useRef<number | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  function focusables(): HTMLElement[] {
    const d = dialogRef.current;
    if (!d) return [];
    return Array.prototype.slice.call(d.querySelectorAll<HTMLElement>("[data-f]"));
  }

  function setIndex(i: number) {
    const list = focusables();
    const len = list.length;
    if (!len) return;
    const next = ((i % len) + len) % len;
    indexRef.current = next;
    markerRef.current?.style.setProperty("--i", String(next));
    list[next].focus({ preventScroll: true });
  }

  function openDialog() {
    setOpen(true);
    window.setTimeout(() => setIndex(0), 0);
  }

  function closeDialog() {
    setOpen(false);
    openBtnRef.current?.focus({ preventScroll: true });
  }

  function stopAutoplay() {
    if (autoplayRef.current) {
      window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      let step = 0;
      autoplayRef.current = window.setInterval(() => {
        if (!openRef.current) { openDialog(); step = 0; return; }
        step += 1;
        if (step > 4) { closeDialog(); return; }
        setIndex((indexRef.current ?? 0) + 1);
      }, 420);
      openDialog();
    }
    return () => stopAutoplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      rootRef.current?.classList.remove(styles["is-demo"]);
      stopAutoplay();
      closeDialog();
      return;
    }
    if (e.key !== "Tab") return;
    e.preventDefault();
    rootRef.current?.classList.remove(styles["is-demo"]);
    stopAutoplay();
    setIndex((indexRef.current ?? 0) + (e.shiftKey ? -1 : 1));
  }

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.ft} ${styles["is-demo"]}`}>
        <button
          ref={openBtnRef}
          className={styles.ft__open}
          type="button"
          onClick={() => { rootRef.current?.classList.remove(styles["is-demo"]); stopAutoplay(); openDialog(); }}
        >
          모달 열기
        </button>
        {open && (
          <div className={styles.ft__overlay}>
            <div className={styles.ft__dialog} ref={dialogRef} role="dialog" aria-modal="true" aria-label="설정 확인" onKeyDown={onKeyDown}>
              <div ref={markerRef} className={styles.ft__marker} style={{ "--i": 0 } as CSSProperties} aria-hidden="true" />
              <button className={styles.ft__field} data-f type="button">알림 켜기</button>
              <button className={styles.ft__field} data-f type="button">공유 허용</button>
              <button
                className={`${styles.ft__field} ${styles.ft__close}`}
                data-f
                type="button"
                onClick={() => { rootRef.current?.classList.remove(styles["is-demo"]); stopAutoplay(); closeDialog(); }}
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
