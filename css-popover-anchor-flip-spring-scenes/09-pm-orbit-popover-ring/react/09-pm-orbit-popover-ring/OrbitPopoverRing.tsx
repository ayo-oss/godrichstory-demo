// OrbitPopoverRing - vanilla 판(09-pm-orbit-popover-ring) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./OrbitPopoverRing.module.scss";

export default function OrbitPopoverRing() {
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
    let acc = 0;
    let clock = 0;
    const offs: Array<() => void> = [];
    const live = root.querySelector("[data-r=live]") as HTMLElement;

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
      if (!demo) return;
      demo = false;
      root.removeAttribute("data-demo");
      root.classList.remove("is-demo");
      live.setAttribute("aria-live", "polite");
    }
    if (reduce) live.setAttribute("aria-live", "polite");
    let shown = "";
    function say(s: string): void {
      if (s === shown) return;
      shown = s;
      live.textContent = s;
    }
    function makeRng(seed: number): () => number {
      let s = seed >>> 0;
      return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
      };
    }
    function local(e: PointerEvent): { x: number; y: number } {
      const r = root.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function sync(): void {
      if (reduce) {
        snap();
        render();
      }
    }

    // 기법: 팝오버를 앵커 둘레에 같은 각도 간격으로 목표를 잡고 PULL 로 끌어당기되, 사각형이 겹치면 얕게 겹친 축으로 REPEL 만큼 서로 밀어낸다. 겹침이 풀리고 속도가 SETTLE 아래로 내려가면 자리가 잡힌 것이다.
    const REPEL = 0.6;
    const RADIUS = 72;
    const SETTLE = 0.12;
    const ANGLE_OFFSET = -1.2;
    const PULL = 0.03;
    const DAMP = 0.82;
    const CHIP_H = 26;
    const MAX_N = 7;
    const CYCLE_MS = 3200;
    const hub = q<HTMLElement>("[data-r=hub]");
    const chips = Array.from(root.querySelectorAll("[data-r=chip]")) as HTMLElement[];
    const againBtn = q<HTMLElement>("[data-r=again]");
    const moreBtn = q<HTMLElement>("[data-r=more]");
    const cw: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    const vxs: number[] = [];
    const vys: number[] = [];
    let count = 6;
    let age = 0;
    let restAt = -1;
    let clearAt = -1;
    let cycle = -2;
    let ov = 0;
    let diam = 0;
    let spawned = false;
    for (let i = 0; i < MAX_N; i += 1) {
      cw.push(58 + ((i * 17) % 26));
      xs.push(0);
      ys.push(0);
      vxs.push(0);
      vys.push(0);
    }

    function spawn(seed: number): void {
      const rng = makeRng(seed + 11);
      const w = root.clientWidth;
      const h = root.clientHeight;
      for (let i = 0; i < MAX_N; i += 1) {
        const a = ANGLE_OFFSET + (i / count) * Math.PI * 2;
        xs[i] = w / 2 + Math.cos(a) * 20 + (rng() - 0.5) * 10;
        ys[i] = h / 2 + Math.sin(a) * 14 + (rng() - 0.5) * 10;
        vxs[i] = 0;
        vys[i] = 0;
      }
      age = 0;
      restAt = -1;
      clearAt = -1;
      spawned = true;
    }
    function advance(): void {
      const w = root.clientWidth;
      const h = root.clientHeight;
      const rx = Math.min(RADIUS * 1.45, w / 2 - 48);
      const ry = Math.min(RADIUS, h / 2 - 24);
      for (let i = 0; i < count; i += 1) {
        const a = ANGLE_OFFSET + (i / count) * Math.PI * 2;
        vxs[i] += (w / 2 + Math.cos(a) * rx - xs[i]) * PULL;
        vys[i] += (h / 2 + Math.sin(a) * ry - ys[i]) * PULL;
      }
      ov = 0;
      for (let i = 0; i < count; i += 1) {
        for (let j = i + 1; j < count; j += 1) {
          const dx = xs[j] - xs[i];
          const dy = ys[j] - ys[i];
          const gx = (cw[i] + cw[j]) / 2 - Math.abs(dx);
          const gy = CHIP_H - Math.abs(dy);
          if (gx <= 0 || gy <= 0) continue;
          ov += 1;
          if (gx < gy) {
            const f = gx * REPEL * 0.25 * (dx >= 0 ? 1 : -1);
            vxs[i] -= f;
            vxs[j] += f;
          } else {
            const f = gy * REPEL * 0.25 * (dy >= 0 ? 1 : -1);
            vys[i] -= f;
            vys[j] += f;
          }
        }
      }
      let fast = 0;
      let lo = 99999;
      let hi = -99999;
      for (let i = 0; i < count; i += 1) {
        vxs[i] *= DAMP;
        vys[i] *= DAMP;
        xs[i] += vxs[i];
        ys[i] += vys[i];
        fast = Math.max(fast, Math.hypot(vxs[i], vys[i]));
        lo = Math.min(lo, xs[i] - cw[i] / 2);
        hi = Math.max(hi, xs[i] + cw[i] / 2);
      }
      diam = hi - lo;
      age += 1;
      if (clearAt < 0 && ov === 0) clearAt = age;
      if (restAt < 0 && ov === 0 && fast < SETTLE) restAt = age;
    }
    function tick(ms: number): void {
      if (demo) {
        const c = Math.floor((ms - 200) / CYCLE_MS);
        if (c !== cycle && ms >= 200) {
          cycle = c;
          spawn(c);
        }
      }
      if (!spawned) spawn(0);
      advance();
    }
    function snap(): void {
      if (!spawned) spawn(0);
      for (let k = 0; k < 160; k += 1) advance();
    }
    function render(): void {
      const w = root.clientWidth;
      const h = root.clientHeight;
      hub.style.transform = "translate3d(" + (w / 2 - 14).toFixed(1) + "px," + (h / 2 - 14).toFixed(1) + "px,0)";
      for (let i = 0; i < MAX_N; i += 1) {
        const on = i < count;
        chips[i].style.visibility = on ? "visible" : "hidden";
        chips[i].style.width = cw[i] + "px";
        chips[i].style.transform = "translate3d(" + (xs[i] - cw[i] / 2).toFixed(1) + "px," + (ys[i] - CHIP_H / 2).toFixed(1) + "px,0)";
      }
      say("overlap " + ov + "  clear " + (clearAt < 0 ? "-" : clearAt + "f") + "  rest " + (restAt < 0 ? "-" : restAt + "f") + "  d " + Math.round(diam));
    }
    on(againBtn, "click", () => {
      stopDemo();
      spawn(age + count);
      sync();
    });
    on(moreBtn, "click", () => {
      stopDemo();
      count = 4 + ((count - 3) % 4);
      spawn(count);
      sync();
    });

    const FRAME_MS = 1000 / 60;
    function frame(ts: number): void {
      if (t0 < 0) {
        t0 = ts;
        last = ts;
      }
      acc += Math.min(100, ts - last);
      last = ts;
      let n = 0;
      while (acc >= FRAME_MS && n < 6) {
        clock += FRAME_MS;
        tick(clock);
        acc -= FRAME_MS;
        n += 1;
      }
      if (n === 6) acc = 0;
      render();
      raf = requestAnimationFrame(frame);
    }
    const ro = new ResizeObserver(() => sync());
    ro.observe(root);
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
      ro.disconnect();
    };

  }, []);

  return (
    <main className={styles["stage"]}>
      <div ref={rootRef} className={styles["pm"] + " is-demo"} data-demo="1">
        <p className={styles["pm__live"]} data-r="live" aria-live="off" aria-atomic="true"></p>
        <div className={styles["pm__btns"]}><button className={styles["pm__btn"]} data-r="again" type="button">다시 펼치기</button><button className={styles["pm__btn"]} data-r="more" type="button">개수 바꾸기</button></div>
        <i className={styles["pm__hub"]} data-r="hub"></i>
        <i className={styles["pm__chip"]} data-r="chip">1</i><i className={styles["pm__chip"]} data-r="chip">2</i><i className={styles["pm__chip"]} data-r="chip">3</i><i className={styles["pm__chip"]} data-r="chip">4</i><i className={styles["pm__chip"]} data-r="chip">5</i><i className={styles["pm__chip"]} data-r="chip">6</i><i className={styles["pm__chip"]} data-r="chip">7</i>
      </div>
    </main>
  );
}
