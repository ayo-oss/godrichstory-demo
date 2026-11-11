import { useEffect, useRef } from "react";
import styles from "./LongPressMobileOpen.module.scss";

const ICON_COPY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><g fill="currentColor"><path d="M216 40v128h-48V88H88V40Z" opacity=".2"/><path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z"/></g></svg>';
const ICON_PASTE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><g fill="currentColor"><path d="M208 48v168a8 8 0 0 1-8 8H56a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8h40a39.83 39.83 0 0 0-8 24v8h80v-8a39.83 39.83 0 0 0-8-24h40a8 8 0 0 1 8 8" opacity=".2"/><path d="M200 32h-36.26a47.92 47.92 0 0 0-71.48 0H56a16 16 0 0 0-16 16v168a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m-72 0a32 32 0 0 1 32 32H96a32 32 0 0 1 32-32m72 184H56V48h26.75A47.9 47.9 0 0 0 80 64v8a8 8 0 0 0 8 8h80a8 8 0 0 0 8-8v-8a47.9 47.9 0 0 0-2.75-16H200Z"/></g></svg>';
const ICON_RENAME = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><g fill="currentColor"><path d="m221.66 90.34l-56 56l-40-40l56-56l29.66-29.66a8 8 0 0 1 11.31 0L221.66 79a8 8 0 0 1 0 11.34" opacity=".2"/><path d="m227.31 73.37l-44.68-44.69a16 16 0 0 0-22.63 0L36.69 152A15.86 15.86 0 0 0 32 163.31V208a16 16 0 0 0 16 16h44.69a15.86 15.86 0 0 0 11.31-4.69L227.31 96a16 16 0 0 0 0-22.63M92.69 208H48v-44.69l88-88L180.69 120ZM192 108.68L147.31 64l24-24L216 84.68Z"/></g></svg>';
const ICON_TRASH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><g fill="currentColor"><path d="M200 56v152a8 8 0 0 1-8 8H64a8 8 0 0 1-8-8V56Z" opacity=".2"/><path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16M96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0m48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0"/></g></svg>';

export type LongPressMobileOpenProps = {
  color?: string;
};

export default function LongPressMobileOpen({
  color = "#2f6df6",
}: LongPressMobileOpenProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const field = root.querySelector<HTMLDivElement>(`.${styles.field}`);
    const menu = root.querySelector<HTMLDivElement>(`.${styles.menu}`);
    const ring = root.querySelector<SVGSVGElement>(`.${styles.ring}`);
    const ringFg = root.querySelector<SVGCircleElement>(`.${styles.ringFg}`);
    if (!field || !menu || !ring || !ringFg) return;
    const GAP = 6, HOLD_MS = 620, CIRC = 100.5;

    function positionAt(x: number, y: number) {
      const mw = menu!.offsetWidth, mh = menu!.offsetHeight;
      const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
      const px = Math.max(GAP, Math.min(x, vw - mw - GAP));
      const py = Math.max(GAP, Math.min(y, vh - mh - GAP));
      menu!.style.left = px.toFixed(0) + "px";
      menu!.style.top = py.toFixed(0) + "px";
    }
    function open(x: number, y: number) { positionAt(x, y); menu!.classList.add(styles.open); }
    function close() { menu!.classList.remove(styles.open); }

    let pressStart = 0, rafId: number | null = null, pressX = 0, pressY = 0;

    // 계산 겹: (경과시간 / HOLD_MS) 를 0~1 로 clamp 한 진행률을 원둘레(CIRC)에 곱해
    // stroke-dashoffset 값을 매 프레임 다시 계산한다 — 시간이 곧 링이 채워지는 양이 된다.
    function tickPress() {
      const elapsed = performance.now() - pressStart;
      const prog = Math.max(0, Math.min(1, elapsed / HOLD_MS));
      ringFg!.setAttribute("stroke-dashoffset", (CIRC * (1 - prog)).toFixed(1));
      if (prog >= 1) { finishPress(); return; }
      rafId = requestAnimationFrame(tickPress);
    }
    function startPress(x: number, y: number) {
      pressX = x; pressY = y;
      pressStart = performance.now();
      ring!.classList.add(styles.ringOn);
      ringFg!.setAttribute("stroke-dashoffset", CIRC.toFixed(1));
      rafId = requestAnimationFrame(tickPress);
    }
    function cancelPress() {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      ring!.classList.remove(styles.ringOn);
      ringFg!.setAttribute("stroke-dashoffset", CIRC.toFixed(1));
    }
    function finishPress() {
      cancelPress();
      open(pressX, pressY);
    }

    function onPointerDown(e: PointerEvent) { stopAutoplay(); startPress(e.clientX, e.clientY); }
    function onContextMenu(e: MouseEvent) { e.preventDefault(); }
    function onDocDown(e: PointerEvent) {
      if (menu!.classList.contains(styles.open) && !menu!.contains(e.target as Node) && e.target !== field) close();
    }
    field.addEventListener("pointerdown", onPointerDown);
    field.addEventListener("pointerup", cancelPress);
    field.addEventListener("pointerleave", cancelPress);
    field.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("pointerdown", onDocDown);
    menu.addEventListener("click", close);

    // 자동 루프: 필드 중앙을 누른 채 HOLD_MS 만큼 링이 차오르는 것을 흉내내고, 다 차면 메뉴를 연 뒤
    // 잠시 후 닫는다.
    let phase = 0, autoTimer: number | null = null, simStart = 0;
    function autoTick() {
      const r = field!.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (phase === 0) { simStart = performance.now(); pressStart = simStart; pressX = cx; pressY = cy; ring!.classList.add(styles.ringOn); phase = 1; }
      else if (phase === 1) {
        const elapsed = performance.now() - simStart;
        const prog = Math.max(0, Math.min(1, elapsed / HOLD_MS));
        ringFg!.setAttribute("stroke-dashoffset", (CIRC * (1 - prog)).toFixed(1));
        if (prog >= 1) { ring!.classList.remove(styles.ringOn); open(cx, cy); phase = 2; }
      } else if (phase === 2) {
        phase = 3;
      } else { close(); ringFg!.setAttribute("stroke-dashoffset", CIRC.toFixed(1)); phase = 0; }
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 130); autoTick(); }

    return () => {
      stopAutoplay();
      field.removeEventListener("pointerdown", onPointerDown);
      field.removeEventListener("pointerup", cancelPress);
      field.removeEventListener("pointerleave", cancelPress);
      field.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("pointerdown", onDocDown);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.cm}>
        <div className={styles.field}>
          <span className={styles.hint}>길게 누르기</span>
          <svg className={styles.ring} viewBox="0 0 40 40">
            <circle className={styles.ringBg} cx={20} cy={20} r={16} />
            <circle className={styles.ringFg} cx={20} cy={20} r={16} strokeDasharray="100.5" strokeDashoffset="100.5" />
          </svg>
        </div>
        <div className={styles.menu} role="menu">
          <button type="button" className={styles.item} role="menuitem">
            <span className={styles.ic} style={{ color }} dangerouslySetInnerHTML={{ __html: ICON_COPY }} />
            <span>복사</span>
          </button>
          <button type="button" className={styles.item} role="menuitem">
            <span className={styles.ic} style={{ color }} dangerouslySetInnerHTML={{ __html: ICON_PASTE }} />
            <span>붙여넣기</span>
          </button>
          <button type="button" className={styles.item} role="menuitem">
            <span className={styles.ic} style={{ color }} dangerouslySetInnerHTML={{ __html: ICON_RENAME }} />
            <span>이름 바꾸기</span>
          </button>
          <button type="button" className={`${styles.item} ${styles.danger}`} role="menuitem">
            <span className={styles.ic} dangerouslySetInnerHTML={{ __html: ICON_TRASH }} />
            <span>삭제</span>
          </button>
        </div>
      </div>
    </div>
  );
}
