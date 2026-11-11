import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PinchZoom.module.scss";

export type PinchZoomProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; clientY: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type WEvt = { deltaY: number; preventDefault(): void };
type Box<T> = { current: T };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Pt = { x: number; y: number };

const IconIn = () => (
  <svg viewBox="0 0 256 256" width="15" height="15"><g fill="currentColor"><path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2"/><path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72m112 0a8 8 0 0 1-8 8h-24v24a8 8 0 0 1-16 0v-24H80a8 8 0 0 1 0-16h24V80a8 8 0 0 1 16 0v24h24a8 8 0 0 1 8 8"/></g></svg>
);
const IconOut = () => (
  <svg viewBox="0 0 256 256" width="15" height="15"><g fill="currentColor"><path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2"/><path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72m112 0a8 8 0 0 1-8 8H80a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8"/></g></svg>
);

export default function PinchZoom({
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: PinchZoomProps) {
  const [tf, setTf] = useState({ scale: 1, rot: 0, tx: 0, ty: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const ptrs = useRef<Record<number, Pt>>({}) as Box<Record<number, Pt>>;
  const start = useRef({ scale: 1, rot: 0, tx: 0, ty: 0, d: 0, ang: 0, px: 0, py: 0 }) as Box<{ scale: number; rot: number; tx: number; ty: number; d: number; ang: number; px: number; py: number }>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function pinchInfo() {
    const ks = Object.keys(ptrs.current);
    if (ks.length < 2) return null;
    const r = (frameRef.current as HTMLDivElement).getBoundingClientRect();
    const a = ptrs.current[Number(ks[0])], b = ptrs.current[Number(ks[1])];
    return {
      d: Math.hypot(a.x - b.x, a.y - b.y),
      ang: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI,
    };
  }

  function clampScale(s: number) { return Math.max(0.6, Math.min(2.4, s)); }

  function onDown(e: PEvt) {
    e.currentTarget.setPointerCapture(e.pointerId);
    ptrs.current[e.pointerId] = { x: e.clientX, y: e.clientY };
    const info = pinchInfo();
    start.current = { scale: tf.scale, rot: tf.rot, tx: tf.tx, ty: tf.ty,
      d: info ? info.d : 0, ang: info ? info.ang : 0, px: e.clientX, py: e.clientY };
    e.preventDefault();
  }
  function onMove(e: PEvt) {
    if (!(e.pointerId in ptrs.current)) return;
    ptrs.current[e.pointerId] = { x: e.clientX, y: e.clientY };
    const info = pinchInfo();
    if (info && start.current.d > 0) {
      let da = info.ang - start.current.ang;
      while (da > 180) da -= 360;
      while (da < -180) da += 360;
      setTf((t) => ({
        ...t,
        scale: clampScale(start.current.scale * info.d / start.current.d),
        rot: Math.max(-24, Math.min(24, start.current.rot + da * 0.5)),
      }));
    } else if (tf.scale > 1.05) {
      setTf((t) => ({ ...t, tx: start.current.tx + (e.clientX - start.current.px), ty: start.current.ty + (e.clientY - start.current.py) }));
    }
  }
  function onUp(e: PEvt) {
    delete ptrs.current[e.pointerId];
    const ks = Object.keys(ptrs.current);
    if (ks.length === 1) {
      const p = ptrs.current[Number(ks[0])];
      start.current = { ...start.current, d: 0, ang: 0, px: p.x, py: p.y };
    }
  }

  function onWheel(e: WEvt) {
    setTf((t) => ({ ...t, scale: clampScale(t.scale * (e.deltaY < 0 ? 1.12 : 0.89)) }));
    e.preventDefault();
  }
  function step(di: number) {
    setTf((t) => ({ ...t, scale: clampScale(t.scale + di) }));
  }
  function onKey(e: KeyEvt) {
    if (e.key === "ArrowRight") { setTf((t) => ({ ...t, tx: t.tx + 8 })); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { setTf((t) => ({ ...t, tx: t.tx - 8 })); e.preventDefault(); }
    else if (e.key === "ArrowDown") { setTf((t) => ({ ...t, ty: t.ty + 8 })); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setTf((t) => ({ ...t, ty: t.ty - 8 })); e.preventDefault(); }
  }

  return (
    <div className={styles.pz} style={vars} onKeyDown={onKey} tabIndex={0} aria-label="Pinch zoom viewer">
      <div
        ref={frameRef}
        className={styles.frame}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
      >
        <div
          className={styles.photo}
          style={{ transform: `translate(${tf.tx}px, ${tf.ty}px) scale(${tf.scale}) rotate(${tf.rot}deg)` }}
        >
          <svg viewBox="0 0 190 128" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <rect className={styles.bg} width="190" height="128" />
            <circle className={styles.moon} cx="138" cy="36" r="15" />
            <polygon className={styles.t1} points="0,128 55,58 110,128" />
            <polygon className={styles.t2} points="76,128 138,70 190,118 190,128" />
            <rect className={styles.field} y="102" width="190" height="26" />
            <circle className={styles.tree} cx="30" cy="96" r="7" />
            <circle className={styles.treeB} cx="163" cy="92" r="5" />
          </svg>
        </div>
      </div>
      <div className={styles.side}>
        <button type="button" className={styles.btn} aria-label="Zoom in" onClick={(): void => step(0.2)}>
          <IconIn />
        </button>
        <span className={styles.zoom} aria-live="polite">{`${Math.round(tf.scale * 100)}%`}</span>
        <button type="button" className={styles.btn} aria-label="Zoom out" onClick={(): void => step(-0.2)}>
          <IconOut />
        </button>
      </div>
    </div>
  );
}
