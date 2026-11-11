import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MiniPlayer.module.scss";

export type MiniPlayerProps = {
  /** 더미 영상 길이(초) */
  total?: number;
  /** 시작 위치(초) */
  start?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

function fmt(s: number) {
  const n = Math.floor(s);
  return Math.floor(n / 60) + ":" + ("0" + (n % 60)).slice(-2);
}

function MiniIcon() {
  return (
    <svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true">
      <g fill="currentColor">
        <path d="M224 64v64h-88v72H40a8 8 0 0 1-8-8V64a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8" opacity=".2" />
        <path d="M216 48H40a16 16 0 0 0-16 16v128a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V64a16 16 0 0 0-16-16M40 64h176v56h-80a8 8 0 0 0-8 8v64H40Zm176 128h-72v-56h72z" />
      </g>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 256 256" width="24" height="24" aria-hidden="true">
      <g fill="currentColor">
        <path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
        <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
      </g>
    </svg>
  );
}

export default function MiniPlayer({
  total = 180,
  start = 12,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: MiniPlayerProps) {
  const [mini, setMini] = useState(false);
  const [t, setT] = useState(start);
  const miniRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 더미 재생 시계 — 바닐라의 setInterval(250ms) 를 그대로
  useEffect(() => {
    let last = Date.now();
    const id = setInterval(() => {
      const n = Date.now();
      const step = (n - last) / 1000;
      last = n;
      setT((p) => (p + step) % total);
    }, 250);
    return () => clearInterval(id);
  }, [total]);

  // 미니로 들어가면 닫기 버튼으로 초점을 옮긴다 (닫을 때 되돌리는 건 close 에서)
  useEffect(() => {
    if (mini) closeRef.current?.focus({ preventScroll: true });
  }, [mini]);

  // Escape 로 미니에서 나온다. 진짜 Document PiP 는 iframe 안에서 못 쓴다 — transform 으로 흉내 낸다
  useEffect(() => {
    if (!mini) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mini]);

  function close() {
    setMini(false);
    miniRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className={`${styles.pip} ${mini ? styles.isMini : ""}`} style={vars}>
      <div className={styles.stack}>
        <p className={styles.ph}>미니 플레이어로 보는 중</p>
        <figure className={styles.player}>
          <div className={styles.screen}>
            <div className={styles.stripes} aria-hidden="true" />
            <div className={styles.world} aria-hidden="true">
              <span className={styles.sun} />
              <span className={`${styles.hill} ${styles.hillA}`} />
              <span className={`${styles.hill} ${styles.hillB}`} />
            </div>
            <span className={styles.clock}>{fmt(t)}</span>
            <span className={styles.badge}>{fmt(total)}</span>
            <button
              ref={closeRef}
              className={styles.close}
              type="button"
              aria-label="미니 플레이어 닫기"
              onClick={close}
            >
              <CloseIcon />
            </button>
            <div className={styles.bar}>
              <span className={styles.time}>
                <b>{fmt(t)}</b> / {fmt(total)}
              </span>
              <button
                ref={miniRef}
                className={styles.mini}
                type="button"
                aria-label="미니 플레이어"
                aria-pressed={mini}
                onClick={() => setMini(true)}
              >
                <MiniIcon />
              </button>
            </div>
            <span className={styles.fillwrap} aria-hidden="true">
              <span className={styles.fill} style={{ transform: `scaleX(${(t / total).toFixed(4)})` }} />
            </span>
          </div>
        </figure>
      </div>
      <div className={styles.doc} aria-hidden="true">
        <span className={styles.line} />
        <span className={`${styles.line} ${styles.lineB}`} />
        <span className={`${styles.line} ${styles.lineC}`} />
      </div>
    </div>
  );
}
