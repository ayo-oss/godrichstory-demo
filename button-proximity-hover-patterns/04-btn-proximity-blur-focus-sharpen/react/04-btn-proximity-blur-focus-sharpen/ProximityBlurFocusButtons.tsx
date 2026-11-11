// ProximityBlurFocusButtons — vanilla 판(run/408/demo/04-btn-proximity-blur-focus-sharpen/index.html) 의 React 포트.
// 버튼 4개의 중심 좌표를 각각 재고 커서까지 거리로 정렬(sort)해 순위를 구한다 —
// 가장 가까운(순위 0) 버튼만 흐림 값이 0 으로 남고 나머지는 순위·거리 값을 섞어 흐려진다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./ProximityBlurFocusButtons.module.scss";

type Box<T> = { current: T };

const PROX_RADIUS_PX = 220;
const BF_BLUR_MAX_PX = 6;
const LERP = 0.2;
const LABELS = ["신규", "인기", "할인", "추천"];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function ProximityBlurFocusButtons() {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]) as Box<(HTMLButtonElement | null)[]>;
  const targetBlurRef = useRef<number[]>(LABELS.map(() => BF_BLUR_MAX_PX)) as Box<number[]>;
  const curBlurRef = useRef<number[]>(LABELS.map(() => BF_BLUR_MAX_PX)) as Box<number[]>;
  const hasPointerRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const t0Ref = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function centersOf(): [number, number][] {
    return btnRefs.current.map((b) => {
      if (!b) return [0, 0];
      const r = b.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
  }

  function updateTargets(px: number, py: number): void {
    const centers = centersOf();
    const dists = centers.map((c) => Math.hypot(px - c[0], py - c[1]));
    const order = dists.map((_, i) => i).sort((a, b) => dists[a] - dists[b]);
    order.forEach((idx, rank) => {
      const near = clamp(1 - dists[idx] / PROX_RADIUS_PX, 0, 1);
      const byRank = rank === 0 ? 0 : Math.min(1, rank / (LABELS.length - 1));
      const mix = Math.max(byRank, 1 - near);
      targetBlurRef.current[idx] = mix * BF_BLUR_MAX_PX;
    });
  }

  function render(): void {
    LABELS.forEach((_, i) => {
      const b = btnRefs.current[i];
      if (!b) return;
      curBlurRef.current[i] += (targetBlurRef.current[i] - curBlurRef.current[i]) * LERP;
      // 계산 레이어: 같은 흐림 값(curBlur)을 채도·명도·후광 그림자에도 전파한다 — 멀수록 흐리고 탁하게.
      const t = clamp(curBlurRef.current[i] / BF_BLUR_MAX_PX, 0, 1);
      const sat = (1 - t * 0.55).toFixed(2);
      const bri = (1 - t * 0.24).toFixed(2);
      b.style.filter = "blur(" + curBlurRef.current[i].toFixed(2) + "px) saturate(" + sat + ") brightness(" + bri + ")";
      const near = 1 - t;
      const spread = (near * 22).toFixed(1);
      const glowA = (near * 0.5).toFixed(2);
      b.style.boxShadow = "0 0 " + spread + "px " + spread + "px rgba(10,79,232," + glowA + ")";
    });
  }

  function syntheticPoint(t: number): [number, number] {
    const centers = centersOf();
    const row = rowRef.current;
    const rowRect = row ? row.getBoundingClientRect() : { left: 0, width: 0, top: 0 };
    const idx = Math.floor((t * 0.6) % centers.length);
    const target = centers[idx] || [rowRect.left + rowRect.width / 2, rowRect.top];
    const wobble = Math.sin(t * Math.PI) * 30;
    return [target[0] + wobble, target[1]];
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      targetBlurRef.current = LABELS.map(() => BF_BLUR_MAX_PX * 0.4);
      curBlurRef.current = targetBlurRef.current.slice();
      render();
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) / 1000;
      if (!hasPointerRef.current) {
        const p = syntheticPoint(t);
        updateTargets(p[0], p[1]);
      }
      render();
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    hasPointerRef.current = true;
    setDemo(false);
    updateTargets(event.clientX, event.clientY);
    if (reduce) { curBlurRef.current = targetBlurRef.current.slice(); render(); }
  }

  function onPointerLeave(): void {
    hasPointerRef.current = false;
    targetBlurRef.current = LABELS.map(() => BF_BLUR_MAX_PX * 0.4);
    if (reduce) { curBlurRef.current = targetBlurRef.current.slice(); render(); }
  }

  function onFocusIdx(i: number): void {
    hasPointerRef.current = true;
    targetBlurRef.current = LABELS.map((_, j) => (j === i ? 0 : BF_BLUR_MAX_PX));
    if (reduce) { curBlurRef.current = targetBlurRef.current.slice(); render(); }
  }

  function onBlurIdx(): void {
    hasPointerRef.current = false;
    targetBlurRef.current = LABELS.map(() => BF_BLUR_MAX_PX * 0.4);
    if (reduce) { curBlurRef.current = targetBlurRef.current.slice(); render(); }
  }

  const cls = [styles.bf, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <div className={styles.row} ref={rowRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          {LABELS.map((label, i) => (
            <button
              key={label}
              className={styles.btn}
              type="button"
              ref={(el: HTMLButtonElement | null) => { btnRefs.current[i] = el; }}
              onFocus={() => onFocusIdx(i)}
              onBlur={onBlurIdx}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
