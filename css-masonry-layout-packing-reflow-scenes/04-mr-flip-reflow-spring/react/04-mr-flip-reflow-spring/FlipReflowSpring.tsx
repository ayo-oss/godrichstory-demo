// FlipReflowSpring - vanilla 판(04-mr-flip-reflow-spring) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./FlipReflowSpring.module.scss";

type Card = {
  el: HTMLElement; ratio: number; cat: number;
  x: number; y: number; w: number; h: number; tx: number; ty: number; tw: number; th: number;
  s: number; ds: number; o: number; dop: number; vx: number; vy: number;
  ox: number; oy: number; osx: number; osy: number; ovx: number; ovy: number; ovsx: number; ovsy: number;
  fx: number; fy: number; fs: number; fo: number; t0: number; sq: number; rest: number; wait: number;
};

export default function FlipReflowSpring() {
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

    // 기법: FLIP. 새 자리를 먼저 계산하고(Last), 옛 자리와의 차이를 오프셋으로 되돌려 놓은(Invert) 뒤, 오프셋이 0 이 되도록 스프링을 푼다(Play).
    const STIFFNESS = 0.12;
    const DAMPING = 0.75;
    const STAGGER = 0.03;
    const GAP = 8;
    const AREA = 15000;
    const SEED = 13;
    const COUNT = 8;
    const SEQUENCE = [3, 4, 2];
    const cards = makeCards(COUNT, SEED, 0.3, 0.66);
    const colsEl = q("[data-r=cols]");
    let cols: number = 3;
    // 스프링 한 칸: 속도에 -강성 × 오프셋을 더하고 감쇠를 곱한 뒤 오프셋에 속도를 더한다. f 는 60fps 기준 프레임 수.
    function kick(o: number, v: number, f: number): number[] {
        const nv = (v - STIFFNESS * o * f) * Math.pow(DAMPING, f);
        return [o + nv * f, nv];
    }
    function setCols(n: number): void {
        if (n === cols && ready) return;
        cols = n;
        relayout();
    }
    function relayout(): void {
        const cw = colW(cols, GAP);
        const hs = cards.map(function (c: Card): number {
            return (c.ratio * AREA) / cw;
        });
        const at = pack(hs, cols, cw, GAP);
        for (let i = 0; i < cards.length; i += 1) {
            const c = cards[i];
            if (ready && !reduce) {
                // First: 지금 화면에 보이는 자리와 크기에서 새 자리와 크기를 뺀 값이 오프셋이 된다.
                c.ox = c.tx + c.ox - at[i].x;
                c.oy = c.ty + c.oy - at[i].y;
                c.osx = (c.tw * (1 + c.osx)) / cw - 1;
                c.osy = (c.th * (1 + c.osy)) / hs[i] - 1;
                c.wait = i * STAGGER;
            }
            c.tx = at[i].x;
            c.ty = at[i].y;
            c.tw = cw;
            c.th = hs[i];
            c.w = cw;
            c.h = hs[i];
            if (!ready || reduce) {
                c.ox = 0;
                c.oy = 0;
                c.osx = 0;
                c.osy = 0;
            }
        }
        ready = true;
        colsEl.textContent = String(cols);
        if (reduce) render();
    }
    function script(ts: number): void {
        setCols(SEQUENCE[Math.floor((ts % 2000) / 667)]);
    }
    function step(dt: number, ts: number): void {
        const f = dt * 60;
        for (let i = 0; i < cards.length; i += 1) {
            const c = cards[i];
            if (c.wait > 0) {
                c.wait -= dt;
                continue;
            }
            const a = kick(c.ox, c.ovx, f);
            const b = kick(c.oy, c.ovy, f);
            const d = kick(c.osx, c.ovsx, f);
            const e = kick(c.osy, c.ovsy, f);
            c.ox = a[0];
            c.ovx = a[1];
            c.oy = b[0];
            c.ovy = b[1];
            c.osx = d[0];
            c.ovsx = d[1];
            c.osy = e[0];
            c.ovsy = e[1];
        }
    }
    function render(): void {
        for (let i = 0; i < cards.length; i += 1) {
            const c = cards[i];
            put(c, c.tx + c.ox, c.ty + c.oy, 1 + c.osx, 1 + c.osy);
        }
    }
    on(q("[data-r=less]"), "click", function (): void {
        stopDemo();
        setCols(clamp(cols - 1, 2, 5));
    });
    on(q("[data-r=more]"), "click", function (): void {
        stopDemo();
        setCols(clamp(cols + 1, 2, 5));
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
        <div className={styles["mr__btns"]}><button className={styles["mr__btn"]} type="button" data-r="less" aria-label="열 줄이기">−</button><button className={styles["mr__btn"]} type="button" data-r="more" aria-label="열 늘리기">+</button></div>
        <p className={styles["mr__live"]} data-r="live" aria-live="off" aria-atomic="true"><span className={styles["mr__k"]}>열</span> <b data-r="cols">3</b></p>
      </div>
      <div className={styles["mr__wall"]} data-r="wall"></div>
    </div>
    </main>
  );
}
