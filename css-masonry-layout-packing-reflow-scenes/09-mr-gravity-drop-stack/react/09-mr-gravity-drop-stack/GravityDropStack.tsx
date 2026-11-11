// GravityDropStack - vanilla 판(09-mr-gravity-drop-stack) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./GravityDropStack.module.scss";

type Card = {
  el: HTMLElement; ratio: number; cat: number;
  x: number; y: number; w: number; h: number; tx: number; ty: number; tw: number; th: number;
  s: number; ds: number; o: number; dop: number; vx: number; vy: number;
  ox: number; oy: number; osx: number; osy: number; ovx: number; ovy: number; ovsx: number; ovsy: number;
  fx: number; fy: number; fs: number; fo: number; t0: number; sq: number; rest: number; wait: number;
};

export default function GravityDropStack() {
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

    // 기법: 카드마다 중력 가속으로 떨어지다가 목표 높이에 닿으면 속도를 -BOUNCE 배로 뒤집고, 닿는 속도에 비례해 세로로 눌렸다가 펴진다.
    const GRAVITY = 2600;
    const BOUNCE = 0.32;
    const SQUASH = 0.8;
    const DROP_DELAY = 140;
    const COLUMNS = 3;
    const GAP = 8;
    const COUNT = 9;
    const cards = makeCards(COUNT, 21, 0.22, 0.48);
    const restEl = q("[data-r=rest]");
    let seed = 21;
    let startAt = -1;
    let restNow = -1;
    function reset(now: number): void {
        startAt = now;
        for (let i = 0; i < cards.length; i += 1) {
            const c = cards[i];
            c.y = -c.h - 24;
            c.x = c.tx;
            c.vy = 0;
            c.sq = 0;
            c.rest = 0;
        }
        showRest();
    }
    function showRest(): void {
        let n = 0;
        for (let i = 0; i < cards.length; i += 1) n += cards[i].rest;
        const shown = n === cards.length ? n : 0;
        if (shown !== restNow) {
            restNow = shown;
            restEl.textContent = String(shown);
        }
    }
    function reroll(): void {
        seed += 1;
        const rng = makeRng(seed);
        for (let i = 0; i < cards.length; i += 1) cards[i].ratio = 0.22 + rng() * 0.26;
        relayout();
    }
    function relayout(): void {
        const cw = colW(COLUMNS, GAP);
        const hs = cards.map(function (c: Card): number {
            return c.ratio * cw;
        });
        const at = pack(hs, COLUMNS, cw, GAP);
        for (let i = 0; i < cards.length; i += 1) {
            const c = cards[i];
            c.w = cw;
            c.h = hs[i];
            c.tx = at[i].x;
            c.ty = at[i].y;
            c.x = c.tx;
            if (c.rest === 1 || reduce) {
                c.y = c.ty;
                c.rest = 1;
            }
        }
        if (!ready) {
            if (reduce) {
                for (let i = 0; i < cards.length; i += 1) cards[i].rest = 1;
            } else {
                reset(performance.now());
            }
        }
        ready = true;
        showRest();
        if (reduce) render();
    }
    function script(ts: number): void {
        const base = Math.floor(ts / 2000) * 2000 + 100;
        if (base !== startAt) reset(base);
    }
    function step(dt: number, ts: number): void {
        const n = Math.max(1, Math.ceil(dt / (1 / 120)));
        const h = dt / n;
        for (let s = 0; s < n; s += 1) {
            for (let i = 0; i < cards.length; i += 1) {
                const c = cards[i];
                c.sq *= Math.exp(-14 * h);
                if (c.rest === 1 || ts - startAt < i * DROP_DELAY) continue;
                c.vy += GRAVITY * h;
                c.y += c.vy * h;
                if (c.y >= c.ty) {
                    const hit = c.vy;
                    c.y = c.ty;
                    if (hit > 90) {
                        c.vy = -hit * BOUNCE;
                        c.sq = Math.max(c.sq, Math.min(0.3, (SQUASH * hit) / 4200));
                    } else {
                        c.vy = 0;
                        c.rest = 1;
                    }
                }
            }
        }
        showRest();
    }
    function render(): void {
        for (let i = 0; i < cards.length; i += 1) {
            const c = cards[i];
            put(c, c.x, c.y, 1 + c.sq * 0.45, 1 - c.sq);
        }
    }
    on(q("[data-r=again]"), "click", function (): void {
        stopDemo();
        reroll();
        if (!reduce) reset(performance.now());
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
        <div className={styles["mr__btns"]}><button className={styles["mr__btn"]} type="button" data-r="again">섞어서 다시</button></div>
        <p className={styles["mr__live"]} data-r="live" aria-live="off" aria-atomic="true"><span className={styles["mr__k"]}>쌓인 카드</span> <b data-r="rest">0</b></p>
      </div>
      <div className={styles["mr__wall"]} data-r="wall"></div>
    </div>
    </main>
  );
}
