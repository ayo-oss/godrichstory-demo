import { useEffect, useRef } from "react";
import styles from "./PullRefreshThresholdCommit.module.scss";

export type PullRefreshThresholdCommitProps = {
  color?: string;
};

export default function PullRefreshThresholdCommit({
  color = "#0a4fe8",
}: PullRefreshThresholdCommitProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const phone = root.querySelector<HTMLDivElement>(`.${styles.phone}`);
    const disc = root.querySelector<HTMLSpanElement>(`.${styles.disc}`);
    const list = root.querySelector<HTMLDivElement>(`.${styles.list}`);
    const hint = root.querySelector<HTMLSpanElement>(`.${styles.hint}`);
    if (!phone || !disc || !list || !hint) return;

    // 계산 겹: 확정 여부(committed candidate)는 raw 하나의 부등호가 아니라 두 문턱의 히스테리시스로 정한다.
    // ON(100px) 을 넘으면 true 로, 다시 OFF(70px) 아래로 내려가야만 false 로 — 경계 근처에서 깜빡이지 않는다.
    const ON = 100, OFF = 70, MAX = 160;
    let candidate = false;
    let state: "idle" | "dragging" | "committing" = "idle";
    const readyClass = styles["disc--ready"];
    const spinClass = styles["disc--spin"];

    function setCandidate(raw: number) {
      if (!candidate && raw >= ON) { candidate = true; }
      else if (candidate && raw < OFF) { candidate = false; }
    }

    function apply(raw: number) {
      setCandidate(raw);
      const pull = Math.min(raw, MAX) * 0.3;
      disc!.style.transform = "translateY(" + pull.toFixed(1) + "px) scale(" + (0.7 + 0.3 * Math.min(1, raw / ON)).toFixed(2) + ")";
      disc!.classList.toggle(readyClass, candidate);
      list!.style.transform = "translateY(" + pull.toFixed(1) + "px)";
      hint!.textContent = candidate ? "놓으면 새로고침" : (raw > 4 ? "더 당기세요 (" + Math.round(raw) + "/" + ON + "px)" : "아래로 당기세요");
    }

    let commitTimer: number | null = null;
    function commit() {
      state = "committing";
      hint!.textContent = "새로고침 중";
      disc!.classList.add(spinClass);
      commitTimer = window.setTimeout(() => {
        disc!.classList.remove(spinClass, readyClass);
        candidate = false; state = "idle";
        hint!.textContent = "아래로 당기세요";
        apply(0);
      }, 620);
    }

    let dragging = false, startY = 0, startRaw = 0, raw = 0, target = 0, raf: number | null = null;
    function settle() {
      raw += (target - raw) * 0.3;
      if (Math.abs(target - raw) < 0.3) { raw = target; }
      apply(raw);
      raf = raw !== target ? requestAnimationFrame(settle) : null;
    }
    function goTo(v: number) { target = v; if (raf === null) { raf = requestAnimationFrame(settle); } }

    function onDown(y: number) {
      if (state !== "idle") return;
      dragging = true; state = "dragging"; startY = y; startRaw = raw;
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
      if (candidate) { commit(); } else { state = "idle"; goTo(0); }
    }

    function onPointerDown(e: PointerEvent) { stopAutoplay(); onDown(e.clientY); }
    function onPointerMove(e: PointerEvent) { onMove(e.clientY); }
    phone.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onUp);
    apply(0);

    let autoRaw = 0, autoTimer: number | null = null;
    function autoTick() {
      if (state !== "idle" && state !== "dragging") return;
      state = "dragging";
      autoRaw += 28;
      if (autoRaw >= MAX) {
        raw = MAX; apply(raw); autoRaw = 0;
        if (candidate) { commit(); } else { state = "idle"; goTo(0); }
        return;
      }
      raw = autoRaw; apply(raw);
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
      if (commitTimer !== null) { window.clearTimeout(commitTimer); }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 170); }

    return () => {
      stopAutoplay();
      if (raf !== null) { cancelAnimationFrame(raf); }
      phone.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.prtc}>
        <div className={styles.phone}>
          <div className={styles.zone}>
            <span className={styles.disc} style={{ "--accent": color } as any} />
          </div>
          <div className={styles.list}>
            <div className={styles.row} />
            <div className={styles.row} />
          </div>
        </div>
        <span className={styles.hint}>아래로 당기세요</span>
      </div>
    </div>
  );
}
