// InkBloomReveal - vanilla 판(08-pm-ink-bloom-reveal) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./InkBloomReveal.module.scss";

export default function InkBloomReveal() {
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

    // 기법: 앵커 점에서 퍼지는 원형 마스크의 반지름을 각도마다 2차원 값 노이즈로 흔들어 다각형 clip-path 로 만든다. 뒤에 RING 만큼 큰 같은 모양을 깔아 잉크 가장자리를 낸다.
    const BLOOM_MS = 700;
    const NOISE_AMP = 0.24;
    const NOISE_FREQ = 2.2;
    const RING = 10;
    const POINTS = 48;
    const CYCLE_MS = 3200;
    const ANCHOR_SIZE = 44;
    const anchor = q<HTMLElement>("[data-r=anchor]");
    const card = q<HTMLElement>("[data-r=card]");
    const ring = q<HTMLElement>("[data-r=ring]");
    let want = reduce;
    let p = 0;
    let expanded = false;
    let radius = 0;
    let cw = 0;
    let ch = 0;
    let ox = 0;
    let oy = 0;

    function hash(ix: number, iy: number): number {
      let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 2 - 1;
    }
    function noise2(x: number, y: number): number {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      const fx = x - ix;
      const fy = y - iy;
      const ux = fx * fx * (3 - 2 * fx);
      const uy = fy * fy * (3 - 2 * fy);
      const a = hash(ix, iy);
      const b = hash(ix + 1, iy);
      const c = hash(ix, iy + 1);
      const d = hash(ix + 1, iy + 1);
      return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    }
    function mask(r: number, extra: number): string {
      const pts: string[] = [];
      for (let i = 0; i < POINTS; i += 1) {
        const a = (i / POINTS) * Math.PI * 2;
        const n = noise2(Math.cos(a) * NOISE_FREQ + 7 + p * 0.8, Math.sin(a) * NOISE_FREQ + 3);
        const rr = Math.max(0, r * (1 + NOISE_AMP * n) + extra);
        pts.push((ox + Math.cos(a) * rr).toFixed(1) + "px " + (oy + Math.sin(a) * rr).toFixed(1) + "px");
      }
      return "polygon(" + pts.join(",") + ")";
    }
    function layout(): void {
      const w = root.clientWidth;
      const h = root.clientHeight;
      cw = Math.min(260, w - 96);
      ch = Math.min(150, h - 28);
      const ax = 20 + ANCHOR_SIZE / 2;
      const ay = h / 2;
      const cx = 80;
      const cy = (h - ch) / 2;
      ox = ax - cx;
      oy = ay - cy;
      for (const el of [card, ring]) {
        el.style.width = cw + "px";
        el.style.height = ch + "px";
        el.style.transform = "translate3d(" + cx + "px," + cy.toFixed(1) + "px,0)";
      }
      anchor.style.transform = "translate3d(20px," + (ay - ANCHOR_SIZE / 2).toFixed(1) + "px,0)";
      const far = Math.max(Math.hypot(ox, oy), Math.hypot(ox, oy - ch), Math.hypot(ox - cw, oy), Math.hypot(ox - cw, oy - ch));
      radius = (far * 1.05) / (1 - NOISE_AMP);
    }
    function tick(ms: number): void {
      if (demo) {
        const t = ms % CYCLE_MS;
        want = t >= 250 && t < 1750;
      }
      const dp = 1000 / 60 / BLOOM_MS;
      p = clamp(p + (want ? dp : -dp), 0, 1);
    }
    function snap(): void {
      p = want ? 1 : 0;
    }
    function render(): void {
      layout();
      const e = 1 - Math.pow(1 - p, 3);
      const r = radius * e;
      const on = p > 0.004;
      card.style.visibility = on ? "visible" : "hidden";
      ring.style.visibility = on ? "visible" : "hidden";
      if (on) {
        card.style.clipPath = p >= 1 ? "none" : mask(r, 0);
        ring.style.clipPath = p >= 1 ? "none" : mask(r, RING);
        ring.style.opacity = p >= 1 ? "0" : "1";
      }
      if (want !== expanded) {
        expanded = want;
        anchor.setAttribute("aria-expanded", want ? "true" : "false");
      }
      say("r " + Math.round(r) + "  noise " + Math.round(NOISE_AMP * 100) + "%");
    }
    function toggle(): void {
      stopDemo();
      want = !want;
      sync();
    }
    on(anchor, "click", toggle);
    on(root, "keydown", (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !want) return;
      e.preventDefault();
      stopDemo();
      want = false;
      anchor.focus({ preventScroll: true });
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
        <i className={styles["pm__ring"]} data-r="ring"></i>
        <div className={styles["pm__card"]} data-r="card"><i className={styles["pm__sun"]}></i><i className={styles["pm__hill"]}></i><b className={styles["pm__ttl"]}>미리보기</b></div>
        <button className={styles["pm__anchor"]} data-r="anchor" type="button" aria-expanded="false" aria-label="이미지 미리보기 열기"></button>
      </div>
    </main>
  );
}
