import { useEffect, useRef } from "react";
import styles from "./MobileSheetDrag.module.scss";

// 포인터가 움직인 거리(px)를 --drag 커스텀 속성에 담고, transform 은 CSS clamp() 로 0~최대값 사이만 움직이게 묶는다.
// 실제 드래그: pointerdown·pointermove·pointerup·pointercancel. 데모는 같은 --drag 값을 시드 고정 시퀀스로 흔들어 재생한다.
const MAX_DRAG = 130;

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export default function MobileSheetDrag() {
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sheet = sheetRef.current;
    const handle = handleRef.current;
    if (!sheet || !handle) return;

    let dragging = false;
    let startY = 0;
    let rafId = 0;

    function setDrag(px: number) {
      sheet!.style.setProperty("--drag", Math.max(0, Math.min(MAX_DRAG, px)) + "px");
    }

    function onPointerDown(e: PointerEvent) {
      dragging = true;
      startY = e.clientY;
      sheet!.classList.remove(styles["is-demo"]);
      sheet!.classList.add(styles["is-dragging"]);
      handle!.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      setDrag(e.clientY - startY);
    }

    function release() {
      if (!dragging) return;
      dragging = false;
      sheet!.classList.remove(styles["is-dragging"]);
      setDrag(0);
    }

    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", release);
    handle.addEventListener("pointercancel", release);

    function autoLoop(ts: number) {
      if (!sheet!.classList.contains(styles["is-demo"])) return;
      const t = (ts % 2000) / 2000;
      const px = t < 0.5 ? ease(t / 0.5) * MAX_DRAG : (1 - ease((t - 0.5) / 0.5)) * MAX_DRAG;
      setDrag(px);
      rafId = requestAnimationFrame(autoLoop);
    }
    rafId = requestAnimationFrame(autoLoop);

    return () => {
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", release);
      handle.removeEventListener("pointercancel", release);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={sheetRef} className={`${styles.sheet} ${styles["is-demo"]}`}>
        <button
          ref={handleRef}
          className={styles.sheet__handle}
          type="button"
          aria-label="시트 드래그해서 닫기"
        />
        <p className={styles.sheet__title}>필터</p>
        <div className={styles.sheet__row}>브랜드</div>
        <div className={styles.sheet__row}>가격대</div>
      </div>
    </main>
  );
}
