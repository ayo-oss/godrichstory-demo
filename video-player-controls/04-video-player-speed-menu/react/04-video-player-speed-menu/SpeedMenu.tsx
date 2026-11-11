import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SpeedMenu.module.scss";

export type SpeedMenuProps = {
  /** 더미 영상 길이(초) */
  total?: number;
  /** 시작 위치(초) */
  start?: number;
  /** 고를 수 있는 배속 */
  rates?: number[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type MenuVars = CSSProperties & { "--i"?: string };

// TS7006 방지 — 'react' 의 이벤트 제네릭 대신 필요한 필드만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault: () => void };

function fmt(s: number) {
  const n = Math.floor(s);
  return Math.floor(n / 60) + ":" + ("0" + (n % 60)).slice(-2);
}

function SpeedIcon() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true">
      <g fill="currentColor">
        <path d="M232 152v24a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8v-22.87C24 95.65 70.15 48.2 127.63 48A104 104 0 0 1 232 152" opacity=".2" />
        <path d="M207.06 72.67A111.24 111.24 0 0 0 128 40h-.4C66.07 40.21 16 91 16 153.13V176a16 16 0 0 0 16 16h192a16 16 0 0 0 16-16v-24a111.25 111.25 0 0 0-32.94-79.33M224 176H119.71l54.76-75.3a8 8 0 0 0-12.94-9.42L99.92 176H32v-22.87c0-3.08.15-6.12.43-9.13H56a8 8 0 0 0 0-16H35.27c10.32-38.86 44-68.24 84.73-71.66V80a8 8 0 0 0 16 0V56.33A96.14 96.14 0 0 1 221 128h-21a8 8 0 0 0 0 16h23.67c.21 2.65.33 5.31.33 8Z" />
      </g>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 256 256" width="13" height="13" aria-hidden="true">
      <g fill="currentColor">
        <path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" />
        <path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" />
      </g>
    </svg>
  );
}

export default function SpeedMenu({
  total = 180,
  start = 18,
  rates = [0.5, 0.75, 1, 1.25, 1.5, 2],
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: SpeedMenuProps) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(2);
  const [t, setT] = useState(start);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const rate = rates[i];
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const menuVars: MenuVars = { "--i": String(i) };

  // 더미 재생 시계 — 고른 배속만큼 빨라지거나 느려진다 (바닐라의 setInterval(250ms, +0.25×rate))
  useEffect(() => {
    const id = setInterval(() => setT((p) => (p + 0.25 * rate) % total), 250);
    return () => clearInterval(id);
  }, [rate, total]);

  // 바깥을 누르면 닫는다
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function focusItem(n: number) {
    menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]')[n]?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (open) focusItem(i);
    // 닫힐 때 버튼으로 돌려보내는 건 toggle 에서 직접 한다
  }, [open]);

  function close() {
    setOpen(false);
    btnRef.current?.focus({ preventScroll: true });
  }

  return (
    <figure className={`${styles.player} ${open ? styles.isOpen : ""}`} style={vars}>
      <div className={styles.screen}>
        <div className={styles.stripes} aria-hidden="true" />
        <div className={styles.world} aria-hidden="true">
          <span className={styles.sun} />
          <span className={`${styles.hill} ${styles.hillA}`} />
          <span className={`${styles.hill} ${styles.hillB}`} />
        </div>
        <div className={styles.top}>
          <span className={styles.clock}>{fmt(t)}</span>
          <span className={styles.badge}>{fmt(total)}</span>
        </div>

        <div className={styles.spd} ref={rootRef}>
          <div
            ref={menuRef}
            className={styles.menu}
            style={menuVars}
            id="spd-menu"
            role="menu"
            aria-label="재생 속도"
            onKeyDown={(e: KeyEvt) => {
              if (e.key === "Escape") { close(); e.preventDefault(); return; }
              if (e.key === "Enter" || e.key === " ") { close(); e.preventDefault(); return; }
              let n = i;
              if (e.key === "ArrowDown") n = (i + 1) % rates.length;
              else if (e.key === "ArrowUp") n = (i + rates.length - 1) % rates.length;
              else return;
              setI(n);
              focusItem(n);
              e.preventDefault();
            }}
          >
            <span className={styles.mark} aria-hidden="true" />
            {rates.map((r, k) => (
              <button
                key={r}
                className={styles.item}
                type="button"
                role="menuitemradio"
                aria-checked={k === i}
                onClick={() => { setI(k); close(); }}
              >
                <span className={styles.lab}>{r}배</span>
                <span className={styles.ck}>
                  <CheckIcon />
                </span>
              </button>
            ))}
          </div>
          <button
            ref={btnRef}
            className={styles.btn}
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls="spd-menu"
            aria-label="재생 속도"
            onClick={() => setOpen((o) => !o)}
          >
            <span className={styles.ic} aria-hidden="true">
              <SpeedIcon />
            </span>
            <span className={styles.valwrap}>
              <span className={styles.val}>{rate}배</span>
            </span>
          </button>
        </div>

        <span className={styles.time}>
          <b>{fmt(t)}</b> / {fmt(total)}
        </span>
        <span className={styles.fillwrap} aria-hidden="true">
          <span className={styles.fill} style={{ transform: `scaleX(${(t / total).toFixed(4)})` }} />
        </span>
      </div>
    </figure>
  );
}
