// RetroWindow — vanilla 판(run/023/demo/01-os-window-titlebar-minimize/index.html) 의 React 포트.
// 타이틀바를 setPointerCapture 로 잡아 pointermove 마다 translate 로 옮기고, 최소화하면 창이
// 작업표시줄 칸 중심으로 scale .12 로 접혔다가 칸을 누르면 원래 자리로 돌아온다.
// 이동량은 ref 하나가 들고 있고 상태는 미리보기·접힘 두 개뿐이다(드래그마다 재렌더하지 않는다).
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RetroWindow.module.scss";

export type RetroWindowProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 타입에 React 이벤트 제네릭이 없다 — 쓰는 것만 로컬 타입으로 선언한다
type PtrEvt = {
  pointerId: number;
  clientX: number;
  clientY: number;
  target: { closest(sel: string): Element | null };
  preventDefault(): void;
};
type KeyEvt = { key: string; shiftKey?: boolean; preventDefault(): void };
// 초기값을 준 useRef 는 실제로 null 이 되지 않는다 — 값 상자(Box)로 좁혀 쓴다
type XY = { x: number; y: number };
type Box<T> = { current: T };

const TITLE = "godrich.exe";
const STATUS = "준비";
const CLOCK = "09:41";
const LINE1 = "타이틀바를 잡아 끌면 창이 따라옵니다";
const LINE2 = "최소화하면 작업표시줄 칸으로 접힙니다";
const ARIA_WIN = "예제 창";
const ARIA_BAR = "창 이동 — 잡아 끌거나 방향키로 옮기세요";
const ARIA_MIN = "최소화";
const ARIA_SLOT = "창 다시 펼치기";
const ARIA_TASKBAR = "작업표시줄";

const ICON_WIN = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M224 64v112a16 16 0 0 1-16 16H48a16 16 0 0 1-16-16V64a16 16 0 0 1 16-16h160a16 16 0 0 1 16 16" opacity=".2"/><path d="M208 40H48a24 24 0 0 0-24 24v112a24 24 0 0 0 24 24h160a24 24 0 0 0 24-24V64a24 24 0 0 0-24-24m8 136a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V64a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8Zm-48 48a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8"/></g></svg>
);
const ICON_MIN = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2"/><path d="M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8"/></g></svg>
);
const ICON_LOGO = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M128 144h80v72l-80-14.55Zm-96 40l64 11.64V144H32Zm96-129.45V112h80V40ZM32 112h64V60.36L32 72Z" opacity=".2"/><path d="M208 136h-80a8 8 0 0 0-8 8v57.45a8 8 0 0 0 6.57 7.88l80 14.54a7.6 7.6 0 0 0 1.43.13a8 8 0 0 0 8-8v-72a8 8 0 0 0-8-8m-8 70.41l-64-11.63V152h64ZM96 136H32a8 8 0 0 0-8 8v40a8 8 0 0 0 6.57 7.87l64 11.64a8.5 8.5 0 0 0 1.43.13a8 8 0 0 0 8-8V144a8 8 0 0 0-8-8m-8 50.05l-48-8.73V152h48ZM213.13 33.86a8 8 0 0 0-6.56-1.73l-80 14.55a8 8 0 0 0-6.57 7.87V112a8 8 0 0 0 8 8h80a8 8 0 0 0 8-8V40a8 8 0 0 0-2.87-6.14M200 104h-64V61.22l64-11.63Zm-98.87-49.78a8 8 0 0 0-6.56-1.73l-64 11.64A8 8 0 0 0 24 72v40a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8V60.36a8 8 0 0 0-2.87-6.14M88 104H40V78.68L88 70Z"/></g></svg>
);

function clampNum(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export default function RetroWindow(props: RetroWindowProps) {
  const duration = props.duration ?? 300;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#0a4fe8";
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  const [preview, setPreview] = useState<boolean>(true);
  const [min, setMin] = useState<boolean>(false);
  const [flying, setFlying] = useState<boolean>(false);
  const pos = useRef<XY>({ x: 0, y: 0 }) as Box<XY>;
  const saved = useRef<XY>({ x: 0, y: 0 }) as Box<XY>;
  const areaRef = useRef<HTMLDivElement>(null);
  const winRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const slotRef = useRef<HTMLButtonElement>(null);
  const flyTimer = useRef<number | null>(null);

  const place = () => {
    const win = winRef.current;
    if (win) win.style.translate = pos.current.x + "px " + pos.current.y + "px";
  };
  const dragBounds = () => {
    const area = areaRef.current;
    const win = winRef.current;
    if (!area || !win) return { x: 0, y: 0 };
    return {
      x: Math.max(0, (area.clientWidth - win.offsetWidth) / 2),
      y: Math.max(0, (area.clientHeight - win.offsetHeight) / 2)
    };
  };
  // 접기/펴기 — 접힐 때 칸 중심으로 translate 를 옮기고 scale 을 줄인다. 원래 자리는 saved 에 둔다
  const setMinState = (on: boolean) => {
    const win = winRef.current;
    const slot = slotRef.current;
    setMin(on);
    setFlying(true);
    if (on) {
      saved.current = { ...pos.current };
      if (win && slot) {
        const wr = win.getBoundingClientRect();
        const sr = slot.getBoundingClientRect();
        pos.current.x += sr.left + sr.width / 2 - (wr.left + wr.width / 2);
        pos.current.y += sr.top + sr.height / 2 - (wr.top + wr.height / 2);
      }
    } else {
      pos.current = { ...saved.current };
    }
    place();
    if (flyTimer.current !== null) window.clearTimeout(flyTimer.current);
    flyTimer.current = window.setTimeout(() => setFlying(false), duration + 20);
  };

  const onBarDown = (e: PtrEvt) => {
    setPreview(false);
    if (min || e.target.closest("." + (styles.winMin || "winMin"))) return;
    e.preventDefault();
    const bar = barRef.current;
    if (!bar) return;
    bar.setPointerCapture(e.pointerId);
    const ox = pos.current.x - e.clientX;
    const oy = pos.current.y - e.clientY;
    // 여기서부터는 React 합성 이벤트가 아니라 DOM 이 직접 주는 PointerEvent 다
    const mv = (ev: PointerEvent) => {
      const b = dragBounds();
      pos.current.x = clampNum(ev.clientX + ox, -b.x, b.x);
      pos.current.y = clampNum(ev.clientY + oy, -b.y, b.y);
      place();
    };
    bar.addEventListener("pointermove", mv);
    bar.addEventListener(
      "pointerup",
      () => bar.removeEventListener("pointermove", mv),
      { once: true } as AddEventListenerOptions
    );
    bar.addEventListener(
      "pointercancel",
      () => bar.removeEventListener("pointermove", mv),
      { once: true } as AddEventListenerOptions
    );
  };

  const onBarKey = (e: KeyEvt) => {
    if (e.key === "Escape") {
      setPreview(false);
      setMinState(true);
      return;
    }
    if (min || e.key.indexOf("Arrow") !== 0) return;
    e.preventDefault();
    setPreview(false);
    const b = dragBounds();
    const d = e.shiftKey ? 16 : 4;
    if (e.key === "ArrowLeft") pos.current.x = clampNum(pos.current.x - d, -b.x, b.x);
    if (e.key === "ArrowRight") pos.current.x = clampNum(pos.current.x + d, -b.x, b.x);
    if (e.key === "ArrowUp") pos.current.y = clampNum(pos.current.y - d, -b.y, b.y);
    if (e.key === "ArrowDown") pos.current.y = clampNum(pos.current.y + d, -b.y, b.y);
    place();
  };

  return (
    <main className={styles.stage}>
      <div
        className={styles.dt + (preview ? " " + styles.isDemo : "")}
        style={vars}
        onPointerDown={() => setPreview(false)}
      >
        <div className={styles.area} ref={areaRef}>
          <section
            className={
              styles.win + (min ? " " + styles.isMin : "") + (flying ? " " + styles.isFlying : "")
            }
            ref={winRef}
            aria-label={ARIA_WIN}
          >
            <header
              className={styles.bar}
              ref={barRef}
              tabIndex={0}
              aria-label={ARIA_BAR}
              onPointerDown={onBarDown}
              onKeyDown={onBarKey}
            >
              <span className={styles.ico} aria-hidden="true">{ICON_WIN}</span>
              <span className={styles.title}>{TITLE}</span>
              <button
                className={styles.winMin}
                type="button"
                aria-label={ARIA_MIN}
                onClick={() => {
                  setPreview(false);
                  setMinState(true);
                }}
              >
                {ICON_MIN}
              </button>
            </header>
            <div className={styles.panel}>
              <p className={styles.line}>{LINE1}</p>
              <p className={styles.lineDim}>{LINE2}</p>
            </div>
            <p className={styles.status} aria-hidden="true">{STATUS}</p>
          </section>
        </div>
        <nav className={styles.taskbar} aria-label={ARIA_TASKBAR}>
          <button
            className={styles.slot + (min ? " " + styles.slotOn : "")}
            ref={slotRef}
            type="button"
            aria-label={ARIA_SLOT}
            onClick={() => {
              setPreview(false);
              setMinState(false);
            }}
          >
            <span className={styles.slotIco} aria-hidden="true">{ICON_LOGO}</span>
            <span className={styles.slotTitle}>{TITLE}</span>
          </button>
          <span className={styles.clock} aria-hidden="true">{CLOCK}</span>
        </nav>
      </div>
    </main>
  );
}
