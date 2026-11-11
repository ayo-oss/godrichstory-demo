// SplitFormatButton — vanilla 판(07-dlbtn-format-split-menu) 의 React 포트.
// 메뉴 칸마다 시작 시각을 MENU_STAGGER 씩 늦춰 easeOutBack 으로 펼치고, 고른 형식은 라벨 창 안에서 LABEL_RISE 만큼 올라온다.
import { useEffect, useRef } from "react";
import styles from "./SplitFormatButton.module.scss";

const MENU_STAGGER = 70;
const FORMATS = ["PDF", "PNG", "SVG"];
const LABEL_RISE = 24;
const ITEM_MS = 280;
const OPEN_MS = ITEM_MS + (FORMATS.length - 1) * MENU_STAGGER;
const RISE_MS = 320;
const START_MS = 200;
const CYCLE_MS = 2000;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function outBack(t: number): number {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}
function outCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function SplitFormatButton() {
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const oldRef = useRef<HTMLSpanElement | null>(null);
  const newRef = useRef<HTMLSpanElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const toggle = toggleRef.current;
    const menu = menuRef.current;
    const oldEl = oldRef.current;
    const newEl = newRef.current;
    const textEl = textRef.current;
    if (!toggle || !menu || !oldEl || !newEl || !textEl) return;
    const items = Array.from(menu.querySelectorAll<HTMLButtonElement>("button"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let wantOpen = false;
    let wantFmt = 0;
    let open = 0;
    let rise = 1;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    const render = (): void => {
      const s = open * OPEN_MS;
      const visible = open > 0.001 || wantOpen;
      items.forEach((it, i) => {
        const q = outBack(clamp((s - i * MENU_STAGGER) / ITEM_MS, 0, 1));
        it.style.opacity = clamp(q, 0, 1).toFixed(3);
        it.style.transform = `translateY(${((1 - q) * -16).toFixed(2)}px) scale(${(0.8 + 0.2 * q).toFixed(3)})`;
        it.style.visibility = visible ? "visible" : "hidden";
        it.setAttribute("tabindex", wantOpen ? "0" : "-1");
        it.classList.toggle(styles["is-picked"], i === wantFmt);
      });
      menu.setAttribute("aria-hidden", wantOpen ? "false" : "true");
      toggle.setAttribute("aria-expanded", wantOpen ? "true" : "false");
      toggle.style.setProperty("--o", open.toFixed(3));
      toggle.parentElement!.style.setProperty("--k", (1 - rise).toFixed(3));
      oldEl.style.transform = `translateY(${(-LABEL_RISE * outCubic(rise)).toFixed(2)}px)`;
      newEl.style.transform = `translateY(${(LABEL_RISE * (1 - outBack(rise))).toFixed(2)}px)`;
      oldEl.style.opacity = (1 - rise).toFixed(2);
      textEl.textContent = FORMATS[wantFmt];
    };
    const pick = (i: number): void => {
      if (i === wantFmt) return;
      oldEl.textContent = FORMATS[wantFmt];
      wantFmt = i;
      newEl.textContent = FORMATS[i];
      rise = reduce ? 1 : 0;
    };
    const setOpen = (v: boolean): void => {
      wantOpen = v;
      if (reduce) open = v ? 1 : 0;
    };

    const onToggle = (): void => {
      demo = false;
      setOpen(!wantOpen);
      render();
      if (wantOpen) items[wantFmt].focus({ preventScroll: true });
    };
    const onToggleKey = (e: KeyboardEvent): void => {
      if (e.key === "ArrowDown" && !wantOpen) {
        e.preventDefault();
        demo = false;
        setOpen(true);
        render();
        items[wantFmt].focus({ preventScroll: true });
      }
    };
    toggle.addEventListener("click", onToggle);
    toggle.addEventListener("keydown", onToggleKey);
    const itemHandlers = items.map((it, i) => {
      const onClick = (): void => { demo = false; pick(i); setOpen(false); render(); toggle.focus({ preventScroll: true }); };
      const onKey = (e: KeyboardEvent): void => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus({ preventScroll: true }); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); items[(i + items.length - 1) % items.length].focus({ preventScroll: true }); }
        if (e.key === "Escape") { e.preventDefault(); setOpen(false); render(); toggle.focus({ preventScroll: true }); }
      };
      it.addEventListener("click", onClick);
      it.addEventListener("keydown", onKey);
      return { it, onClick, onKey };
    });

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demo && now >= START_MS) {
        const ph = (now - START_MS) % CYCLE_MS;
        wantOpen = ph < 800;
        const f = ph >= 600 && ph < 1700 ? 2 : 0;
        if (f !== wantFmt) pick(f);
      }
      open = clamp(open + (wantOpen ? 1 : -1) * dt * 1000 / OPEN_MS, 0, 1);
      rise = clamp(rise + dt * 1000 / RISE_MS, 0, 1);
      render();
      raf = requestAnimationFrame(tick);
    }

    render();
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      toggle.removeEventListener("click", onToggle);
      toggle.removeEventListener("keydown", onToggleKey);
      itemHandlers.forEach((h) => {
        h.it.removeEventListener("click", h.onClick);
        h.it.removeEventListener("keydown", h.onKey);
      });
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.sp}>
        <div className={styles.sp__row}>
          <button className={styles.sp__main} type="button">
            <span className={styles.sp__win} aria-hidden="true">
              <span className={styles.sp__fmt} ref={oldRef} />
              <span className={styles.sp__fmt} ref={newRef}>PDF</span>
            </span>
            <span className={styles.sp__sr} ref={textRef}>PDF</span>
            <span>내려받기</span>
          </button>
          <button className={styles.sp__toggle} type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="spMenu" aria-label="형식 선택" ref={toggleRef}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" /></svg>
          </button>
        </div>
        <div className={styles.sp__menu} id="spMenu" role="menu" aria-label="형식 선택" ref={menuRef}>
          {FORMATS.map((f) => (
            <button className={styles.sp__item} type="button" role="menuitem" key={f}>{f}</button>
          ))}
        </div>
      </div>
    </main>
  );
}
