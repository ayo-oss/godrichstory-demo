import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CardPinLink.module.scss";

export type Place = { id: string; name: string; dist: string; x: string; y: string };
export type CardPinLinkProps = {
  places?: Place[];
  pinLabel?: string;
  statusLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// React 이벤트 타입은 'react' 에서 import 하지 않는다 — 포트 안에서 필요한 모양만 선언한다
type KeyEvt = { key: string; preventDefault: () => void };

const PIN = (
  <svg viewBox="0 0 256 256" width="22" height="22"><g fill="currentColor"><path d="M128 24a80 80 0 0 0-80 80c0 72 80 128 80 128s80-56 80-128a80 80 0 0 0-80-80m0 112a32 32 0 1 1 32-32a32 32 0 0 1-32 32" opacity=".2" /><path d="M128 64a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24m0-112a88.1 88.1 0 0 0-88 88c0 31.4 14.51 64.68 42 96.25a254.2 254.2 0 0 0 41.45 38.3a8 8 0 0 0 9.18 0a254.2 254.2 0 0 0 41.37-38.3c27.45-31.57 42-64.85 42-96.25a88.1 88.1 0 0 0-88-88m0 206c-16.53-13-72-60.75-72-118a72 72 0 0 1 144 0c0 57.23-55.47 105-72 118" /></g></svg>
);
const SHOP = (
  <svg viewBox="0 0 256 256" width="16" height="16"><g fill="currentColor"><path d="M224 96v16a32 32 0 0 1-64 0V96H96v16a32 32 0 0 1-64 0V96l14.34-50.2A8 8 0 0 1 54 40h148a8 8 0 0 1 7.69 5.8Z" opacity=".2" /><path d="M231.69 93.81L217.35 43.6A16.07 16.07 0 0 0 202 32H54a16.07 16.07 0 0 0-15.35 11.6L24.31 93.81A8 8 0 0 0 24 96v16a40 40 0 0 0 16 32v72a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8v-72a40 40 0 0 0 16-32V96a8 8 0 0 0-.31-2.19M54 48h148l11.42 40H42.61Zm98 56v8a24 24 0 0 1-48 0v-8ZM51.06 132.2A24 24 0 0 1 40 112v-8h48v8a24 24 0 0 1-35.12 21.26a8 8 0 0 0-1.82-1.06M200 208H56v-56.8a40.6 40.6 0 0 0 8 .8a40 40 0 0 0 32-16a40 40 0 0 0 64 0a40 40 0 0 0 32 16a40.6 40.6 0 0 0 8-.8Zm16-96a24 24 0 0 1-11.07 20.2a8 8 0 0 0-1.8 1.05A24 24 0 0 1 168 112v-8h48Z" /></g></svg>
);

export default function CardPinLink({
  places = [
    { id: "a", name: "Seongsu Roastery", dist: "320 m", x: "26%", y: "40%" },
    { id: "b", name: "Ttukseom Bakery", dist: "540 m", x: "57%", y: "66%" },
    { id: "c", name: "Seoul Forest Books", dist: "780 m", x: "80%", y: "32%" },
  ],
  pinLabel = "pin",
  statusLabel = "Highlighted pin",
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CardPinLinkProps) {
  const [on, setOn] = useState("");
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function light(id: string) {
    setDemo(false); // 사람이 만졌으니 자동 루프를 멈춘다
    setOn(id);
  }
  function move(i: number, k: string, group: string) {
    const n = k === "ArrowDown" || k === "ArrowRight" ? i + 1 : k === "ArrowUp" || k === "ArrowLeft" ? i - 1 : -1;
    if (n < 0 || n >= places.length) return false;
    const el = document.getElementById(`${group}-${places[n].id}`);
    if (el) el.focus({ preventScroll: true });
    return true;
  }
  const hit = places.filter((p) => p.id === on)[0];

  return (
    <div className={`${styles.cl} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.map}>
        {places.map((p, i) => (
          <button
            key={p.id}
            id={`pin-${p.id}`}
            type="button"
            className={`${styles.pin} ${styles[p.id]} ${on === p.id ? styles.isOn : ""}`}
            style={{ left: p.x, top: p.y }}
            aria-pressed={on === p.id}
            aria-label={`${p.name} ${pinLabel}`}
            onMouseEnter={() => light(p.id)}
            onFocus={() => light(p.id)}
            onClick={() => light(p.id)}
            onKeyDown={(e: KeyEvt) => { if (move(i, e.key, "pin")) e.preventDefault(); }}
          >
            <span className={styles.ring} aria-hidden="true" />
            <span className={styles.head} aria-hidden="true">{PIN}</span>
          </button>
        ))}
      </div>
      <ul className={styles.list}>
        {places.map((p, i) => (
          <li key={p.id}>
            <button
              id={`card-${p.id}`}
              type="button"
              className={`${styles.card} ${styles[p.id]} ${on === p.id ? styles.isOn : ""}`}
              aria-pressed={on === p.id}
              onMouseEnter={() => light(p.id)}
              onFocus={() => light(p.id)}
              onClick={() => light(p.id)}
              onKeyDown={(e: KeyEvt) => { if (move(i, e.key, "card")) e.preventDefault(); }}
            >
              <span className={styles.ic} aria-hidden="true">{SHOP}</span>
              <span className={styles.txt}>
                <span className={styles.name}>{p.name}</span>
                <span className={styles.dist}>{p.dist}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <span className={styles.sr} role="status" aria-live="polite">
        {statusLabel} · {hit ? hit.name : places[0].name}
      </span>
    </div>
  );
}
