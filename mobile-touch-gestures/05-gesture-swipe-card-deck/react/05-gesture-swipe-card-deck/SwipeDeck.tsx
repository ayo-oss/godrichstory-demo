import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SwipeDeck.module.scss";

export type SwipeDeckProps = {
  cards?: { name: string; role: string; hue: string }[];
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; clientY: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconHeart = () => (
  <svg viewBox="0 0 256 256" width="18" height="18"><g fill="currentColor"><path d="M232 102c0 66-104 122-104 122S24 168 24 102a54 54 0 0 1 54-54c22.59 0 41.94 12.31 50 32c8.06-19.69 27.41-32 50-32a54 54 0 0 1 54 54" opacity=".2"/><path d="M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62m-50 174.8c-18.26-10.64-96-59.11-96-112.8a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8"/></g></svg>
);
const IconX = () => (
  <svg viewBox="0 0 256 256" width="18" height="18"><g fill="currentColor"><path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2"/><path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z"/></g></svg>
);
const IconUser = () => (
  <svg viewBox="0 0 256 256" width="18" height="18"><g fill="currentColor"><path d="M192 96a64 64 0 1 1-64-64a64 64 0 0 1 64 64" opacity=".2"/><path d="M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8M72 96a56 56 0 1 1 56 56a56.06 56.06 0 0 1-56-56"/></g></svg>
);

export default function SwipeDeck({
  cards = [
    { name: "Applicant 1", role: "Frontend · 3 yrs", hue: "#2f6df6" },
    { name: "Applicant 2", role: "Frontend", hue: "#4cd4a6" },
    { name: "Applicant 3", role: "Data analysis", hue: "#b9a0ff" },
  ],
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SwipeDeckProps) {
  const [rest, setRest] = useState(cards);
  const [fly, setFly] = useState<null | { pass: boolean }>(null);
  const [dx, setDx] = useState(0);
  const drag = useRef({ on: false, x0: 0 }) as Box<{ on: boolean; x0: number }>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function next(pass: boolean) {
    if (fly) return;
    setFly({ pass });
    window.setTimeout(() => {
      setFly(null);
      setDx(0);
      setRest((r) => (r.length > 1 ? r.slice(1) : cards));
    }, 380);
  }

  function onDown(e: PEvt) {
    if (fly) return;
    drag.current = { on: true, x0: e.clientX };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onMove(e: PEvt) {
    if (!drag.current.on) return;
    setDx(e.clientX - drag.current.x0);
  }
  function onUp() {
    if (!drag.current.on) return;
    drag.current.on = false;
    if (dx > 64) next(true);
    else if (dx < -64) next(false);
    else setDx(0);
  }

  const topDx = fly ? (fly.pass ? 190 : -190) : dx;
  const topRot = fly ? (fly.pass ? 18 : -18) : Math.max(-12, Math.min(12, dx / 9));
  const topOp = fly ? 0 : 1;
  const passO = Math.max(0, Math.min(1, topDx / 64));
  const skipO = Math.max(0, Math.min(1, -topDx / 64));

  return (
    <div className={styles.cd} style={vars}>
      <div className={styles.deck}>
        {rest.slice(0, 3).map((c, i) => {
          const depth = i;
          const isTop = depth === 0;
          const cls = isTop ? styles.cardTop : depth === 1 ? styles.cardBack1 : styles.cardBack2;
          if (isTop) {
            return (
              <article
                key={c.name}
                className={cls}
                style={{ transform: `translateX(${topDx}px) rotate(${topRot}deg)`, opacity: topOp }}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onKeyDown={(e: KeyEvt): void => {
                  if (e.key === "ArrowRight") { next(true); e.preventDefault(); }
                  else if (e.key === "ArrowLeft") { next(false); e.preventDefault(); }
                }}
                tabIndex={0}
                aria-label={`${c.name}, ${c.role}. Arrow keys judge.`}
              >
                <span className={styles.stampPass} style={{ opacity: passO }}>PASS</span>
                <span className={styles.stampSkip} style={{ opacity: skipO }}>SKIP</span>
                <span className={styles.avatar} style={{ background: c.hue }} aria-hidden="true"><IconUser /></span>
                <div className={styles.who}><strong>{c.name}</strong><span>{c.role}</span></div>
              </article>
            );
          }
          return (
            <article key={c.name} className={cls} aria-hidden="true">
              <span className={styles.avatar} style={{ background: c.hue }}><IconUser /></span>
              <div className={styles.who}><strong>{c.name}</strong><span>{c.role}</span></div>
            </article>
          );
        })}
      </div>
      <div className={styles.acts}>
        <button type="button" className={`${styles.btn} ${styles.skip}`} aria-label="Skip" onClick={(): void => next(false)}>
          <IconX />
        </button>
        <span className={styles.count} aria-live="polite">{`${rest.length} cards left`}</span>
        <button type="button" className={`${styles.btn} ${styles.pass}`} aria-label="Pass" onClick={(): void => next(true)}>
          <IconHeart />
        </button>
      </div>
    </div>
  );
}
