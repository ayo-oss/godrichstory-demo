// TerminalWindowResize — vanilla 판(run/294/demo/08-terminal-window-chrome-resize/index.html) 의 React 포트.
// 모서리 손잡이를 끌면 창이 커지고 줄어든다. setPointerCapture 로 포인터를 손잡이에 묶어 두면
// 커서가 창 밖으로 나가도 pointermove 가 계속 온다. 한계는 JS 가 아니라 CSS clamp() 한 곳에서 정한다.
// 크기 표시는 글자가 아니라 등록한 --wn · --hn 을 counter() 로 찍는다.
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TerminalWindowResize.module.scss";

export type TerminalWindowResizeProps = {
  /** 격자 미리보기용 2초 자동 루프. 손잡이를 잡거나 화살표를 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

// props 가 넣는 변수는 창 크기 변수(--w · --h · --wn · --hn)와 이름이 겹치지 않는다
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 쓰는 필드만 지역 타입으로 선언한다
type PtrEvt = {
  clientX: number;
  clientY: number;
  pointerId: number;
  currentTarget: {
    setPointerCapture(id: number): void;
    releasePointerCapture(id: number): void;
    hasPointerCapture(id: number): boolean;
  };
};
type KeyEvt = { key: string; preventDefault(): void };
type From = { x: number; y: number; w: number; h: number };

const STEP_X = 16;
const STEP_Y = 12;

/** 실제로 그려진 크기를 되읽는다 — 한계는 CSS clamp 가 정하므로 JS 가 다시 자르지 않는다 */
function readOut(win: HTMLElement) {
  win.style.setProperty("--wn", String(Math.round(win.offsetWidth)));
  win.style.setProperty("--hn", String(Math.round(win.offsetHeight)));
}

export default function TerminalWindowResize({
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2b9d74",
}: TerminalWindowResizeProps) {
  const [live, setLive] = useState(demo);
  const winRef = useRef<HTMLDivElement>(null);
  const fromBox = useRef<From | null>(null) as Box<From | null>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function handlePointerDown(e: PtrEvt) {
    const win = winRef.current;
    if (!win) { return; }
    setLive(false);
    e.currentTarget.setPointerCapture(e.pointerId);
    fromBox.current = { x: e.clientX, y: e.clientY, w: win.offsetWidth, h: win.offsetHeight };
    readOut(win);
  }

  function handlePointerMove(e: PtrEvt) {
    const from = fromBox.current;
    const win = winRef.current;
    if (!from || !win) { return; }
    win.style.setProperty("--w", (from.w + (e.clientX - from.x)) + "px");
    win.style.setProperty("--h", (from.h + (e.clientY - from.y)) + "px");
    readOut(win);
  }

  function handleStop(e: PtrEvt) {
    if (!fromBox.current) { return; }
    fromBox.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) { e.currentTarget.releasePointerCapture(e.pointerId); }
  }

  // 키보드로도 넓힐 수 있어야 한다 — 손잡이에 초점을 두고 화살표를 누른다
  function handleKeyDown(e: KeyEvt) {
    const win = winRef.current;
    if (!win) { return; }
    const dx = (e.key === "ArrowRight") ? STEP_X : (e.key === "ArrowLeft") ? -STEP_X : 0;
    const dy = (e.key === "ArrowDown") ? STEP_Y : (e.key === "ArrowUp") ? -STEP_Y : 0;
    if (!dx && !dy) { return; }
    e.preventDefault();
    setLive(false);
    win.style.setProperty("--w", (win.offsetWidth + dx) + "px");
    win.style.setProperty("--h", (win.offsetHeight + dy) + "px");
    readOut(win);
  }

  const cls = [styles.root, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <div className={cls}>
        <div className={styles.win} ref={winRef}>
          <p className={styles.bar}>
            <span className={styles.dots} aria-hidden="true">
              <i className={styles.dot + " " + styles.dotX} />
              <i className={styles.dot + " " + styles.dotM} />
              <i className={styles.dot + " " + styles.dotZ} />
            </span>
            <span className={styles.tabs} role="tablist" aria-label="창 탭">
              <button className={styles.tab} type="button" role="tab" aria-selected="true">zsh</button>
              <button className={styles.tab} type="button" role="tab" aria-selected="false">logs</button>
            </span>
          </p>
          <div className={styles.body}>
            <p className={styles.ln + " " + styles.lnCmd}>$ npm run dev</p>
            <p className={styles.ln}>ready on localhost:5173</p>
            <p className={styles.ln + " " + styles.size} aria-live="polite" aria-label="창 크기" />
          </div>
          <button
            className={styles.grip}
            type="button"
            aria-label="창 크기 조절 손잡이"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handleStop}
            onPointerCancel={handleStop}
            onKeyDown={handleKeyDown}
          >
            <span aria-hidden="true" />
          </button>
        </div>
        <p className={styles.hint}>모서리를 끌어 크기를 바꿔 보세요</p>
      </div>
    </main>
  );
}
