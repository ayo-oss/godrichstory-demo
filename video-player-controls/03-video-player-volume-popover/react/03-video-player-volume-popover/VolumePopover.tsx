import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./VolumePopover.module.scss";

export type VolumePopoverProps = {
  /** 더미 영상 길이(초) */
  total?: number;
  /** 시작 위치(초) */
  start?: number;
  /** 시작 음량 0~1 */
  initialVolume?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type SliderVars = CSSProperties & { "--v"?: string };

// TS7006 방지 — 'react' 의 이벤트 제네릭 대신 필요한 필드만 로컬로 선언한다
type Rect = { left: number; width: number };
type PtrEvt = {
  clientX: number;
  buttons: number;
  pointerId: number;
  currentTarget: { getBoundingClientRect: () => Rect; setPointerCapture: (id: number) => void };
};
type KeyEvt = { key: string; preventDefault: () => void };

function fmt(s: number) {
  const n = Math.floor(s);
  return Math.floor(n / 60) + ":" + ("0" + (n % 60)).slice(-2);
}

function HighIcon() {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">
      <g fill="currentColor">
        <path d="M80 88v80H32a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8Z" opacity=".2" />
        <path d="M155.51 24.81a8 8 0 0 0-8.42.88L77.25 80H32a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h45.25l69.84 54.31A8 8 0 0 0 160 224V32a8 8 0 0 0-4.49-7.19M32 96h40v64H32Zm112 111.64l-56-43.55V91.91l56-43.55Zm54-106.08a40 40 0 0 1 0 52.88a8 8 0 0 1-12-10.58a24 24 0 0 0 0-31.72a8 8 0 0 1 12-10.58M248 128a79.9 79.9 0 0 1-20.37 53.34a8 8 0 0 1-11.92-10.67a64 64 0 0 0 0-85.33a8 8 0 1 1 11.92-10.67A79.83 79.83 0 0 1 248 128" />
      </g>
    </svg>
  );
}

function LowIcon() {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">
      <g fill="currentColor">
        <path d="M80 88v80H32a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8Z" opacity=".2" />
        <path d="M155.51 24.81a8 8 0 0 0-8.42.88L77.25 80H32a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h45.25l69.84 54.31A8 8 0 0 0 160 224V32a8 8 0 0 0-4.49-7.19M32 96h40v64H32Zm112 111.64l-56-43.55V91.91l56-43.55ZM208 128a39.93 39.93 0 0 1-10 26.46a8 8 0 0 1-12-10.58a24 24 0 0 0 0-31.72a8 8 0 1 1 12-10.58A40 40 0 0 1 208 128" />
      </g>
    </svg>
  );
}

function MuteIcon() {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">
      <g fill="currentColor">
        <path d="M80 88v80H32a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8Z" opacity=".2" />
        <path d="M155.51 24.81a8 8 0 0 0-8.42.88L77.25 80H32a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h45.25l69.84 54.31A8 8 0 0 0 160 224V32a8 8 0 0 0-4.49-7.19M32 96h40v64H32Zm112 111.64l-56-43.57V91.94l56-43.58Zm101.66-61.3a8 8 0 0 1-11.32 11.32L216 139.31l-18.34 18.35a8 8 0 0 1-11.32-11.32L204.69 128l-18.35-18.34a8 8 0 0 1 11.32-11.32L216 116.69l18.34-18.35a8 8 0 0 1 11.32 11.32L227.31 128Z" />
      </g>
    </svg>
  );
}

export default function VolumePopover({
  total = 180,
  start = 84,
  initialVolume = 0.8,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ffd23f",
}: VolumePopoverProps) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(initialVolume);
  const [t, setT] = useState(start);
  const volRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const sliderVars: SliderVars = { "--v": v.toFixed(3) };

  // 더미 재생 시계 — 바닐라의 setInterval(500ms, +0.5초) 을 그대로
  useEffect(() => {
    const id = setInterval(() => setT((p) => (p + 0.5) % total), 500);
    return () => clearInterval(id);
  }, [total]);

  // 바깥을 누르면 닫는다
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (volRef.current && !volRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (open) sliderRef.current?.focus({ preventScroll: true });
  }, [open]);

  function set(e: PtrEvt) {
    const r = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setV(Math.round(p * 20) / 20);
  }

  const pct = Math.round(v * 100);
  const state = v === 0 ? styles.isMute : v < 0.5 ? styles.isLow : "";

  return (
    <figure className={`${styles.player} ${open ? styles.isOpen : ""} ${state}`} style={vars}>
      <div className={styles.screen}>
        <div className={styles.stripes} aria-hidden="true" />
        <div className={styles.world} aria-hidden="true">
          <span className={styles.sun} />
          <span className={`${styles.hill} ${styles.hillA}`} />
          <span className={`${styles.hill} ${styles.hillB}`} />
        </div>
        <span className={styles.clock}>{fmt(t)}</span>
        <span className={styles.badge}>{fmt(total)}</span>
        <div className={styles.vol} ref={volRef}>
          <button
            className={styles.btn}
            type="button"
            aria-label="음량 조절"
            aria-expanded={open}
            aria-controls="vol-pop"
            onClick={() => setOpen((o) => !o)}
          >
            <span className={`${styles.ic} ${styles.icHigh}`}>
              <HighIcon />
            </span>
            <span className={`${styles.ic} ${styles.icLow}`}>
              <LowIcon />
            </span>
            <span className={`${styles.ic} ${styles.icMute}`}>
              <MuteIcon />
            </span>
          </button>
          <div className={styles.pop} id="vol-pop">
            <div
              ref={sliderRef}
              className={styles.slider}
              style={sliderVars}
              role="slider"
              tabIndex={0}
              aria-label="음량"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-valuetext={`${pct}%`}
              onPointerDown={(e: PtrEvt) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                set(e);
              }}
              onPointerMove={(e: PtrEvt) => {
                if (e.buttons) set(e);
              }}
              onKeyDown={(e: KeyEvt) => {
                if (e.key === "ArrowRight") { setV((p) => Math.min(1, p + 0.1)); e.preventDefault(); }
                else if (e.key === "ArrowLeft") { setV((p) => Math.max(0, p - 0.1)); e.preventDefault(); }
                else if (e.key === "Home") { setV(0); e.preventDefault(); }
                else if (e.key === "End") { setV(1); e.preventDefault(); }
              }}
            >
              <span className={styles.track} aria-hidden="true">
                <span className={styles.fill} />
                <span className={styles.thumbwrap}>
                  <span className={styles.thumb} />
                </span>
              </span>
            </div>
            <span className={styles.pct}>{pct}</span>
          </div>
        </div>
        <span className={styles.time}>
          <b>{fmt(t)}</b> / {fmt(total)}
        </span>
      </div>
    </figure>
  );
}
