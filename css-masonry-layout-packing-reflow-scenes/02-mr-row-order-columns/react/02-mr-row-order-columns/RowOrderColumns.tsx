// RowOrderColumns - vanilla 판(02-mr-row-order-columns) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./RowOrderColumns.module.scss";

type Card = {
  el: HTMLElement; ratio: number; cat: number;
  x: number; y: number; w: number; h: number; tx: number; ty: number; tw: number; th: number;
  s: number; ds: number; o: number; dop: number; vx: number; vy: number;
  ox: number; oy: number; osx: number; osy: number; ovx: number; ovy: number; ovsx: number; ovsy: number;
  fx: number; fy: number; fs: number; fo: number; t0: number; sq: number; rest: number; wait: number;
};

export default function RowOrderColumns() {
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

    // 기법: 열을 정하는 규칙만 바꾼다. 세로 채움은 번호 ÷ 열당 장수, 가로 순서는 번호 % 열 수, 균형은 가로 순서로 가다가 열이 너무 높으면 가장 낮은 열로 보낸다.
    const COLUMNS = 3;
    const GAP = 8;
    const BALANCE = 0.3;
    const FOLLOW = 10;
    const SEED = 16;
    const COUNT = 9;
    const cards = makeCards(COUNT, SEED, 0.22, 0.5);
    const modeBtns = [q("[data-r=m0]"), q("[data-r=m1]"), q("[data-r=m2]")];
    const spreadEl = q("[data-r=spread]");
    let mode = 0;
    function setMode(m: number): void {
        if (m === mode && ready) return;
        mode = m;
        for (let i = 0; i < 3; i += 1) modeBtns[i].setAttribute("aria-pressed", i === m ? "true" : "false");
        relayout();
    }
    function relayout(): void {
        const cw = colW(COLUMNS, GAP);
        const colH: number[] = [];
        for (let k = 0; k < COLUMNS; k += 1) colH.push(0);
        const perCol = Math.ceil(cards.length / COLUMNS);
        for (let i = 0; i < cards.length; i += 1) {
            const c = cards[i];
            const h = c.ratio * cw;
            let col = i % COLUMNS;
            if (mode === 0) {
                col = Math.min(COLUMNS - 1, Math.floor(i / perCol));
            } else if (mode === 2) {
                let low = 0;
                for (let k = 1; k < COLUMNS; k += 1) {
                    if (colH[k] < colH[low]) low = k;
                }
                if (colH[col] - colH[low] > BALANCE * h) col = low;
            }
            c.w = cw;
            c.h = h;
            c.tx = col * (cw + GAP);
            c.ty = colH[col];
            colH[col] += h + GAP;
            if (!ready || reduce) {
                c.x = c.tx;
                c.y = c.ty;
            }
        }
        spreadEl.textContent = String(Math.round(Math.max.apply(null, colH) - Math.min.apply(null, colH)));
        ready = true;
        if (reduce) render();
    }
    function script(ts: number): void {
        setMode(Math.floor((ts % 2100) / 700));
    }
    function step(dt: number, ts: number): void {
        const k = 1 - Math.exp(-FOLLOW * dt);
        for (let i = 0; i < cards.length; i += 1) {
            cards[i].x += (cards[i].tx - cards[i].x) * k;
            cards[i].y += (cards[i].ty - cards[i].y) * k;
        }
    }
    function render(): void {
        for (let i = 0; i < cards.length; i += 1) put(cards[i], cards[i].x, cards[i].y, 1, 1);
    }
    for (let i = 0; i < 3; i += 1) {
        on(modeBtns[i], "click", function (): void {
            stopDemo();
            setMode(i);
        });
    }
    modeBtns[0].setAttribute("aria-pressed", "true");

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
        <div className={styles["mr__btns"]}><button className={styles["mr__btn"]} type="button" data-r="m0" aria-pressed="true">세로 채움</button><button className={styles["mr__btn"]} type="button" data-r="m1" aria-pressed="false">가로 순서</button><button className={styles["mr__btn"]} type="button" data-r="m2" aria-pressed="false">균형</button></div>
        <p className={styles["mr__live"]} data-r="live" aria-live="off" aria-atomic="true"><span className={styles["mr__k"]}>끝 차이</span> <b data-r="spread">0</b>px</p>
      </div>
      <div className={styles["mr__wall"]} data-r="wall"></div>
    </div>
    </main>
  );
}
