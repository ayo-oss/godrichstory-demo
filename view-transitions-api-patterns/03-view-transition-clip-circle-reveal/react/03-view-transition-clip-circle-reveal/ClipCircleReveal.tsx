// ClipCircleReveal — vanilla 판(run/401/demo/03-view-transition-clip-circle-reveal/index.html) 의 React 포트.
// 계산 겹: 누른 좌표 값(x, y)에서 패널의 네 꼭짓점까지 거리 중 가장 먼 값을 반지름으로 써서
// 원이 다 자랐을 때 패널 전체를 남김없이 덮는다.
import { useEffect, useRef } from "react";
import styles from "./ClipCircleReveal.module.scss";

type Box<T> = { current: T };

const HOLD_MS = 1000;
const CLIP_START_RADIUS_PX = 0;

function farthestCornerRadius(x: number, y: number, rect: { width: number; height: number }): number {
  const corners: [number, number][] = [
    [0, 0], [rect.width, 0], [0, rect.height], [rect.width, rect.height],
  ];
  let r = 0;
  for (let i = 0; i < corners.length; i++) {
    const dx = x - corners[i][0];
    const dy = y - corners[i][1];
    r = Math.max(r, Math.hypot(dx, dy));
  }
  return r;
}

export default function ClipCircleReveal() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const panelRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const labelRef = useRef(null) as unknown as Box<HTMLElement>;
  const toggleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const SUPPORTS_VT = "startViewTransition" in document;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let dark = false;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function renderState() {
      panelRef.current?.classList.toggle(styles.isDark, dark);
      if (labelRef.current) labelRef.current.textContent = dark ? "어두운 모드" : "밝은 모드";
    }

    function playClip(x: number, y: number, rect: DOMRect) {
      const panel = panelRef.current;
      if (!SUPPORTS_VT || !panel || !panel.animate) { renderState(); return; }
      const radius = farthestCornerRadius(x, y, rect);
      panel.style.viewTransitionName = "cr-panel";
      const t = document.startViewTransition(() => { renderState(); });
      t.ready.then(() => {
        document.documentElement.animate(
          { clipPath: ["circle(" + CLIP_START_RADIUS_PX + "px at " + x + "px " + y + "px)", "circle(" + radius.toFixed(1) + "px at " + x + "px " + y + "px)"] },
          { duration: 520, easing: "ease-in", pseudoElement: "::view-transition-new(cr-panel)" }
        );
      });
      t.finished.then(() => { if (panel) panel.style.viewTransitionName = ""; });
    }

    function toggleAt(x: number, y: number) {
      dark = !dark;
      const panel = panelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      playClip(x - rect.left, y - rect.top, rect);
    }

    function onToggleClick(e: MouseEvent) { human(); toggleAt(e.clientX, e.clientY); }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        human();
        const r = toggleRef.current?.getBoundingClientRect();
        if (!r) return;
        e.preventDefault();
        toggleAt(r.left + r.width / 2, r.top + r.height / 2);
      }
    }

    toggleRef.current?.addEventListener("click", onToggleClick);
    rootRef.current?.addEventListener("keydown", onKeydown);

    const corners = [
      () => { const r = panelRef.current!.getBoundingClientRect(); return [r.left + 8, r.top + 8]; },
      () => { const r = panelRef.current!.getBoundingClientRect(); return [r.right - 8, r.bottom - 8]; },
    ];
    let ci = 0;
    function loop() {
      if (!isDemo) return;
      const p = corners[ci % corners.length](); ci++;
      dark = !dark;
      const rect = panelRef.current!.getBoundingClientRect();
      playClip(p[0] - rect.left, p[1] - rect.top, rect);
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    } else {
      rootRef.current?.classList.remove(styles.isDemo);
    }

    return () => {
      window.clearTimeout(timerRef.current);
      toggleRef.current?.removeEventListener("click", onToggleClick);
      rootRef.current?.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cr + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.panel} ref={panelRef}>
          <p className={styles.label} ref={labelRef}>밝은 모드</p>
          <div className={styles.swatches}>
            <span className={styles.sw} /><span className={styles.sw} /><span className={styles.sw} />
          </div>
        </div>
        <button type="button" className={styles.toggle} ref={toggleRef} aria-label="테마 전환 — 누른 좌표 값에서 원이 번진다">
          <span className={styles.toggleDot} />
        </button>
      </div>
    </main>
  );
}
