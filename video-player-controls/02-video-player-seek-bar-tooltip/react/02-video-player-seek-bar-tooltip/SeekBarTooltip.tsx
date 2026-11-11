import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SeekBarTooltip.module.scss";

export type SeekBarTooltipProps = {
  /** 더미 영상 길이(초) */
  total?: number;
  /** 시작 위치(초) */
  start?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type SeekVars = CSSProperties & { "--p"?: string; "--h"?: string };

// TS7006 방지 — 'react' 의 이벤트 제네릭 대신 필요한 필드만 로컬로 선언한다
type Rect = { left: number; width: number };
type MoveEvt = { clientX: number; currentTarget: { getBoundingClientRect: () => Rect } };
type PtrEvt = MoveEvt & {
  buttons: number;
  pointerId: number;
  currentTarget: { getBoundingClientRect: () => Rect; setPointerCapture: (id: number) => void };
};
type KeyEvt = { key: string; preventDefault: () => void };

function fmt(s: number) {
  const n = Math.floor(s);
  return Math.floor(n / 60) + ":" + ("0" + (n % 60)).slice(-2);
}

function pos(e: MoveEvt) {
  const r = e.currentTarget.getBoundingClientRect();
  return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
}

export default function SeekBarTooltip({
  total = 180,
  start = 32,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SeekBarTooltipProps) {
  const [t, setT] = useState(start);
  const [hover, setHover] = useState(-1);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 더미 재생 시계 — 바닐라의 setInterval(500ms, +0.5초) 을 그대로
  useEffect(() => {
    const id = setInterval(() => setT((p) => (p + 0.5) % total), 500);
    return () => clearInterval(id);
  }, [total]);

  const p = t / total;
  const h = hover >= 0 ? hover : p;
  const seekVars: SeekVars = { "--p": p.toFixed(4), "--h": h.toFixed(4) };

  function seek(e: MoveEvt) {
    setT(pos(e) * total);
  }

  return (
    <figure className={styles.player} style={vars}>
      <div className={styles.screen}>
        <div className={styles.stripes} aria-hidden="true" />
        <div className={styles.world} aria-hidden="true">
          <span className={styles.sun} />
          <span className={`${styles.hill} ${styles.hillA}`} />
          <span className={`${styles.hill} ${styles.hillB}`} />
        </div>
        <span className={styles.clock}>{fmt(t)}</span>
        <span className={styles.badge}>{fmt(total)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowTime}>
          <b>{fmt(t)}</b> / {fmt(total)}
        </span>
        <div
          className={`${styles.seek} ${hover >= 0 ? styles.isHover : ""}`}
          style={seekVars}
          role="slider"
          tabIndex={0}
          aria-label="재생 위치"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={Math.floor(t)}
          aria-valuetext={`${fmt(t)} / ${fmt(total)}`}
          onMouseMove={(e: MoveEvt) => setHover(pos(e))}
          onMouseLeave={() => setHover(-1)}
          onPointerDown={(e: PtrEvt) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seek(e);
          }}
          onPointerMove={(e: PtrEvt) => {
            if (e.buttons) seek(e);
          }}
          onKeyDown={(e: KeyEvt) => {
            if (e.key === "ArrowRight") { setT((v) => Math.min(total, v + 5)); e.preventDefault(); }
            else if (e.key === "ArrowLeft") { setT((v) => Math.max(0, v - 5)); e.preventDefault(); }
            else if (e.key === "Home") { setT(0); e.preventDefault(); }
            else if (e.key === "End") { setT(total - 1); e.preventDefault(); }
          }}
        >
          <span className={styles.track} aria-hidden="true">
            <span className={styles.buf} style={{ transform: `scaleX(${Math.min(1, p + 0.18).toFixed(4)})` }} />
            <span className={styles.fill} style={{ transform: `scaleX(${p.toFixed(4)})` }} />
            <span className={styles.thumbwrap}>
              <span className={styles.thumb} />
            </span>
          </span>
          <span className={styles.tip} aria-hidden="true">
            <span className={styles.prev}>
              <span className={styles.pat} />
            </span>
            <b className={styles.tt}>{fmt(h * total)}</b>
          </span>
        </div>
      </div>
    </figure>
  );
}
