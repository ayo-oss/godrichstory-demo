// FallbackPolyfill — vanilla 판(run/372/demo/08-corner-shape-fallback-polyfill/index.html) 의 React 포트.
// 반경을 코사인으로 왕복시킨다 — 사인이 아니라 위상을 맞춘 코사인으로 0초에 하한에서 시작한다.
import { useEffect, useRef } from "react";
import styles from "./FallbackPolyfill.module.scss";

type Box<T> = { current: T };

const R_MIN = 6; // 반경 하한(px)
const R_MAX = 34; // 반경 상한(px)
const SWEEP_MS = 2000; // 반경이 하한↔상한을 왕복하는 주기
const SUPER_N = 2.6; // 슈퍼타원 지수 고정값 — 원과 사각형 사이

export default function FallbackPolyfill() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const nativeRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const shimRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const capRef = useRef(null) as unknown as Box<HTMLElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SUPPORTS = CSS.supports("corner-shape", "superellipse(1)");

    const root = rootRef.current;
    const nativeBox = nativeRef.current;
    const shimBox = shimRef.current;
    const capNative = capRef.current;
    const readout = readoutRef.current;
    if (!root || !nativeBox || !shimBox || !capNative || !readout) return;

    let isDemo = true;
    let paused = false;
    let frozenT = 0;

    // 캡션을 실제 지원 여부로 갱신 — 미지원 환경에서 열면 두 칸 다 폴백으로 표시된다
    if (!SUPPORTS) capNative.textContent = "미지원 폴백";

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    // 계산 겹: 반경을 코사인으로 왕복시킨다 — 사인이 아니라 위상을 맞춘 코사인으로 0초에 하한에서 시작한다
    function radiusAt(t: number) {
      const c = (1 - Math.cos(t * Math.PI * 2)) / 2;
      return R_MIN + (R_MAX - R_MIN) * c;
    }

    function applyBoth(r: number) {
      if (SUPPORTS) {
        (nativeBox!.style as any).cornerShape = "superellipse(" + SUPER_N.toFixed(1) + ")";
      }
      nativeBox!.style.borderRadius = r.toFixed(2) + "px";
      shimBox!.style.borderRadius = r.toFixed(2) + "px";
      readout!.textContent = "지금 반경 " + r.toFixed(1);
    }

    function onClick() {
      human();
      paused = !paused;
      if (paused) frozenT = performance.now();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); onClick(); }
    }
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);

    let start = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      let t: number;
      if (reduce) {
        t = 0.5;
      } else if (paused) {
        t = ((frozenT - start) % SWEEP_MS) / SWEEP_MS;
      } else {
        t = ((ts - start) % SWEEP_MS) / SWEEP_MS;
      }
      applyBoth(radiusAt(t));
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef} tabIndex={0}>
        <div className={styles.row}>
          <figure className={styles.cell}>
            <div className={styles.box + " " + styles.native} ref={nativeRef} />
            <figcaption className={styles.cap} ref={capRef}>지원 환경</figcaption>
          </figure>
          <figure className={styles.cell}>
            <div className={styles.box + " " + styles.shim} ref={shimRef} />
            <figcaption className={styles.cap}>미지원 폴백</figcaption>
          </figure>
        </div>
        <p className={styles.readout} ref={readoutRef} aria-live="polite">지금 반경 20.0</p>
      </div>
    </main>
  );
}
