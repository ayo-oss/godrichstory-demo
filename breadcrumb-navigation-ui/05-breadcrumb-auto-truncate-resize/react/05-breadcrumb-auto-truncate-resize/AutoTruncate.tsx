import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./AutoTruncate.module.scss";

export type AutoTruncateProps = {
  path?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; pointerId: number; preventDefault(): void };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const CaretRight = () => (
  <span className={styles.sep} aria-hidden="true"><svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true"><g fill="currentColor"><path d="m176 128l-80 80V48Z" opacity=".2"/><path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z"/></g></svg></span>
);
const DotsThree = () => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><g fill="currentColor"><path d="M240 96v64a16 16 0 0 1-16 16H32a16 16 0 0 1-16-16V96a16 16 0 0 1 16-16h192a16 16 0 0 1 16 16" opacity=".2"/><path d="M140 128a12 12 0 1 1-12-12a12 12 0 0 1 12 12m56-12a12 12 0 1 0 12 12a12 12 0 0 0-12-12m-136 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12"/></g></svg>
);

export default function AutoTruncate({
  path = ["Home", "Electronics", "Computers", "Laptops", "13-inch gaming"],
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: AutoTruncateProps) {
  // 앞쪽(홈 다음)부터 몇 칸을 hidden 으로 숨겼는지
  const [cut, setCut] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const dragging = useRef(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    const panel = panelRef.current;
    const nav = navRef.current;
    const list = listRef.current;
    if (!panel || !nav || !list) return;
    // scrollWidth 가 clientWidth 를 넘으면 앞 단계부터 hidden — 재는 동안만 리스트를 자연 폭으로 편다
    const fit = (): void => {
      const middles = Array.prototype.filter.call(
        list.children, (el: HTMLElement) => el.dataset.hide === "1") as HTMLElement[];
      const dots = Array.prototype.find.call(
        list.children, (el: HTMLElement) => el.dataset.dots === "1") as HTMLElement | undefined;
      if (!middles.length || !dots) return;
      list.style.maxWidth = "none";
      middles.forEach((el: HTMLElement): void => { el.hidden = false; });
      dots.hidden = true;
      let n = 0;
      while (n < middles.length && list.scrollWidth > nav.clientWidth) {
        dots.hidden = false;
        middles[n].hidden = true;
        n++;
      }
      list.style.maxWidth = "";
      setCut(n);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(panel);
    return () => ro.disconnect();
  }, []);

  function setW(px: number): void {
    const frame = frameRef.current;
    const panel = panelRef.current;
    if (!frame || !panel) return;
    const fw = frame.clientWidth;
    const w = Math.max(104, Math.min(px, fw));
    panel.style.width = `${(w / fw) * 100}%`;
  }
  function onDown(e: PtrEvt): void {
    dragging.current = true;
    e.preventDefault();
  }
  function onMove(e: PtrEvt): void {
    const frame = frameRef.current;
    if (!dragging.current || !frame) return;
    setW(e.clientX - frame.getBoundingClientRect().left + 8);
  }
  function onUp(): void { dragging.current = false; }
  function onKey(e: KeyEvt): void {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const panel = panelRef.current;
    if (!panel) return;
    setW(panel.getBoundingClientRect().width + (e.key === "ArrowRight" ? 16 : -16));
  }

  const last = path.length - 1;
  const rows: ReactNode[] = [];
  path.forEach((name: string, i: number) => {
    if (i === last) {
      rows.push(
        <li className={styles.item} key={name}>
          <span className={`${styles.crumb} ${styles.now}`} aria-current="page">{name}</span>
        </li>
      );
      return;
    }
    rows.push(
      <li className={styles.item} key={name} data-hide={i > 0 ? "1" : undefined} hidden={i > 0 && i <= cut}>
        <a className={styles.crumb} href="#">{name}</a>
        <CaretRight />
      </li>
    );
    if (i === 0) {
      rows.push(
        <li className={styles.item} key={name + "-dots"} data-dots="1" hidden={cut === 0}>
          <span className={`${styles.crumb} ${styles.dots}`} aria-label="Hidden steps"><DotsThree /></span>
          <CaretRight />
        </li>
      );
    }
  });

  return (
    <div className={styles.at} style={vars}>
      <div className={styles.frame} ref={frameRef}>
        <div className={styles.panel} ref={panelRef}>
          <nav className={styles.nav} ref={navRef} aria-label="Breadcrumb">
            <ol className={styles.list} ref={listRef}>{rows}</ol>
          </nav>
          <span
            className={styles.handle}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize width"
            tabIndex={0}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onKeyDown={onKey}
          />
        </div>
      </div>
      <p className={styles.cap}>Drag the handle — front steps hide first</p>
    </div>
  );
}
