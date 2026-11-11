import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./FullscreenMorph.module.scss";

export type FullscreenMorphProps = {
  labels?: { brand?: string; menuLabel?: string; links?: string[] };
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T | null };
type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };

const LINKS = ["Work", "About", "Log", "Contact"];

const ARROW = (
  <g fill="currentColor">
    <path d="M192 64v104L88 64Z" opacity=".2" />
    <path d="M192 56H88a8 8 0 0 0-5.66 13.66L128.69 116l-70.35 70.34a8 8 0 0 0 11.32 11.32L140 127.31l46.34 46.35A8 8 0 0 0 200 168V64a8 8 0 0 0-8-8m-8 92.69l-38.34-38.34L107.31 72H184Z" />
  </g>
);

export default function FullscreenMorph({
  labels,
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#fff7e6",
}: FullscreenMorphProps) {
  const brand = labels?.brand ?? "Studio";
  const menuLabel = labels?.menuLabel ?? "Main menu";
  const links = labels?.links ?? LINKS;

  const [live, setLive] = useState(demo);
  const [open, setOpen] = useState(false);
  const btnRef: Box<HTMLButtonElement> = useRef(null);
  const ovRef: Box<HTMLDivElement> = useRef(null);

  // 닫힌 오버레이는 포커스·탐색에서도 밖으로 내보낸다(inert)
  useEffect(() => {
    const ov = ovRef.current;
    if (ov === null) return;
    if (open) ov.removeAttribute("inert");
    else ov.setAttribute("inert", "");
  }, [open]);

  function toggle() {
    setLive(false); // 사람이 만졌으니 자동 루프를 끈다
    setOpen(!open);
    const b = btnRef.current; // 같은 버튼이 X 닫기가 된다 — 초점 유지
    if (b !== null) b.focus({ preventScroll: true });
  }

  // Escape 닫기 + Tab 이 오버레이 밖으로 나가면 다시 안으로(포커스 트랩)
  function keys(e: KeyEvt) {
    setLive(false);
    if (e.key === "Escape" && open) {
      setOpen(false);
      const b = btnRef.current;
      if (b !== null) b.focus({ preventScroll: true });
      return;
    }
    if (e.key !== "Tab" || !open) return;
    const ov = ovRef.current;
    if (ov === null) return;
    const els = Array.from(ov.querySelectorAll("a")) as HTMLElement[];
    if (els.length === 0) return;
    const first = els[0];
    const last = els[els.length - 1];
    const el = document.activeElement;
    if (e.shiftKey && el === first) {
      e.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!e.shiftKey && el === last) {
      e.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.fm, live ? styles.isDemo : "", open ? styles.isOpen : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} onPointerDown={() => setLive(false)} onKeyDown={keys}>
      <div className={styles.page} aria-hidden="true">
        <i className={`${styles.block} ${styles.blockA}`} />
        <i className={`${styles.block} ${styles.blockB}`} />
        <i className={styles.rule} />
        <i className={`${styles.rule} ${styles.ruleS}`} />
        <i className={`${styles.rule} ${styles.ruleM}`} />
      </div>
      <header className={styles.bar}>
        <span className={styles.brand}>{brand}</span>
        <button
          className={styles.btn}
          type="button"
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls="fm-menu"
          ref={btnRef}
          onClick={toggle}
        >
          <span className={styles.burger} aria-hidden="true"><span /><span /><span /></span>
        </button>
      </header>
      <div
        className={styles.overlay}
        id="fm-menu"
        role="dialog"
        aria-modal="true"
        aria-label={menuLabel}
        ref={ovRef}
      >
        {links.map((t, i) => (
          <a className={styles.link} key={t} href="#" style={{ "--i": i } as CSSProperties}>
            {t}
            <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">{ARROW}</svg>
          </a>
        ))}
      </div>
    </section>
  );
}
