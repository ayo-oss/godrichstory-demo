// WavePanel — vanilla 판(run/372/demo/05-corner-shape-wave-panel/index.html) 의 React 포트.
// 모서리 네 곳의 위상을 어긋낸 사인파 네 개를 동시에 계산해 물결처럼 번갈아 부풀린다.
import { useEffect, useRef } from "react";
import styles from "./WavePanel.module.scss";

type Box<T> = { current: T };

const BASE_R = 20; // 네 모서리가 공유하는 기준 반경(px)
const AMP = 16; // 반경이 기준에서 출렁이는 폭(px)
const WAVE_MS = 2200; // 물결이 한 바퀴 도는 주기
const CORNERS = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"] as const;

export default function WavePanel() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const panelRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SUPPORTS = CSS.supports("corner-shape", "superellipse(1)");

    const root = rootRef.current;
    const panel = panelRef.current;
    const readout = readoutRef.current;
    if (!root || !panel || !readout) return;

    let isDemo = true;
    let paused = false;
    let frozenAt = 0;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    // 계산 겹: 모서리마다 위상을 PI/2 씩 어긋낸 사인파 4개를 동시에 계산해 물결처럼 번갈아 부풀린다
    function corners(t: number) {
      const out: number[] = [];
      for (let i = 0; i < 4; i++) {
        const phase = i * (Math.PI / 2);
        const r = BASE_R + AMP * Math.sin(t * Math.PI * 2 + phase);
        out.push(Math.max(2, r));
      }
      return out;
    }

    function applyCorners(rs: number[]) {
      for (let i = 0; i < 4; i++) {
        if (SUPPORTS) (panel!.style as any).cornerShape = "superellipse(2.2)";
        (panel!.style as any)["border" + CORNERS[i] + "Radius"] = rs[i].toFixed(2) + "px";
      }
      readout!.textContent = "위상 어긋남 " + (rs[0] - rs[2]).toFixed(1);
    }

    function onClick() {
      human();
      paused = !paused;
      panel!.setAttribute("aria-pressed", String(paused));
      if (paused) frozenAt = performance.now();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); onClick(); }
    }
    panel.addEventListener("click", onClick);
    panel.addEventListener("keydown", onKeyDown);

    let start = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      let t: number;
      if (reduce) {
        t = 0.25;
      } else if (paused) {
        t = ((frozenAt - start) % WAVE_MS) / WAVE_MS;
      } else {
        t = ((ts - start) % WAVE_MS) / WAVE_MS;
      }
      applyCorners(corners(t));
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      panel.removeEventListener("click", onClick);
      panel.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <button
          className={styles.panel}
          ref={panelRef}
          type="button"
          aria-pressed="false"
          aria-label="네 모서리 물결 정지·재생"
        />
        <p className={styles.readout} ref={readoutRef} aria-live="polite">위상 어긋남 0.0</p>
      </div>
    </main>
  );
}
