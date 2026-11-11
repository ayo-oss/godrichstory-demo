// ProximityLetterSpacingButton — vanilla 판(run/408/demo/08-btn-proximity-letter-spacing-expand/index.html) 의 React 포트.
// 거리 값(0~1)을 글자 사이 간격 값(em)으로 바로 매핑한다. 커서가 멀 때는 글자가 좁게
// 뭉쳐 있다가 가까워질수록 라벨 글자 사이가 넓게 벌어진다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./ProximityLetterSpacingButton.module.scss";

type Box<T> = { current: T };

const PROX_RADIUS_PX = 170;
const LS_MAX_EM = 0.22;
const LERP = 0.17;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function syntheticOffset(t: number): [number, number] {
  const ang = t * 1.6 + 2.1;
  const rad = 110 * (1 + Math.cos(t * Math.PI));
  return [Math.cos(ang) * rad, Math.sin(ang) * rad];
}

export default function ProximityLetterSpacingButton() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const underlineRef = useRef<HTMLSpanElement | null>(null);
  const badgeRef = useRef<HTMLParagraphElement | null>(null);
  const targetPRef = useRef<number>(0) as Box<number>;
  const curPRef = useRef<number>(0) as Box<number>;
  const hasPointerRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const t0Ref = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(p: number): void {
    const btn = btnRef.current;
    const label = labelRef.current;
    const underline = underlineRef.current;
    const badge = badgeRef.current;
    if (!btn || !label || !underline || !badge) return;
    const spacing = p * LS_MAX_EM;
    label.style.letterSpacing = spacing.toFixed(3) + "em";
    btn.style.filter = "brightness(" + (1 + p * 0.12).toFixed(3) + ")";
    // 계산 레이어: 벌어진 실제 글자 폭(getBoundingClientRect)을 라벨 배경·밑줄 길이·후광 그림자에 전파한다.
    const w = label.getBoundingClientRect().width;
    underline.style.width = w.toFixed(1) + "px";
    btn.style.setProperty("--underline-o", (0.2 + p * 0.6).toFixed(2));
    btn.style.setProperty("--label-w", w.toFixed(1) + "px");
    btn.style.setProperty("--label-o", (0.12 + p * 0.4).toFixed(2));
    const spread = (6 + p * 26).toFixed(1);
    btn.style.boxShadow = "0 0 " + spread + "px " + spread + "px rgba(10,79,232," + (0.16 + p * 0.42).toFixed(2) + ")";
    badge.textContent = "간격 값 " + spacing.toFixed(2) + "em";
  }

  function distanceToButton(x: number, y: number): number {
    const btn = btnRef.current;
    if (!btn) return PROX_RADIUS_PX;
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return Math.hypot(x - cx, y - cy);
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(0);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) / 1000;
      if (!hasPointerRef.current) {
        const off = syntheticOffset(t);
        const d = Math.hypot(off[0], off[1]);
        targetPRef.current = clamp(1 - d / PROX_RADIUS_PX, 0, 1);
      }
      curPRef.current += (targetPRef.current - curPRef.current) * LERP;
      render(curPRef.current);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    hasPointerRef.current = true;
    setDemo(false);
    const d = distanceToButton(event.clientX, event.clientY);
    targetPRef.current = clamp(1 - d / PROX_RADIUS_PX, 0, 1);
    if (reduce) { curPRef.current = targetPRef.current; render(curPRef.current); }
  }

  function onPointerLeave(): void {
    hasPointerRef.current = false;
    targetPRef.current = 0;
    if (reduce) { curPRef.current = 0; render(0); }
  }

  function onFocus(): void {
    hasPointerRef.current = true;
    targetPRef.current = 1;
    if (reduce) { curPRef.current = 1; render(1); }
  }

  function onBlur(): void {
    hasPointerRef.current = false;
    targetPRef.current = 0;
    if (reduce) { curPRef.current = 0; render(0); }
  }

  const cls = [styles.ls, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge} ref={badgeRef}>간격 값 0em</p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <button className={styles.btn} ref={btnRef} type="button" onFocus={onFocus} onBlur={onBlur}>
            <span className={styles.label} ref={labelRef}>더 알아보기</span>
            <span className={styles.underline} ref={underlineRef} aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
  );
}
