import { useEffect, useRef } from "react";
import styles from "./PullRefreshRowStaggerReveal.module.scss";

export type PullRefreshRowStaggerRevealProps = {
  color?: string;
};

export default function PullRefreshRowStaggerReveal({
  color = "#0a4fe8",
}: PullRefreshRowStaggerRevealProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const phone = root.querySelector<HTMLDivElement>(`.${styles.phone}`);
    const disc = root.querySelector<HTMLSpanElement>(`.${styles.disc}`);
    const list = root.querySelector<HTMLDivElement>(`.${styles.list}`);
    const hint = root.querySelector<HTMLSpanElement>(`.${styles.hint}`);
    if (!phone || !disc || !list || !hint) return;
    const rows = Array.from(root.querySelectorAll<HTMLDivElement>(`.${styles.row}`));

    // 계산 겹: 새로고침이 끝난 뒤 각 행의 등장 지연은 STAGGER_MS * 행 순번 — 한 번의 CSS
    // animation-delay 로 걸지 않고 행마다 setTimeout 을 따로 걸어 순번 계산을 그대로 노출한다.
    const REF = 90, MAX = 130, STAGGER_MS = 90, LATENCY_MS = 420;
    const readyClass = styles["disc--ready"];
    const spinClass = styles["disc--spin"];
    const inClass = styles["row--in"];

    let raw = 0, target = 0, raf: number | null = null;
    function apply(rawV: number) {
      const pull = Math.min(rawV, MAX) * 0.28;
      disc!.style.transform = "translateY(" + pull.toFixed(1) + "px) scale(" + (0.7 + 0.3 * Math.min(1, rawV / REF)).toFixed(2) + ")";
      disc!.classList.toggle(readyClass, rawV >= REF);
      hint!.textContent = rawV >= REF ? "놓으면 새로고침" : (rawV > 4 ? "더 당기세요 (" + Math.round(rawV) + "/" + REF + "px)" : "아래로 당기세요");
    }
    function settle() {
      raw += (target - raw) * 0.3;
      if (Math.abs(target - raw) < 0.3) raw = target;
      apply(raw);
      raf = raw !== target ? requestAnimationFrame(settle) : null;
    }
    function goTo(v: number) { target = v; if (raf === null) { raf = requestAnimationFrame(settle); } }

    let timers: number[] = [];
    function clearTimers() { timers.forEach((t) => window.clearTimeout(t)); timers = []; }

    function refreshCycle() {
      disc!.classList.add(spinClass);
      hint!.textContent = "새로고침 중";
      timers.push(window.setTimeout(() => {
        rows.forEach((row) => row.classList.remove(inClass));
        void list!.offsetHeight;
        rows.forEach((row, idx) => {
          timers.push(window.setTimeout(() => row.classList.add(inClass), idx * STAGGER_MS));
        });
        const totalDelay = (rows.length - 1) * STAGGER_MS + 260;
        timers.push(window.setTimeout(() => {
          disc!.classList.remove(spinClass, readyClass);
          hint!.textContent = "아래로 당기세요";
          raw = 0; apply(0);
        }, totalDelay));
      }, LATENCY_MS));
    }

    let dragging = false, startY = 0, startRaw = 0, committing = false;
    function onDown(y: number) {
      if (committing) return;
      dragging = true; startY = y; startRaw = raw;
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }
    function onMove(y: number) {
      if (!dragging) return;
      raw = Math.max(0, Math.min(MAX, startRaw + (y - startY)));
      apply(raw);
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      if (raw >= REF) {
        committing = true;
        refreshCycle();
        timers.push(window.setTimeout(() => { committing = false; }, LATENCY_MS + (rows.length - 1) * STAGGER_MS + 260));
      } else {
        goTo(0);
      }
    }

    function onPointerDown(e: PointerEvent) { stopAutoplay(); onDown(e.clientY); }
    function onPointerMove(e: PointerEvent) { onMove(e.clientY); }
    phone.style.touchAction = "none";
    phone.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onUp);
    rows.forEach((row) => row.classList.add(inClass));
    apply(0);

    let autoRaw = 0, autoTimer: number | null = null;
    function autoTick() {
      if (committing) return;
      autoRaw += 18;
      if (autoRaw >= REF) {
        raw = REF; apply(raw); autoRaw = 0;
        committing = true;
        refreshCycle();
        timers.push(window.setTimeout(() => { committing = false; }, LATENCY_MS + (rows.length - 1) * STAGGER_MS + 260));
        return;
      }
      raw = autoRaw; apply(raw);
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
      clearTimers();
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 190); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      phone.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.prsg}>
        <div className={styles.phone}>
          <div className={styles.zone}>
            <span className={styles.disc} style={{ "--accent": color } as any} />
          </div>
          <div className={styles.list}>
            <div className={styles.row} />
            <div className={styles.row} />
            <div className={styles.row} />
            <div className={styles.row} />
            <div className={styles.row} />
          </div>
        </div>
        <span className={styles.hint}>아래로 당기세요</span>
      </div>
    </div>
  );
}
