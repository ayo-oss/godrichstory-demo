// ImagePreview — vanilla 판(run/079/demo/08-follow-image-preview/index.html) 의 React 포트.
// 줄에 올리면 그 항목의 그림(그라디언트 장면)이 커서를 lerp(0.13)로 쫓아 떠오르고,
// 이동 방향에 따라 rotate 로 살짝 기울며 리본 이름표가 붙어 따라온다.
// 장면 전환은 vanilla 처럼 opacity 로 갈아 끼운다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ImagePreview.module.scss";

export type ImagePreviewProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 전역 DOM 타입에 기대지 않는다 — 포인터 이벤트에서 실제로 읽는 것만 적는다
type PtrEvt = { clientX: number; clientY: number };

const SCENE_LABEL = "목록 세 줄 중 커서가 있는 줄의 그림이 커서를 쫓아 떠오르는 그림";
const HINT = "줄에 올리면 그 그림이 따라다닙니다";
// 줄 세 개 — 장면 키와 화면 문구. vanilla index.html 의 순서와 같다
const ROWS = [
  { key: "night", label: "밤하늘의 등불" },
  { key: "sea", label: "바다의 오후" },
  { key: "forest", label: "숲의 아침" },
];

// lerp: 매 프레임 남은 거리의 일부만 더 가는 선형 보간
function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

export default function ImagePreview({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: ImagePreviewProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement>;
  const previewRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<(HTMLButtonElement | null)[]>(new Array(ROWS.length).fill(null)) as Box<(HTMLButtonElement | null)[]>;
  const [demo, setDemo] = useState(true);
  const [scene, setScene] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function setRow(index: number) {
    return (el: HTMLButtonElement | null): void => {
      rowRef.current[index] = el;
    };
  }

  useEffect(() => {
    const root = rootRef.current;
    const sceneBox = sceneRef.current;
    if (!root || !sceneBox) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const t = { x: 0, y: 0 };
    const p = { x: 0, y: 0 };
    let rot = 0;
    let rotNow = 0;
    let lastX: number | null = null;

    function place(cx: number, cy: number): void {
      const r = sceneBox.getBoundingClientRect();
      t.x = Math.min(r.width - 90, Math.max(90, cx - r.left));
      t.y = Math.min(r.height - 60, Math.max(60, cy - r.top));
      if (lastX !== null) {
        rot = Math.max(-7, Math.min(7, (cx - lastX) * 0.35));
      }
      lastX = cx;
    }

    function draw(): void {
      const preview = previewRef.current;
      if (preview) {
        preview.style.transform =
          "translate3d(" + (p.x - 75).toFixed(1) + "px," + (p.y - 55).toFixed(1) + "px,0) rotate(" + rotNow.toFixed(1) + "deg)";
      }
    }

    function tick(): void {
      p.x = lerp(p.x, t.x, 0.13);
      p.y = lerp(p.y, t.y, 0.13);
      rotNow = lerp(rotNow, rot, 0.1);
      rot = lerp(rot, 0, 0.06);
      draw();
      raf = requestAnimationFrame(tick);
    }

    function home(): void {
      const r = sceneBox.getBoundingClientRect();
      t.x = r.width - 100;
      t.y = r.height * 0.62;
      p.x = t.x;
      p.y = t.y;
      rot = 0;
      rotNow = 0;
    }

    function onRowEnter(index: number, event: PtrEvt): void {
      setDemo(false);
      setScene(index);
      place(event.clientX, event.clientY);
    }
    function onRowFocus(index: number): void {
      setDemo(false);
      setScene(index);
    }
    function onMove(event: PtrEvt): void {
      setDemo(false);
      place(event.clientX, event.clientY);
    }
    // reduce 에서는 그림이 줄 옆 고정 자리에 붙어 돌아다니지 않는다
    function onReduceMove(event: PtrEvt): void {
      place(event.clientX, event.clientY);
      const r = sceneBox.getBoundingClientRect();
      p.x = r.width - 100;
      p.y = r.height * 0.62;
      rotNow = 0;
      draw();
    }

    const offs: (() => void)[] = [];
    rowRef.current.forEach((row, i) => {
      if (!row) return;
      const enter = (event: PtrEvt): void => onRowEnter(i, event);
      const focus = (): void => onRowFocus(i);
      row.addEventListener("pointerenter", enter);
      row.addEventListener("focus", focus);
      offs.push(() => {
        row.removeEventListener("pointerenter", enter);
        row.removeEventListener("focus", focus);
      });
    });
    root.addEventListener("pointermove", onMove);
    if (reduce) window.addEventListener("pointermove", onReduceMove);

    let raf = 0;
    home();
    setScene(0);
    draw();
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      offs.forEach((off) => off());
      root.removeEventListener("pointermove", onMove);
      if (reduce) window.removeEventListener("pointermove", onReduceMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + (demo ? " " + styles.isDemo : "")} style={vars} ref={rootRef}>
        <div className={styles.scene} ref={sceneRef} role="img" aria-label={SCENE_LABEL}>
          <ul className={styles.list}>
            {ROWS.map((row, i) => (
              <li key={row.key}>
                <button className={styles.row} type="button" ref={setRow(i)}>{row.label}</button>
              </li>
            ))}
          </ul>
          <div className={styles.preview} ref={previewRef} aria-hidden="true">
            <span className={styles.art + " " + styles.artNight} style={{ opacity: scene === 0 ? "1" : "0" }}></span>
            <span className={styles.art + " " + styles.artSea} style={{ opacity: scene === 1 ? "1" : "0" }}></span>
            <span className={styles.art + " " + styles.artForest} style={{ opacity: scene === 2 ? "1" : "0" }}></span>
            <span className={styles.ribbon}>{ROWS[scene].label}</span>
          </div>
        </div>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
