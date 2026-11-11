import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./SideDrawer.module.scss";

export type SideDrawerLabels = {
  brand: string;
  openLabel: string;
  closeLabel: string;
  drawerTitle: string;
  menu: string[];
  products: string[];
};

export type SideDrawerProps = {
  labels?: Partial<SideDrawerLabels>;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 이벤트 제네릭을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };
type Focusable = { focus: (o: { preventScroll: boolean }) => void };
type PageEl = { inert?: boolean };
type Box<T> = { current: T | null };

const defaults: SideDrawerLabels = {
  brand: "Drawer",
  openLabel: "Open menu",
  closeLabel: "Close",
  drawerTitle: "My drawer",
  menu: ["Orders", "Saved items", "Addresses", "Coupons", "Settings"],
  products: ["Hat 12,000", "Socks set 8,000", "Mug 6,500"],
};

function ListIcon() {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true"><g fill="currentColor"><path d="M216 64v128H40V64Z" opacity=".2"/><path d="M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8M40 72h176a8 8 0 0 0 0-16H40a8 8 0 0 0 0 16m176 112H40a8 8 0 0 0 0 16h176a8 8 0 0 0 0-16"/></g></svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true"><g fill="currentColor"><path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2"/><path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z"/></g></svg>
  );
}

function CaretIcon() {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true"><g fill="currentColor"><path d="m176 128l-80 80V48Z" opacity=".2"/><path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z"/></g></svg>
  );
}

export default function SideDrawer({
  labels,
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff4d1f",
}: SideDrawerProps) {
  const L = { ...defaults, ...labels };
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(demo);
  const openBtn = useRef<Focusable | null>(null);
  const closeBtn = useRef<Focusable | null>(null);
  const menuBtns = useRef<Array<Focusable | null>>([]);
  const pageRef = useRef<PageEl | null>(null);

  // 열린 동안 본문은 포커스를 잃는다 (inert)
  useEffect(() => { if (pageRef.current) pageRef.current.inert = open; }, [open]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function setDrawer(on: boolean) {
    setLive(false);
    setOpen(on);
    (on ? closeBtn.current : openBtn.current)?.focus({ preventScroll: true });
  }

  function drawerKeys(e: KeyEvt) {
    if (e.key === "Escape") { setDrawer(false); return; }
    if (e.key !== "Tab") return;
    e.preventDefault();                                 // 드로어 안에서만 Tab 이 돈다 — 짧은 포커스 트랩
    if (!menuBtns.current) return;                      // Box 배열 ref null 가드
    const stops = [closeBtn.current].concat(menuBtns.current.filter((b): b is Focusable => b !== null));
    let i = 0;
    for (let j = 0; j < stops.length; j++) { if (document.activeElement === stops[j]) i = j; }
    const d = e.shiftKey ? -1 : 1;
    stops[(i + d + stops.length) % stops.length]?.focus({ preventScroll: true });
  }

  const cls = [styles.frame, live ? styles.isDemo : "", open ? styles.isOpen : ""].filter(Boolean).join(" ");
  const sws = [styles.swA, styles.swB, styles.swC];

  return (
    <section className={cls} style={vars} aria-label={L.brand}>
      <div className={styles.page} ref={(el: PageEl | null) => { pageRef.current = el; }} aria-hidden={open}>
        <header className={styles.bar}>
          <p className={styles.brand}>{L.brand}</p>
          <button
            className={styles.burger}
            type="button"
            aria-label={L.openLabel}
            aria-controls="sdr-drawer"
            aria-haspopup="true"
            aria-expanded={open}
            onClick={() => setDrawer(true)}
            ref={(el: Focusable | null) => { openBtn.current = el; }}
          >
            <ListIcon />
          </button>
        </header>
        <div className={styles.body}>
          <p className={styles.skeleton} aria-hidden="true" />
          <ul className={styles.cards}>
            {L.products.map((t, i) => (
              <li className={styles.card} key={t}>
                <span className={sws[i % 3]} aria-hidden="true" />
                <span className={styles.nm}>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={styles.veil} onClick={() => setDrawer(false)} />
      <aside className={styles.drawer} id="sdr-drawer" aria-label={L.drawerTitle} aria-hidden={!open} onKeyDown={drawerKeys}>
        <header className={styles.head}>
          <p className={styles.title}>{L.drawerTitle}</p>
          <button
            className={styles.xbtn}
            type="button"
            aria-label={L.closeLabel}
            onClick={() => setDrawer(false)}
            ref={(el: Focusable | null) => { closeBtn.current = el; }}
          >
            <XIcon />
          </button>
        </header>
        <ul className={styles.menu}>
          {L.menu.map((m, i) => (
            <li key={m}>
              <button type="button" ref={(el: Focusable | null) => { if (menuBtns.current) menuBtns.current[i] = el; }}>
                <span>{m}</span>
                <CaretIcon />
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}
