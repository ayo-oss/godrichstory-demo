// FlyTrayButton — vanilla 판(03-dlbtn-file-fly-tray) 의 React 포트.
// 파일 아이콘은 2차 베지어 곡선 위를 날고, 도착하면 트레이가 TRAY_BOUNCE 만큼 눌렸다가 스프링으로 돌아온다.
import { useEffect, useRef } from "react";
import styles from "./FlyTrayButton.module.scss";

const FLY_MS = 700;
const ARC_HEIGHT = 56;
const TRAY_BOUNCE = 14;
const TRAY_K = 180;
const TRAY_DAMP = 10;
const START_MS = 200;
const CYCLE_MS = 2000;

function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function FlyTrayButton() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const fileRef = useRef<SVGSVGElement | null>(null);
  const trayRef = useRef<HTMLDivElement | null>(null);
  const countRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const btn = btnRef.current;
    const file = fileRef.current;
    const tray = trayRef.current;
    const countEl = countRef.current;
    if (!root || !btn || !file || !tray || !countEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let clock = 0;
    let flightStart: number | null = null;
    let count = 0;
    let ty = 0;
    let tv = 0;
    let lastCycle = -1;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    const land = (): void => { count += 1; ty = TRAY_BOUNCE; tv = 0; flightStart = null; };
    const renderFile = (now: number): void => {
      if (flightStart === null) { file.style.opacity = "0"; return; }
      const t = Math.min(1, (now - flightStart) / FLY_MS);
      const e = ease(t);
      const gx = root.clientWidth / 2;
      const y0 = btn.offsetTop + btn.offsetHeight / 2;
      const y2 = tray.offsetTop + tray.offsetHeight / 2;
      const cx = gx + 2 * ARC_HEIGHT;
      const cy = (y0 + y2) / 2;
      const x = (1 - e) * (1 - e) * gx + 2 * (1 - e) * e * cx + e * e * gx;
      const y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * y2;
      const rot = 28 * Math.sin(Math.PI * e);
      const sc = 1 - 0.45 * e;
      file.style.opacity = t > 0.9 ? String((1 - t) * 10) : "1";
      file.style.transform = `translate(${(x - 14).toFixed(1)}px,${(y - 14).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
    };
    const renderTray = (): void => {
      tray.style.transform = `translateY(${ty.toFixed(2)}px)`;
      tray.style.setProperty("--h", Math.max(0, Math.min(1, ty / TRAY_BOUNCE)).toFixed(3));
      countEl.textContent = String(count);
    };
    const activate = (): void => {
      demo = false;
      if (reduce) { count += 1; renderTray(); return; }
      if (flightStart === null) flightStart = clock;
    };
    btn.addEventListener("click", activate);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      clock = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demo && clock >= START_MS) {
        const cyc = Math.floor((clock - START_MS) / CYCLE_MS);
        if (cyc > lastCycle) { lastCycle = cyc; count = 0; flightStart = START_MS + cyc * CYCLE_MS; }
      }
      if (flightStart !== null && clock - flightStart >= FLY_MS) land();
      const n = Math.ceil(dt / 0.008);
      const h = dt / n;
      for (let i = 0; i < n; i += 1) {
        tv += (-TRAY_K * ty - TRAY_DAMP * tv) * h;
        ty += tv * h;
      }
      renderFile(clock);
      renderTray();
      raf = requestAnimationFrame(tick);
    }

    if (reduce) renderTray();
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      btn.removeEventListener("click", activate);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.fl} ref={rootRef}>
        <button className={styles.fl__btn} type="button" ref={btnRef}>
          <svg className={styles.fl__icon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v11M6.5 10.5 12 16l5.5-5.5M5 20h14" />
          </svg>
          <span>내려받기</span>
        </button>
        <svg className={styles.fl__file} viewBox="0 0 24 24" aria-hidden="true" ref={fileRef}>
          <path d="M7 3h7l5 5v13H7zM14 3v5h5" />
        </svg>
        <div className={styles.fl__tray} role="status" ref={trayRef}>
          <span>받은 파일</span>
          <b ref={countRef}>0</b>
        </div>
      </div>
    </main>
  );
}
