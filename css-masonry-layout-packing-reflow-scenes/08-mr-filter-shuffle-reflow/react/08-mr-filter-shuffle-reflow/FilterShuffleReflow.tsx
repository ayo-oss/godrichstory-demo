// FilterShuffleReflow - vanilla 판(08-mr-filter-shuffle-reflow) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./FilterShuffleReflow.module.scss";

type Card = {
  el: HTMLElement; ratio: number; cat: number;
  x: number; y: number; w: number; h: number; tx: number; ty: number; tw: number; th: number;
  s: number; ds: number; o: number; dop: number; vx: number; vy: number;
  ox: number; oy: number; osx: number; osy: number; ovx: number; ovy: number; ovsx: number; ovsy: number;
  fx: number; fy: number; fs: number; fo: number; t0: number; sq: number; rest: number; wait: number;
};

export default function FilterShuffleReflow() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    const CLS = { card: styles["mr__card"] };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let raf: number = 0;
    let last: number = -1;
    let ready = false;
    const offs: Array<() => void> = [];
    function q(sel: string): HTMLElement {
        return root.querySelector(sel) as HTMLElement;
    }
    const wall = q("[data-r=wall]");
    const live = q("[data-r=live]");
    function clamp(v: number, lo: number, hi: number): number {
        return Math.max(lo, Math.min(hi, v));
    }
    function makeRng(seed: number): () => number {
        let s = seed >>> 0;
        return function (): number {
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }
    function on(el: EventTarget, type: string, fn: (e: any) => void): void {
        el.addEventListener(type, fn);
        offs.push(function (): void {
            el.removeEventListener(type, fn);
        });
    }
    function stopDemo(): void {
        if (!demo) return;
        demo = false;
        root.removeAttribute("data-demo");
        root.classList.remove("is-demo");
        live.setAttribute("aria-live", "polite");
    }
    if (reduce) live.setAttribute("aria-live", "polite");
    // 카드: 시드 LCG 로 비율을 뽑는다. 이미지 파일은 없고 그라디언트와 번호만 있다.
    function makeCards(n: number, seed: number, lo: number, hi: number): Card[] {
        const rng = makeRng(seed);
        const list: Card[] = [];
        for (let i = 0; i < n; i += 1) {
            const el = document.createElement("div");
            el.className = CLS.card;
            el.setAttribute("data-c", String(i % 6));
            el.innerHTML = "<i>" + (i + 1) + "</i>";
            wall.appendChild(el);
            list.push({
                el: el, ratio: lo + rng() * (hi - lo), cat: Math.floor(rng() * 3),
                x: 0, y: 0, w: 0, h: 0, tx: 0, ty: 0, tw: 0, th: 0,
                s: 1, ds: 1, o: 1, dop: 1, vx: 0, vy: 0,
                ox: 0, oy: 0, osx: 0, osy: 0, ovx: 0, ovy: 0, ovsx: 0, ovsy: 0,
                fx: 0, fy: 0, fs: 1, fo: 1, t0: 0, sq: 0, rest: 0, wait: 0
            });
        }
        return list;
    }
    function colW(cols: number, gap: number): number {
        return (wall.clientWidth - gap * (cols - 1)) / cols;
    }
    // 최단 열 배치: 카드를 순서대로 읽으며 지금 가장 낮은 열 끝에 얹고 그 열 높이에 카드 높이와 간격을 더한다.
    function pack(hs: number[], cols: number, cw: number, gap: number): Array<{ x: number; y: number }> {
        const colH: number[] = [];
        for (let k = 0; k < cols; k += 1) colH.push(0);
        const out: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < hs.length; i += 1) {
            let best = 0;
            for (let k = 1; k < cols; k += 1) {
                if (colH[k] < colH[best] - 0.5) best = k;
            }
            out.push({ x: best * (cw + gap), y: colH[best] });
            colH[best] += hs[i] + gap;
        }
        return out;
    }
    function put(c: Card, x: number, y: number, sx: number, sy: number): void {
        const st = c.el.style;
        st.width = c.w.toFixed(1) + "px";
        st.height = c.h.toFixed(1) + "px";
        st.transform = "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0) scale(" + sx.toFixed(3) + "," + sy.toFixed(3) + ")";
    }
    function frame(ts: number): void {
        const dt = last < 0 ? 0.016 : Math.min(0.05, (ts - last) / 1000);
        last = ts;
        if (demo) script(ts);
        step(dt, ts);
        render();
        raf = requestAnimationFrame(frame);
    }
    const ro = new ResizeObserver(function (): void {
        relayout();
    });
    ro.observe(root);

    // 기법: 걸러진 카드만 다시 최단 열 배치로 새 자리를 구하고, 카드마다 출발을 순번 × STAGGER 만큼 늦춰 같은 이징으로 옮긴다.
    const STAGGER = 36;
    const DURATION = 440;
    const EASE_POWER = 3;
    const COLUMNS = 4;
    const GAP = 8;
    const SEED = 25;
    const COUNT = 12;
    const cards = makeCards(COUNT, SEED, 0.3, 0.66);
    const buttons = [q("[data-r=f0]"), q("[data-r=f1]"), q("[data-r=f2]"), q("[data-r=f3]")];
    const countEl = q("[data-r=count]");
    let filter = 0;
    function easeOut(p: number): number {
        return 1 - Math.pow(1 - p, EASE_POWER);
    }
    function visible(c: Card): boolean {
        return filter === 0 || c.cat === filter - 1;
    }
    for (let i = 0; i < cards.length; i += 1) cards[i].el.setAttribute("data-c", String(cards[i].cat));
    function aim(now: number, fresh: boolean): void {
        const cw = colW(COLUMNS, GAP);
        const list = cards.filter(visible);
        const at = pack(list.map(function (c: Card): number {
            return c.ratio * cw;
        }), COLUMNS, cw, GAP);
        let rank = 0;
        for (let i = 0; i < cards.length; i += 1) {
            const c = cards[i];
            c.fx = c.x;
            c.fy = c.y;
            c.fs = c.s;
            c.fo = c.o;
            c.w = cw;
            c.h = c.ratio * cw;
            if (visible(c)) {
                c.tx = at[rank].x;
                c.ty = at[rank].y;
                c.ds = 1;
                c.dop = 1;
                c.t0 = now + rank * STAGGER;
                rank += 1;
            } else {
                c.ds = 0.5;
                c.dop = 0;
                c.t0 = now;
            }
            if (fresh) {
                c.x = c.tx;
                c.y = c.ty;
                c.s = c.ds;
                c.o = c.dop;
                c.t0 = -1e9;
            }
        }
        countEl.textContent = String(list.length);
    }
    function setFilter(f: number, now: number): void {
        if (f === filter && ready) return;
        filter = f;
        for (let i = 0; i < 4; i += 1) buttons[i].setAttribute("aria-pressed", i === f ? "true" : "false");
        aim(now, reduce);
        if (reduce) render();
    }
    function relayout(): void {
        aim(performance.now(), !ready || reduce);
        ready = true;
        if (reduce) render();
    }
    function script(ts: number): void {
        const ph = ts % 2000;
        setFilter(ph < 300 ? 0 : ph < 800 ? 1 : ph < 1300 ? 2 : ph < 1800 ? 3 : 0, ts);
    }
    function step(dt: number, ts: number): void {
        for (let i = 0; i < cards.length; i += 1) {
            const c = cards[i];
            const e = easeOut(clamp((ts - c.t0) / DURATION, 0, 1));
            c.x = c.fx + (c.tx - c.fx) * e;
            c.y = c.fy + (c.ty - c.fy) * e;
            c.s = c.fs + (c.ds - c.fs) * e;
            c.o = c.fo + (c.dop - c.fo) * e;
        }
    }
    function render(): void {
        for (let i = 0; i < cards.length; i += 1) {
            const c = cards[i];
            c.el.style.opacity = c.o.toFixed(2);
            put(c, c.x, c.y, c.s, c.s);
        }
    }
    for (let i = 0; i < 4; i += 1) {
        on(buttons[i], "click", function (): void {
            stopDemo();
            setFilter(i, performance.now());
        });
    }
    buttons[0].setAttribute("aria-pressed", "true");

    relayout();
    if (reduce) {
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
    <div ref={rootRef} className={styles["mr"] + " is-demo"} data-demo="1">
      <div className={styles["mr__bar"]}>
        <div className={styles["mr__btns"]}><button className={styles["mr__btn"]} type="button" data-r="f0" aria-pressed="true">전체</button><button className={styles["mr__btn"]} type="button" data-r="f1" aria-pressed="false">분홍</button><button className={styles["mr__btn"]} type="button" data-r="f2" aria-pressed="false">민트</button><button className={styles["mr__btn"]} type="button" data-r="f3" aria-pressed="false">하늘</button></div>
        <p className={styles["mr__live"]} data-r="live" aria-live="off" aria-atomic="true"><span className={styles["mr__k"]}>카드</span> <b data-r="count">12</b></p>
      </div>
      <div className={styles["mr__wall"]} data-r="wall"></div>
    </div>
    </main>
  );
}
