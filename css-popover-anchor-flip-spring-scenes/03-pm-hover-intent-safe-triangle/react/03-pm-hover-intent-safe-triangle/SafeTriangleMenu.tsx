// SafeTriangleMenu - vanilla 판(03-pm-hover-intent-safe-triangle) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./SafeTriangleMenu.module.scss";

export default function SafeTriangleMenu() {
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

    // 기법: 포인터가 떠나는 순간의 위치를 꼭짓점으로 삼고 팝오버 왼쪽 두 모서리를 밑변으로 하는 삼각형을 그린다. 그 안을 SPEED_MIN 이상으로 팝오버 쪽으로 지나는 동안엔 다른 항목에 닿아도 닫지 않는다.
    const INTENT_MS = 260;
    const TRIANGLE_PAD = 10;
    const SPEED_MIN = 60;
    const GRACE = 140;
    const MENU_X = 12;
    const MENU_W = 112;
    const MENU_TOP = 34;
    const ITEM_H = 36;
    const ITEM_GAP = 4;
    const PANEL_X = 132;
    const PANEL_H = 132;
    const TRAIL = 6;
    const CYCLE_MS = 3200;
    const items = Array.from(root.querySelectorAll("[data-r=item]")) as HTMLElement[];
    const subs = Array.from(root.querySelectorAll("[data-r=sub]")) as HTMLElement[];
    const tri = q<HTMLElement>("[data-r=tri]");
    const cur = q<HTMLElement>("[data-r=cur]");
    const trail: number[][] = [];
    const vis = [0, 0, 0];
    let mx = MENU_X + MENU_W / 2;
    let my = MENU_TOP + ITEM_H / 2;
    let openIdx = 0;
    let since = -1;
    let leftAt = -1;
    let inTri = false;
    let spd = 0;
    let lastOpen = -2;

    function itemY(i: number): number {
      return MENU_TOP + i * (ITEM_H + ITEM_GAP);
    }
    function panelTop(i: number): number {
      return clamp(itemY(i), MENU_TOP - 4, root.clientHeight - 8 - PANEL_H);
    }
    function panelW(): number {
      return Math.min(150, root.clientWidth - PANEL_X - 8);
    }
    function hitItem(x: number, y: number): number {
      if (x < MENU_X || x > MENU_X + MENU_W) return -1;
      for (let i = 0; i < 3; i += 1) {
        if (y >= itemY(i) && y < itemY(i) + ITEM_H + ITEM_GAP) return i;
      }
      return -1;
    }
    function inPanel(x: number, y: number): boolean {
      if (openIdx < 0) return false;
      const t = panelTop(openIdx);
      return x >= PANEL_X && x <= PANEL_X + panelW() && y >= t && y <= t + PANEL_H;
    }
    function side(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
      return (px - bx) * (ay - by) - (ax - bx) * (py - by);
    }
    function inTriangle(px: number, py: number, a: number[], b: number[], c: number[]): boolean {
      const d1 = side(px, py, a[0], a[1], b[0], b[1]);
      const d2 = side(px, py, b[0], b[1], c[0], c[1]);
      const d3 = side(px, py, c[0], c[1], a[0], a[1]);
      const neg = d1 < 0 || d2 < 0 || d3 < 0;
      const pos = d1 > 0 || d2 > 0 || d3 > 0;
      return !(neg && pos);
    }
    function corners(): number[][] {
      const t = panelTop(Math.max(0, openIdx));
      return [[PANEL_X, t - TRIANGLE_PAD], [PANEL_X, t + PANEL_H + TRIANGLE_PAD]];
    }
    function script(ms: number): void {
      const t = ms % CYCLE_MS;
      const a = [MENU_X + MENU_W / 2, itemY(0) + ITEM_H / 2];
      const b = [PANEL_X + 40, panelTop(0) + 90];
      const c = [MENU_X + MENU_W / 2, itemY(2) + ITEM_H / 2];
      let p = a;
      let f = 0;
      if (t < 200) p = a;
      else if (t < 900) {
        f = seg(t, 200, 900);
        p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      } else if (t < 1200) p = b;
      else if (t < 1800) {
        f = seg(t, 1200, 1800);
        p = [b[0] + (c[0] - b[0]) * f, b[1] + (c[1] - b[1]) * f];
      } else if (t < 2400) p = c;
      else if (t < 3000) {
        f = seg(t, 2400, 3000);
        p = [c[0] + (a[0] - c[0]) * f, c[1] + (a[1] - c[1]) * f];
      }
      mx = p[0];
      my = p[1];
    }
    function tick(ms: number): void {
      if (demo) script(ms);
      trail.push([mx, my]);
      if (trail.length > TRAIL + 1) trail.shift();
      const old = trail[0];
      const dx = mx - old[0];
      const dy = my - old[1];
      spd = (Math.hypot(dx, dy) / (trail.length - 1 || 1)) * 60;
      const hover = hitItem(mx, my);
      const c = corners();
      inTri = spd >= SPEED_MIN && dx > 0 && inTriangle(mx, my, old, c[0], c[1]);
      if (hover >= 0 && hover !== openIdx) {
        if (inTri && openIdx >= 0) {
          if (since < 0) since = ms;
          if (ms - since > INTENT_MS) openIdx = hover;
        } else {
          openIdx = hover;
          since = -1;
        }
        leftAt = -1;
      } else if (hover === openIdx || inPanel(mx, my)) {
        since = -1;
        leftAt = -1;
      } else {
        since = -1;
        if (leftAt < 0) leftAt = ms;
        if (ms - leftAt > GRACE && hover < 0 && mx < MENU_X - 4) openIdx = -1;
      }
      for (let i = 0; i < 3; i += 1) vis[i] += ((i === openIdx ? 1 : 0) - vis[i]) * 0.3;
    }
    function snap(): void {
      for (let i = 0; i < 3; i += 1) vis[i] = i === openIdx ? 1 : 0;
      inTri = false;
    }
    function render(): void {
      const w = panelW();
      for (let i = 0; i < 3; i += 1) {
        subs[i].style.width = w + "px";
        subs[i].style.transform = "translate3d(" + (PANEL_X + (1 - vis[i]) * -10).toFixed(1) + "px," + panelTop(i).toFixed(1) + "px,0)";
        subs[i].style.opacity = vis[i].toFixed(2);
        subs[i].style.visibility = vis[i] > 0.02 ? "visible" : "hidden";
      }
      if (openIdx !== lastOpen) {
        lastOpen = openIdx;
        for (let i = 0; i < 3; i += 1) {
          items[i].setAttribute("aria-expanded", i === openIdx ? "true" : "false");
          if (i === openIdx) items[i].setAttribute("data-open", "1");
          else items[i].removeAttribute("data-open");
        }
      }
      const old = trail.length ? trail[0] : [mx, my];
      const c = corners();
      tri.style.clipPath = "polygon(" + old[0].toFixed(1) + "px " + old[1].toFixed(1) + "px," + c[0][0] + "px " + c[0][1].toFixed(1) + "px," + c[1][0] + "px " + c[1][1].toFixed(1) + "px)";
      tri.setAttribute("data-on", inTri ? "1" : "0");
      tri.style.visibility = openIdx >= 0 && mx < PANEL_X ? "visible" : "hidden";
      cur.style.transform = "translate3d(" + (mx - 7).toFixed(1) + "px," + (my - 7).toFixed(1) + "px,0)";
      say("speed " + Math.round(spd) + "  triangle " + (inTri ? "in" : "out") + "  open " + (openIdx + 1));
    }
    on(root, "pointermove", (e: PointerEvent) => {
      stopDemo();
      const p = local(e);
      mx = p.x;
      my = p.y;
      if (reduce && hitItem(mx, my) >= 0) openIdx = hitItem(mx, my);
      sync();
    });
    items.forEach((el, i) => {
      on(el, "focus", () => {
        stopDemo();
        openIdx = i;
        sync();
      });
    });
    on(root, "keydown", (e: KeyboardEvent) => {
      if (e.key !== "Escape" || openIdx < 0) return;
      e.preventDefault();
      stopDemo();
      openIdx = -1;
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
        <i className={styles["pm__tri"]} data-r="tri"></i>
        <div className={styles["pm__menu"]}><button className={styles["pm__item"]} data-r="item" type="button" aria-haspopup="true" aria-expanded="false">프로필</button><button className={styles["pm__item"]} data-r="item" type="button" aria-haspopup="true" aria-expanded="false">알림</button><button className={styles["pm__item"]} data-r="item" type="button" aria-haspopup="true" aria-expanded="false">보안</button></div>
        <div className={styles["pm__sub"]} data-r="sub"><b className={styles["pm__ttl"]}>프로필</b><span className={styles["pm__r"]}>열기</span><span className={styles["pm__r"]}>고정</span><span className={styles["pm__r"]}>삭제</span></div><div className={styles["pm__sub"]} data-r="sub"><b className={styles["pm__ttl"]}>알림</b><span className={styles["pm__r"]}>열기</span><span className={styles["pm__r"]}>고정</span><span className={styles["pm__r"]}>삭제</span></div><div className={styles["pm__sub"]} data-r="sub"><b className={styles["pm__ttl"]}>보안</b><span className={styles["pm__r"]}>열기</span><span className={styles["pm__r"]}>고정</span><span className={styles["pm__r"]}>삭제</span></div>
        <i className={styles["pm__cur"]} data-r="cur"></i>
      </div>
    </main>
  );
}
