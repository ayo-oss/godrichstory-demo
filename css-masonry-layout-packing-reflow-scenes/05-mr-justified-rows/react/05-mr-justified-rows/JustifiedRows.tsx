// JustifiedRows - vanilla 판(05-mr-justified-rows) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./JustifiedRows.module.scss";

type Card = {
  el: HTMLElement; ratio: number; cat: number;
  x: number; y: number; w: number; h: number; tx: number; ty: number; tw: number; th: number;
  s: number; ds: number; o: number; dop: number; vx: number; vy: number;
  ox: number; oy: number; osx: number; osy: number; ovx: number; ovy: number; ovsx: number; ovsy: number;
  fx: number; fy: number; fs: number; fo: number; t0: number; sq: number; rest: number; wait: number;
};

export default function JustifiedRows() {
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

    // 기법: 목표 높이에서 가로세로 비율을 더해 가다가 줄 너비를 넘으면 끊고, 그 줄을 (남는 너비 ÷ 비율 합)배 해서 오른쪽 끝을 맞춘다.
    const TARGET_H = 44;
    const GAP = 4;
    const MAX_STRETCH = 0.35;
    const LERP = 0.2;
    const SEED = 17;
    const COUNT = 14;
    const cards = makeCards(COUNT, SEED, 0.7, 1.6);
    const rowsEl = q("[data-r=rows]");
    let th = TARGET_H;
    let want = TARGET_H;
    let laidH = -1;
    let rowsNow = 0;
    function layout(): void {
        const width = wall.clientWidth;
        let i = 0;
        let y = 0;
        let rows = 0;
        while (i < cards.length) {
            const from = i;
            let sum = 0;
            while (i < cards.length) {
                sum += cards[i].ratio;
                i += 1;
                if (sum * th + GAP * (i - from - 1) >= width) break;
            }
            const n = i - from;
            let s = (width - GAP * (n - 1)) / (sum * th);
            // 마지막 줄이 너무 짧으면 늘리지 않고 목표 높이를 지킨다.
            if (s > 1 + MAX_STRETCH) s = 1;
            const rowH = th * s;
            let x = 0;
            for (let j = from; j < i; j += 1) {
                const c = cards[j];
                c.w = cards[j].ratio * rowH;
                c.h = rowH;
                c.x = x;
                c.y = y;
                x += c.w + GAP;
            }
            y += rowH + GAP;
            rows += 1;
        }
        laidH = th;
        if (rows !== rowsNow) {
            rowsNow = rows;
            rowsEl.textContent = String(rows);
        }
    }
    function relayout(): void {
        layout();
        ready = true;
        if (reduce) render();
    }
    function script(ts: number): void {
        th = 44 + 22 * (0.5 - 0.5 * Math.cos((ts % 2000) / 2000 * Math.PI * 2));
        want = th;
    }
    function step(dt: number, ts: number): void {
        if (!demo) th += (want - th) * (1 - Math.pow(1 - LERP, dt * 60));
        if (Math.abs(th - laidH) > 0.01) layout();
    }
    function render(): void {
        for (let i = 0; i < cards.length; i += 1) put(cards[i], cards[i].x, cards[i].y, 1, 1);
    }
    function nudge(d: number): void {
        stopDemo();
        want = clamp(want + d, 32, 72);
        if (reduce) {
            th = want;
            relayout();
        }
    }
    on(q("[data-r=less]"), "click", function (): void {
        nudge(-8);
    });
    on(q("[data-r=more]"), "click", function (): void {
        nudge(8);
    });

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
        <div className={styles["mr__btns"]}><button className={styles["mr__btn"]} type="button" data-r="less" aria-label="줄 높이 낮추기">−</button><button className={styles["mr__btn"]} type="button" data-r="more" aria-label="줄 높이 높이기">+</button></div>
        <p className={styles["mr__live"]} data-r="live" aria-live="off" aria-atomic="true"><span className={styles["mr__k"]}>줄</span> <b data-r="rows">3</b></p>
      </div>
      <div className={styles["mr__wall"]} data-r="wall"><i className={styles["mr__edge"]}></i></div>
    </div>
    </main>
  );
}
