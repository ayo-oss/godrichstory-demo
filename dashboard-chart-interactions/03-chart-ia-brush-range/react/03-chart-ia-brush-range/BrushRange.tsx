import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BrushRange.module.scss";

// 브러시 구간 React 판 — vanilla(run/264/demo/03) 와 같은 동작.
// 상태는 정수 두 개(s, e). 띠의 위치·폭은 CSS 가 --s/--e 로 transform 계산하고,
// 막대의 안팎은 data-in 속성으로만 전달한다.
export type BrushRangeProps = {
  title?: string;
  totalLabel?: string;
  unit?: string;
  dayWord?: string;
  values?: number[];
  initS?: number;
  initE?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

// ambient 타입이 빽약하다 — 이벤트는 파일 안에서 로컬 타입으로 선언
type PointerTarget = {
  getBoundingClientRect(): DOMRect;
  setPointerCapture(id: number): void;
  addEventListener(t: string, f: EventListener): void;
  removeEventListener(t: string, f: EventListener): void;
};
type PointerLike = {
  clientX: number;
  pointerId: number;
  currentTarget: PointerTarget;
};
type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--s"?: string;
  "--e"?: string;
  "--n"?: string;
  "--d"?: string;
};
type BarVars = CSSProperties & { "--b"?: string };

export default function BrushRange({
  title = "14일 매출",
  totalLabel = "합계",
  unit = "만원",
  dayWord = "일",
  values = [12, 9, 14, 11, 8, 15, 18, 16, 10, 13, 7, 11, 9, 12],
  initS = 4,
  initE = 8,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: BrushRangeProps) {
  const N = values.length;
  const maxV = Math.max(...values);
  const [demo, setDemo] = useState(true);
  const [s, setS] = useState(initS);
  const [e, setE] = useState(initE);

  const sum = values.reduce((a, v, i) => a + (i >= s && i <= e ? v : 0), 0);
  const days = e - s + 1;
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--s": String(s),
    "--e": String(e),
    "--n": String(sum),
    "--d": String(days),
  };

  function idx(clientX: number, r: DOMRect) {
    const t = Math.min(Math.max((clientX - r.left) / r.width, 0), 1);
    return Math.min(Math.max(Math.round(t * (N - 1)), 0), N - 1);
  }

  function onDown(ev: PointerLike) {
    setDemo(false);
    ev.currentTarget.setPointerCapture(ev.pointerId);   // 마우스·터치 공용 붙잡기
    const r = ev.currentTarget.getBoundingClientRect();
    const a = idx(ev.clientX, r);
    const move = (m: PointerLike) => {
      const c = idx(m.clientX, r);
      setS(Math.min(a, c));
      setE(Math.max(a, c));
    };
    const target = ev.currentTarget;
    const up = () => {
      target.removeEventListener("pointermove", move as unknown as EventListener);
      target.removeEventListener("pointerup", up as unknown as EventListener);
    };
    target.addEventListener("pointermove", move as unknown as EventListener);
    target.addEventListener("pointerup", up as unknown as EventListener);
    move(ev);
  }

  function onKey(ev: KeyEvt) {
    const d = ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : 0;
    if (!d) {
      if (ev.key === "Home" || ev.key === "End") {
        ev.preventDefault();
        setS(ev.key === "Home" ? 0 : N - 1);
        setE(ev.key === "Home" ? 0 : N - 1);
      }
      return;
    }
    ev.preventDefault();
    setDemo(false);
    if (ev.shiftKey) setS((v) => Math.min(Math.max(v + d, 0), e));
    else setE((v) => Math.min(Math.max(v + d, s), N - 1));
  }

  return (
    <figure className={`${styles.br} ${demo ? styles.isDemo : ""}`} style={vars}>
      <figcaption className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.sum}>
          <span className={styles.lab}>{totalLabel}</span>{" "}
          <span className={styles.val} aria-hidden="true">
            <i className={styles.n} />
            <span className={styles.u}>{unit}</span> · <i className={styles.d} />
            <span className={styles.u}>{dayWord}</span>
          </span>
        </span>
      </figcaption>
      <div
        className={styles.plot}
        role="img"
        aria-label="14일 매출 막대 그래프. 7일째 18만원이 가장 높고 11일째 7만원이 가장 낮다"
      >
        <div className={styles.track}>
          {values.map((v, i) => (
            <i
              className={styles.bar}
              key={i}
              data-far={i < initS || i > initE ? "1" : undefined}
              data-in={i >= s && i <= e ? "1" : "0"}
              style={{ "--b": `${((v / maxV) * 100).toFixed(1)}%` } as BarVars}
            />
          ))}
        </div>
        <i className={styles.band} aria-hidden="true" />
        <button
          type="button"
          className={styles.hot}
          aria-label="구간 긁기 — 끝점은 ←→ · 시작점은 Shift+←→"
          onPointerDown={onDown}
          onKeyDown={onKey}
        />
      </div>
      <p className={styles.hint}>막대를 옆으로 긁거나 ←→ 로 구간을 고르세요</p>
      <span className={styles.sr} aria-live="polite">
        {sum}
        {unit} · {days}
        {dayWord}
      </span>
    </figure>
  );
}
