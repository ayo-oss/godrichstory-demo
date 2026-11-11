// SidebarDetentSnap - vanilla 판(04-rh-sidebar-detent-snap) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./SidebarDetentSnap.module.scss";

export default function SidebarDetentSnap() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let raf = 0;
    let t0 = -1;
    let last = -1;
    const offs: Array<() => void> = [];

    function q<T extends Element>(sel: string): T {
      return root.querySelector(sel) as T;
    }
    function clamp(v: number, lo: number, hi: number): number {
      return Math.max(lo, Math.min(hi, v));
    }
    function seg(t: number, a: number, b: number): number {
      const c = clamp((t - a) / (b - a), 0, 1);
      return c * c * (3 - 2 * c);
    }
    function on(el: EventTarget, type: string, fn: (e: any) => void): void {
      el.addEventListener(type, fn);
      offs.push(() => el.removeEventListener(type, fn));
    }
    function stopDemo(): void {
      demo = false;
      root.removeAttribute("data-demo");
      root.classList.remove("is-demo");
    }
    function pos(e: PointerEvent): { x: number; y: number } {
      const r = root.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function spring(x: number, v: number, to: number, k: number, c: number, dt: number): number[] {
      const n = Math.max(1, Math.ceil(dt / 0.008));
      const h = dt / n;
      for (let i = 0; i < n; i += 1) {
        v += (-k * (x - to) - c * v) * h;
        x += v * h;
      }
      return [x, v];
    }
    function sync(): void {
      if (reduce) {
        snap();
        render();
      }
    }

    // 기법: 끄는 중에는 눈금 가까이에서 PULL_RADIUS 안으로 들어오는 만큼 끌려가고(거리 비례),
    // 놓을 때는 손 속도에 FLING 시간을 곱해 미리 내다본 위치에서 가장 가까운 눈금(NEAREST)으로 간다.
    const DETENTS = [56, 144, 232];
    const PULL_RADIUS = 36;
    const FLING_VEL = 0.2;
    const side = q<HTMLElement>("[data-r=side]");
    const grip = q<HTMLElement>("[data-r=grip]");
    const cursor = q<HTMLElement>("[data-r=cursor]");
    const wEl = q<HTMLElement>("[data-r=w]");
    const detEl = q<HTMLElement>("[data-r=det]");
    const labs = Array.prototype.slice.call(root.querySelectorAll("[data-r=lab]")) as HTMLElement[];
    const ticks = Array.prototype.slice.call(root.querySelectorAll("[data-r=tick]")) as HTMLElement[];
    let sw = DETENTS[0];
    let vs = 0;
    let target = DETENTS[0];
    let raw = DETENTS[0];
    let lastRaw = DETENTS[0];
    let vel = 0;
    let px = 0;
    let py = 0;
    let gx = 0;
    let dragging = false;

    function limit(): number { return Math.min(DETENTS[2], root.clientWidth - 48); }

    function nearest(x: number): number {
      let best = 0;
      for (let i = 1; i < DETENTS.length; i += 1) {
        if (Math.abs(DETENTS[i] - x) < Math.abs(DETENTS[best] - x)) best = i;
      }
      return best;
    }

    function pulled(x: number): number {
      const d = DETENTS[nearest(x)];
      const dist = Math.abs(x - d);
      if (dist >= PULL_RADIUS) return x;
      const t = 1 - dist / PULL_RADIUS;
      return x + (d - x) * t * t * 0.9;
    }

    function release(): void {
      if (!dragging) return;
      dragging = false;
      target = Math.min(DETENTS[nearest(raw + vel * FLING_VEL)], limit());
    }

    function userTakes(): void {
      stopDemo();
      dragging = false;
    }

    function script(now: number): void {
      const ph = now % 2000;
      const was = dragging;
      dragging = false;
      if (ph >= 200 && ph < 560) { raw = 60 + 110 * seg2(ph, 200, 560); dragging = true; }
      else if (ph >= 1100 && ph < 1500) { raw = DETENTS[2] - 132 * seg2(ph, 1100, 1500); dragging = true; }
      if (!was && dragging) { lastRaw = raw; vel = 0; }
      if (was && !dragging) { dragging = true; release(); }
      px = (dragging ? raw : sw) - 4;
      py = root.clientHeight * 0.5;
      gx = 4;
    }

    function seg2(t: number, a: number, b: number): number { return clamp((t - a) / (b - a), 0, 1); }

    function snap(): void {
      sw = target;
      vs = 0;
    }

    function step(dt: number, now: number): void {
      if (demo) script(now);
      if (dragging) {
        if (!demo) raw = clamp(px + gx, 40, limit());
        vel += ((raw - lastRaw) / Math.max(dt, 0.001) - vel) * 0.3;
        lastRaw = raw;
        target = clamp(pulled(raw), 40, limit());
      }
      const a = spring(sw, vs, target, 900, 2 * 0.72 * 30, dt);
      sw = a[0];
      vs = a[1];
    }

    function render(): void {
      side.style.width = sw.toFixed(1) + "px";
      const open = clamp((sw - 100) / 60, 0, 1);
      for (let i = 0; i < labs.length; i += 1) labs[i].style.opacity = open.toFixed(2);
      for (let i = 0; i < ticks.length; i += 1) {
        ticks[i].style.transform = "translateX(" + DETENTS[i] + "px)";
        ticks[i].setAttribute("data-on", i === nearest(sw) ? "1" : "0");
      }
      wEl.textContent = String(Math.round(sw));
      detEl.textContent = String(nearest(sw) + 1);
      cursor.style.transform = "translate(" + px.toFixed(1) + "px," + py.toFixed(1) + "px)";
    }

    on(grip, "pointerdown", (e: PointerEvent) => {
      userTakes();
      grip.setPointerCapture(e.pointerId);
      const p = pos(e);
      px = p.x;
      py = p.y;
      gx = sw - p.x;
      raw = lastRaw = sw;
      vel = 0;
      dragging = true;
    });
    on(grip, "pointermove", (e: PointerEvent) => {
      if (!dragging) return;
      px = pos(e).x;
      raw = clamp(px + gx, 40, limit());
      if (reduce) { target = clamp(pulled(raw), 40, limit()); sync(); }
    });
    on(grip, "pointerup", release);
    on(grip, "pointercancel", release);
    on(grip, "keydown", (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      userTakes();
      const i = clamp(nearest(target) + (e.key === "ArrowRight" ? 1 : -1), 0, DETENTS.length - 1);
      target = Math.min(DETENTS[i], limit());
      sync();
    });

    function frame(ts: number): void {
      if (t0 < 0) {
        t0 = ts;
        last = ts;
      }
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      step(dt, ts - t0);
      render();
      raf = requestAnimationFrame(frame);
    }
    if (reduce) {
      stopDemo();
      snap();
      render();
    } else {
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      offs.forEach((f) => f());
    };

  }, []);

  return (
    <main className={styles["stage"]}>
      <div ref={rootRef} className={styles["rh"] + " is-demo"} data-demo="1">
        <div className={styles["rh__side"]} data-r="side">
          <p className={styles["rh__item"]}><i className={styles["rh__ico"]}></i><span className={styles["rh__lab"]} data-r="lab">Home</span></p>
          <p className={styles["rh__item"]}><i className={styles["rh__ico"]}></i><span className={styles["rh__lab"]} data-r="lab">Inbox</span></p>
          <p className={styles["rh__item"]}><i className={styles["rh__ico"]}></i><span className={styles["rh__lab"]} data-r="lab">Tasks</span></p>
          <p className={styles["rh__item"]}><i className={styles["rh__ico"]}></i><span className={styles["rh__lab"]} data-r="lab">Setup</span></p>
          <button className={styles["rh__grip"]} data-r="grip" type="button" aria-label="크기 조절 손잡이"></button>
        </div>
        <i className={styles["rh__tick"]} data-r="tick"></i><i className={styles["rh__tick"]} data-r="tick"></i><i className={styles["rh__tick"]} data-r="tick"></i>
        <div className={styles["rh__main"]}><i></i><i></i><i></i></div>
        <p className={styles["rh__meta"]}><span className={styles["rh__tag"]}>DETENT</span> <b data-r="det">1</b> <span className={styles["rh__tag"]}>W</span> <b data-r="w">0</b></p>
        <i className={styles["rh__cursor"]} data-r="cursor"></i>
      </div>
    </main>
  );
}
