// ClampFluidScale — vanilla 판(run/074/demo/09-clamp-fluid-scale/index.html) 의 React 포트.
// 판(리사이즈 상자)에 container-type: inline-size 를 걸어 제목이 clamp(1.125rem, 13cqw, 3rem) 로
// 판 폭을 따라가게 한다. 창 폭은 window.innerWidth 를 실제로 읽어 rem 로 환산해 찍는다.
// 미리보기 루프가 판 폭을 움직일 때는 ResizeObserver 가 잡아 숫자가 따라온다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ClampFluidScale.module.scss";

export type ClampFluidScaleProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef<T> 는 T | null 을 돌려준다 — ambient 타입에 맞춰 상자 타입을 따로 둔다
type Box<T> = { current: T | null };
type DragState = { on: boolean; x: number; w: number };
type DragBox = { current: DragState };
type PtrEvt = { clientX: number; pointerId: number; preventDefault(): void };
type KeyEvt = { key: string; preventDefault(): void };
type RO = { observe(t: unknown): void };

const BIG_PREFIX = "판 ";
const SUB_WIN = "창 ";
const SUB_RATIO = "rem · 비율 ";
const TITLE = "반응형 제목";
const LEDE = "아래와 위가 묶여 있어 넘치지 않습니다";
const FORMULA = "font-size: clamp(1.125rem, 13cqw, 3rem) · width: min(62%, 30rem)";
const NOTE = "손잡이를 끌어 판 폭을 바꿔 보세요";
const GRIP_ARIA = "판 폭 조절";
const MIN_W = 176;

export default function ClampFluidScale(props: ClampFluidScaleProps) {
  const duration = props.duration ?? 300;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#ffffff";
  const [preview, setPreview] = useState<boolean>(true);
  const [reads, setReads] = useState<string>("판 17.9rem");
  const [subReads, setSubReads] = useState<string>("창 30rem · 비율 62%");
  const rootRef = useRef<HTMLDivElement>(null) as Box<HTMLDivElement>;
  const frameRef = useRef<HTMLDivElement>(null) as Box<HTMLDivElement>;
  const drag = useRef<DragState>({ on: false, x: 0, w: 0 }) as DragBox;

  // 판 폭(rem)·창 폭(innerWidth → rem)·무대 대비 비율을 다시 쓴다
  useEffect(() => {
    const frame = frameRef.current;
    const root = rootRef.current;
    if (!frame || !root) return;
    let lastW = -1;
    const update = () => {
      const w = frame.offsetWidth;
      if (w === lastW || !root) return;
      lastW = w;
      const winRem = window.innerWidth / 16;
      const ratio = Math.round((w / root.clientWidth) * 100);
      setReads(BIG_PREFIX + (w / 16).toFixed(1) + "rem");
      setSubReads(SUB_WIN + winRem.toFixed(1) + SUB_RATIO + ratio + "%");
    };
    update();
    if (typeof ResizeObserver !== "undefined") {
      const ro: RO = new ResizeObserver(update);
      ro.observe(frame);
      ro.observe(root);
    }
    window.addEventListener("resize", update);
    let raf = 0;
    const tick = () => { update(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
    };
  }, []);

  const setWidth = (w: number) => {
    const frame = frameRef.current;
    const root = rootRef.current;
    if (!frame || !root) return;
    frame.style.width = Math.min(Math.max(w, MIN_W), root.clientWidth) + "px";
  };

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div
        ref={rootRef}
        className={styles.root + (preview ? " " + styles.isDemo : "")}
        style={vars}
      >
        <div className={styles.reads}>
          <span className={styles.big}>{reads}</span>
          <span className={styles.sub}>{subReads}</span>
        </div>
        <div ref={frameRef} className={styles.frame}>
          <div className={styles.inner}>
            <h2 className={styles.title}>{TITLE}</h2>
            <p className={styles.lede}>{LEDE}</p>
          </div>
          <span className={styles.ruler} aria-hidden="true" />
          <button
            className={styles.grip}
            type="button"
            aria-label={GRIP_ARIA}
            onPointerDown={(e: PtrEvt) => {
              drag.current = { on: true, x: e.clientX, w: (frameRef.current as HTMLDivElement).offsetWidth };
              setPreview(false);
              e.preventDefault();
            }}
            onPointerMove={(e: PtrEvt) => {
              if (!drag.current.on) return;
              setWidth(drag.current.w + (e.clientX - drag.current.x));
            }}
            onPointerUp={() => { drag.current.on = false; }}
            onPointerCancel={() => { drag.current.on = false; }}
            onKeyDown={(e: KeyEvt) => {
              let step = 0;
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") step = -16;
              if (e.key === "ArrowRight" || e.key === "ArrowUp") step = 16;
              if (!step) return;
              setPreview(false);
              e.preventDefault();
              setWidth((frameRef.current as HTMLDivElement).offsetWidth + step);
            }}
          />
        </div>
        <p className={styles.formula}>{FORMULA}</p>
        <p className={styles.note}>{NOTE}</p>
      </div>
    </main>
  );
}
