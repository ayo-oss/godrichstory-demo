// GenreWheel — vanilla 판(run/374/demo/02-arc-genre-wheel/index.html) 의 React 포트.
// 계산 겹 ① 회전각을 STEP_DEG(360/7) 로 나눈 나머지로 "지금 중앙을 지나는 인덱스"를 구한다
// ② 인덱스를 색상환 각도로 그대로 쓰는 색상 각도 매핑(hsl, hex 리터럴 없음).
import { useEffect, useRef, useState } from "react";
import styles from "./GenreWheel.module.scss";

type Box<T> = { current: T };

const GENRES = ["팝", "재즈", "로파이", "록", "클래식", "힙합", "전자"];
const N = GENRES.length;
const STEP_DEG = 360 / N;
const HUE_STEP_DEG = 360 / N;
const LOOP_MS = 2000;

export default function GenreWheel() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const wheelRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const ringRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const rafRef = useRef(0) as unknown as Box<number>;
  const [picked, setPicked] = useState(GENRES[0]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    const wheel = wheelRef.current;
    const ring = ringRef.current;
    if (!root || !wheel || !ring) return;

    const lis: HTMLLIElement[] = Array.prototype.slice.call(ring.querySelectorAll("li"));
    lis.forEach(function (li, i) { li.style.setProperty("--hue", String(i * HUE_STEP_DEG)); });

    let isDemo = true;
    let rotation = 0;
    let dragging = false;
    let startX = 0;
    let startRotation = 0;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function activeIndex() {
      const norm = (((-rotation) % 360) + 360) % 360;
      return Math.round(norm / STEP_DEG) % N;
    }

    function apply() {
      ring!.style.setProperty("--rotation", String(rotation));
      const idx = activeIndex();
      lis.forEach(function (li, i) { li.classList.toggle(styles.slotActive, i === idx); });
      setPicked(GENRES[idx]);
    }

    function onPointerDown(e: PointerEvent) {
      human();
      dragging = true;
      startX = e.clientX;
      startRotation = rotation;
      wheel!.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      rotation = startRotation + (e.clientX - startX) * 0.6;
      apply();
    }
    function onPointerUp() {
      dragging = false;
      rotation = Math.round(rotation / STEP_DEG) * STEP_DEG;
      apply();
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { human(); rotation -= STEP_DEG; apply(); e.preventDefault(); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { human(); rotation += STEP_DEG; apply(); e.preventDefault(); }
    }
    wheel.addEventListener("pointerdown", onPointerDown);
    wheel.addEventListener("pointermove", onPointerMove);
    wheel.addEventListener("pointerup", onPointerUp);
    wheel.addEventListener("keydown", onKeydown);

    function loop(ts: number) {
      if (isDemo) {
        if (!reduce) {
          const phase = (ts % LOOP_MS) / LOOP_MS;
          rotation = -phase * 360 * 2;
        } else {
          rotation = 0;
        }
        apply();
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    apply();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      wheel.removeEventListener("pointerdown", onPointerDown);
      wheel.removeEventListener("pointermove", onPointerMove);
      wheel.removeEventListener("pointerup", onPointerUp);
      wheel.removeEventListener("keydown", onKeydown);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.gw + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.wheel} ref={wheelRef} tabIndex={0} role="listbox" aria-label="장르 선택 휠">
          <ul className={styles.ring} ref={ringRef}>
            {GENRES.map(function (g, i) {
              return <li key={g} className={styles.slot} style={{ ["--i" as string]: i }}>{g}</li>;
            })}
          </ul>
        </div>
        <div className={styles.pointer} aria-hidden="true" />
        <p className={styles.picked}>선택: {picked}</p>
      </div>
    </main>
  );
}
