import { useEffect, useRef, useCallback, useState } from "react";
import styles from "./IframeClickToLoad.module.scss";

// 클릭 지점에서 프레임 네 모서리까지의 최대 거리(피타고라스) 를 리플 반지름
// 목표값으로 계산해, 실제 클릭 지점에서 시작하는 원이 프레임을 덮는다.
const RIPPLE_DURATION_MS = 520;
const LOAD_DELAY_MS = 340;
const CYCLE_GAP_MS = 2400;

type Box<T> = { current: T };
function useBox<T>(initial: T): Box<T> {
  return useRef(initial) as unknown as Box<T>;
}

function maxDistanceToCorner(x: number, y: number, w: number, h: number): number {
  const dTL = Math.sqrt(x * x + y * y);
  const dTR = Math.sqrt((w - x) * (w - x) + y * y);
  const dBL = Math.sqrt(x * x + (h - y) * (h - y));
  const dBR = Math.sqrt((w - x) * (w - x) + (h - y) * (h - y));
  return Math.max(dTL, dTR, dBL, dBR);
}

export default function IframeClickToLoad() {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState(true);
  const [rippleActive, setRippleActive] = useState(false);
  const [circle, setCircle] = useState({ cx: 0, cy: 0, r: 0 });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useBox<boolean>(false);

  const runRipple = useCallback((x: number, y: number, onDone: () => void) => {
    const rect = frameRef.current?.getBoundingClientRect();
    const w = rect ? rect.width : 220;
    const h = rect ? rect.height : 140;
    const targetR = maxDistanceToCorner(x, y, w, h);
    setCircle({ cx: x, cy: y, r: 0 });
    setRippleActive(true);
    const start = performance.now();
    function step(now: number) {
      const progress = Math.min((now - start) / RIPPLE_DURATION_MS, 1);
      setCircle({ cx: x, cy: y, r: targetR * progress });
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setRippleActive(false);
        onDone();
      }
    }
    requestAnimationFrame(step);
  }, []);

  const loadEmbed = useCallback((x: number, y: number) => {
    if (loadedRef.current) { return; }
    loadedRef.current = true;
    setLoaded(false);
    setLoading(true);
    runRipple(x, y, () => {
      window.setTimeout(() => {
        setLoading(false);
        setLoaded(true);
      }, LOAD_DELAY_MS);
    });
  }, [loadedRef, runRipple]);

  const resetEmbed = useCallback(() => {
    loadedRef.current = false;
    setLoading(false);
    setLoaded(false);
  }, [loadedRef]);

  const onClick = useCallback((e: { clientX: number; clientY: number }) => {
    setDemo(false);
    if (loadedRef.current) { return; }
    const rect = frameRef.current?.getBoundingClientRect();
    const x = rect ? e.clientX - rect.left : 110;
    const y = rect ? e.clientY - rect.top : 70;
    loadEmbed(x, y);
  }, [loadedRef, loadEmbed]);

  useEffect(() => {
    const frame = frameRef.current;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setDemo(false);
        if (loadedRef.current) { return; }
        const rect = frame?.getBoundingClientRect();
        loadEmbed(rect ? rect.width / 2 : 110, rect ? rect.height / 2 : 70);
      }
    }
    frame?.addEventListener("keydown", onKeyDown);
    return () => frame?.removeEventListener("keydown", onKeyDown);
  }, [loadedRef, loadEmbed]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDemo(false);
      loadedRef.current = true;
      setLoaded(true);
      return;
    }
    let cancelled = false;
    let t1: number | null = null;
    let t2: number | null = null;
    function loop() {
      if (cancelled) { return; }
      resetEmbed();
      t1 = window.setTimeout(() => {
        if (cancelled || !rootRef.current?.classList.contains(styles["is-demo"])) { return; }
        loadEmbed(110, 70);
        t2 = window.setTimeout(() => {
          if (!cancelled && rootRef.current?.classList.contains(styles["is-demo"])) { loop(); }
        }, CYCLE_GAP_MS);
      }, 700);
    }
    loop();
    return () => {
      cancelled = true;
      if (t1 !== null) { window.clearTimeout(t1); }
      if (t2 !== null) { window.clearTimeout(t2); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const frameClass = [
    styles.lic__frame,
    loading ? styles["lic__frame--loading"] : "",
    loaded ? styles["lic__frame--loaded"] : "",
  ].join(" ").trim();

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.lic} ${demo ? styles["is-demo"] : ""}`}>
        <div
          ref={frameRef}
          className={frameClass}
          tabIndex={0}
          role="button"
          aria-label={loaded ? "지도 임베드 로드됨" : "지도 임베드 불러오기"}
          onClick={onClick}
        >
          <div className={styles["lic__notice"]}>
            <span className={styles["lic__pin"]}>{"📍"}</span>
            <p className={styles["lic__text"]}>클릭하면 지도를 불러옵니다</p>
          </div>
          <svg className={`${styles["lic__ripple"]} ${rippleActive ? styles["lic__ripple--active"] : ""}`} aria-hidden="true">
            <circle cx={circle.cx} cy={circle.cy} r={circle.r} />
          </svg>
          <div className={styles["lic__embed"]}>
            <svg viewBox="0 0 220 140" width="100%" height="100%" preserveAspectRatio="none">
              <rect width={220} height={140} fill="#d8ead8" />
              <path d="M0 90 L60 70 L120 96 L160 60 L220 84 L220 140 L0 140 Z" fill="#bfe0c4" />
              <path d="M0 40 L220 55" stroke="#f4d878" strokeWidth={6} />
              <path d="M40 0 L70 140" stroke="#f4d878" strokeWidth={5} />
              <circle cx={118} cy={66} r={7} fill="#e6564a" />
              <circle cx={118} cy={66} r={3} fill="#fff" />
            </svg>
          </div>
        </div>
      </div>
    </main>
  );
}
