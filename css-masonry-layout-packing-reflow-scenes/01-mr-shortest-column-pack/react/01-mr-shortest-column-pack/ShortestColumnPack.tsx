// ShortestColumnPack - vanilla 판(01-mr-shortest-column-pack) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./ShortestColumnPack.module.scss";

type Card = {
  el: HTMLElement; ratio: number; cat: number;
  x: number; y: number; w: number; h: number; tx: number; ty: number; tw: number; th: number;
  s: number; ds: number; o: number; dop: number; vx: number; vy: number;
  ox: number; oy: number; osx: number; osy: number; ovx: number; ovy: number; ovsx: number; ovsy: number;
  fx: number; fy: number; fs: number; fo: number; t0: number; sq: number; rest: number; wait: number;
};

export default function ShortestColumnPack() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    const CLS = { card: styles["mr__card"], mark: styles["mr__mark"] };
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

    // 기법: 카드를 한 장 놓을 때마다 지금 가장 낮은 열의 끝을 읽어 그 아래에 얹고, 그 열 높이에 카드 높이와 간격을 더한다.
    const COLUMNS = 3;
    const GAP = 8;
    const SETTLE = 12;
    const SEED = 7;
    const COUNT = 9;
    const cards = makeCards(COUNT, SEED, 0.22, 0.46);
    const colsEl = q("[data-r=cols]");
    const againBtn = q("[data-r=again]");
    const marks: HTMLElement[] = [];
    const level: number[] = [0, 0, 0, 0, 0, 0];
    const markY: number[] = [0, 0, 0, 0, 0, 0];
    let cols: number = COLUMNS;
    let shown = 0;
    let userT0 = 0;
    let cwNow = 0;
    for (let k = 0; k < 6; k += 1) {
        const m = document.createElement("i");
        m.className = CLS.mark;
        wall.appendChild(m);
        marks.push(m);
    }
    function levels(): void {
        for (let k = 0; k < 6; k += 1) level[k] = 0;
        for (let i = 0; i < shown; i += 1) {
            const k = Math.round(cards[i].tx / (cwNow + GAP));
            level[k] = Math.max(level[k], cards[i].ty + cards[i].th + GAP);
        }
    }
    function setShown(n: number): void {
        if (n === shown) return;
        for (let i = shown; i < n; i += 1) {
            cards[i].x = cards[i].tx;
            cards[i].y = cards[i].ty - 56;
            cards[i].o = reduce ? 1 : 0;
            if (reduce) cards[i].y = cards[i].ty;
        }
        shown = n;
        levels();
    }
    function relayout(): void {
        cwNow = colW(cols, GAP);
        const hs = cards.map(function (c: Card): number {
            return c.ratio * cwNow;
        });
        const at = pack(hs, cols, cwNow, GAP);
        for (let i = 0; i < cards.length; i += 1) {
            const c = cards[i];
            c.w = cwNow;
            c.h = hs[i];
            c.th = hs[i];
            c.tx = at[i].x;
            c.ty = at[i].y;
            if (!ready || reduce) {
                c.x = c.tx;
                c.y = c.ty;
            }
        }
        if (!ready) shown = reduce ? COUNT : 0;
        for (let k = 0; k < 6; k += 1) {
            marks[k].style.display = k < cols ? "" : "none";
            marks[k].style.width = cwNow.toFixed(1) + "px";
        }
        levels();
        ready = true;
        colsEl.textContent = String(cols);
        if (reduce) {
            for (let k = 0; k < 6; k += 1) markY[k] = level[k];
            render();
        }
    }
    function script(ts: number): void {
        setShown(clamp(Math.floor(((ts % 2000) - 200) / 170) + 1, 0, COUNT));
    }
    function step(dt: number, ts: number): void {
        if (!demo && userT0 > 0) setShown(clamp(Math.floor((ts - userT0) / 170) + 1, 0, COUNT));
        const k = 1 - Math.exp(-SETTLE * dt);
        for (let i = 0; i < cards.length; i += 1) {
            const c = cards[i];
            if (i < shown) {
                c.x += (c.tx - c.x) * k;
                c.y += (c.ty - c.y) * k;
                c.o += (1 - c.o) * Math.min(1, k * 1.6);
            } else {
                c.o = 0;
            }
        }
        for (let m = 0; m < 6; m += 1) markY[m] += (level[m] - markY[m]) * k;
    }
    function render(): void {
        for (let i = 0; i < cards.length; i += 1) {
            const c = cards[i];
            c.el.style.opacity = c.o.toFixed(2);
            put(c, c.x, c.y, 1, 1);
        }
        let low = 0;
        for (let m = 1; m < cols; m += 1) {
            if (level[m] < level[low] - 0.5) low = m;
        }
        for (let m = 0; m < 6; m += 1) {
            const y = Math.max(markY[m] - 6, 0);
            marks[m].style.transform = "translate3d(" + (m * (cwNow + GAP)).toFixed(1) + "px," + y.toFixed(1) + "px,0)";
            if (m === low) marks[m].setAttribute("data-low", "1");
            else marks[m].removeAttribute("data-low");
        }
    }
    function takeOver(): void {
        if (!demo) return;
        stopDemo();
        userT0 = 0;
        setShown(COUNT);
    }
    on(q("[data-r=less]"), "click", function (): void {
        takeOver();
        cols = clamp(cols - 1, 2, 5);
        relayout();
    });
    on(q("[data-r=more]"), "click", function (): void {
        takeOver();
        cols = clamp(cols + 1, 2, 5);
        relayout();
    });
    on(againBtn, "click", function (): void {
        stopDemo();
        setShown(0);
        userT0 = performance.now();
    });
    againBtn.hidden = reduce;

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
        <div className={styles["mr__btns"]}><button className={styles["mr__btn"]} type="button" data-r="less" aria-label="열 줄이기">−</button><button className={styles["mr__btn"]} type="button" data-r="more" aria-label="열 늘리기">+</button><button className={styles["mr__btn"]} type="button" data-r="again">다시 쌓기</button></div>
        <p className={styles["mr__live"]} data-r="live" aria-live="off" aria-atomic="true"><span className={styles["mr__k"]}>열</span> <b data-r="cols">3</b></p>
      </div>
      <div className={styles["mr__wall"]} data-r="wall"></div>
    </div>
    </main>
  );
}
