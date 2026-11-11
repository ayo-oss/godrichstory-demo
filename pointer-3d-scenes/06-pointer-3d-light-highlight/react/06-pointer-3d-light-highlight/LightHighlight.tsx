// LightHighlight — vanilla 판(run/290/demo/06-pointer-3d-light-highlight/index.html) 의 React 포트.
// 광원 위치는 면마다 자기 상자 기준 백분율(--mx·--my)로 넘긴다 — 같은 커서라도 면마다 밝아지는 자리가 다르다.
// 화살표 키는 빛을 20% 씩 옮겨 포인터 없이도 같은 경로를 낸다. 값·수치는 vanilla 와 같다.
import { useCallback, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./LightHighlight.module.scss";

export type LightHighlightProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 키보드 이벤트는 ambient react 타입에 없다 — 쓰는 두 가지만 지역 타입으로 적는다
type KeyEvt = { key: string; preventDefault(): void };

const FACE_COUNT = 2;
const KEY_STEP = 20;
const PANEL_LABEL = "커서 자리에 생긴 빛이 각진 면과 물결 면을 따라 밝아지는 패널";
const FACET_LABEL = "각진 면";
const WAVE_LABEL = "물결 면";
const HINT = "커서가 곧 조명입니다";

export default function LightHighlight({
  duration = 2000,
  easing = "linear",
  color = "#fff7e6",
}: LightHighlightProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const facesRef = useRef<(HTMLDivElement | null)[]>(new Array(FACE_COUNT).fill(null)) as Box<(HTMLDivElement | null)[]>;
  const keyRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 }) as Box<{ x: number; y: number }>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const lightAt = useCallback((clientX: number, clientY: number): void => {
    for (let i = 0; i < facesRef.current.length; i++) {
      const face = facesRef.current[i];
      if (!face) continue;
      const r = face.getBoundingClientRect();
      face.style.setProperty("--mx", (((clientX - r.left) / r.width) * 100).toFixed(1) + "%");
      face.style.setProperty("--my", (((clientY - r.top) / r.height) * 100).toFixed(1) + "%");
    }
  }, []);

  function setFace(index: number) {
    return (el: HTMLDivElement | null): void => {
      facesRef.current[index] = el;
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    setDemo(false);
    lightAt(event.clientX, event.clientY);
  }

  // 키보드 경로: 화살표가 빛을 네 귀퉁이 쪽으로 20% 씩 옮긴다
  function onKeyDown(event: KeyEvt): void {
    const keys: { [key: string]: [number, number] } = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    const move = keys[event.key];
    if (!move) return;
    event.preventDefault();
    const panel = panelRef.current;
    if (!panel) return;
    setDemo(false);
    keyRef.current.x = Math.max(0, Math.min(100, keyRef.current.x + move[0]));
    keyRef.current.y = Math.max(0, Math.min(100, keyRef.current.y + move[1]));
    const r = panel.getBoundingClientRect();
    lightAt(r.left + (r.width * keyRef.current.x) / 100, r.top + (r.height * keyRef.current.y) / 100);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div
          className={styles.panel}
          ref={panelRef}
          role="img"
          aria-label={PANEL_LABEL}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onKeyDown={onKeyDown}
        >
          <div className={`${styles.surface} ${styles.surfaceFacet}`} ref={setFace(0)}>
            <span className={styles.glow} aria-hidden="true"></span>
            <span className={styles.label}>{FACET_LABEL}</span>
          </div>
          <div className={`${styles.surface} ${styles.surfaceWave}`} ref={setFace(1)}>
            <span className={styles.glow} aria-hidden="true"></span>
            <span className={styles.label}>{WAVE_LABEL}</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={styles.ico} aria-hidden="true"><g fill="currentColor"><path d="M208 104a79.86 79.86 0 0 1-30.59 62.92A24.29 24.29 0 0 0 168 186v6a8 8 0 0 1-8 8H96a8 8 0 0 1-8-8v-6a24.11 24.11 0 0 0-9.3-19A79.87 79.87 0 0 1 48 104.45C47.76 61.09 82.72 25 126.07 24A80 80 0 0 1 208 104" opacity=".2"/><path d="M176 232a8 8 0 0 1-8 8H88a8 8 0 0 1 0-16h80a8 8 0 0 1 8 8m40-128a87.55 87.55 0 0 1-33.64 69.21A16.24 16.24 0 0 0 176 186v6a16 16 0 0 1-16 16H96a16 16 0 0 1-16-16v-6a16 16 0 0 0-6.23-12.66A87.59 87.59 0 0 1 40 104.49C39.74 56.83 78.26 17.14 125.88 16A88 88 0 0 1 216 104m-16 0a72 72 0 0 0-73.74-72c-39 .92-70.47 33.39-70.26 72.39a71.65 71.65 0 0 0 27.64 56.3A32 32 0 0 1 96 186v6h64v-6a32.15 32.15 0 0 1 12.47-25.35A71.65 71.65 0 0 0 200 104m-16.11-9.34a57.6 57.6 0 0 0-46.56-46.55a8 8 0 0 0-2.66 15.78c16.57 2.79 30.63 16.85 33.44 33.45A8 8 0 0 0 176 104a9 9 0 0 0 1.35-.11a8 8 0 0 0 6.54-9.23"/></g></svg>
        </div>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
