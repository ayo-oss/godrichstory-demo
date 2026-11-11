// SevenSegmentPhosphorGlow - vanilla 판(08-cd-seven-segment-phosphor-glow) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./SevenSegmentPhosphorGlow.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function SevenSegmentPhosphorGlow() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    const reduce: boolean = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo: boolean = !reduce;
    let running: boolean = demo;
    let elapsed = 0;
    let lastTs = -1;
    let lastDraw = -1e9;
    let raf = 0;
    const hooks: { stop: () => void } = { stop: () => {} };
    const offs: Array<() => void> = [];
    const COUNT_FROM = 12;
    const DEMO_SECOND_MS = 150;
    const SECOND_MS = 1000;
    const HOLD_MS = 300;
    const SEG_ON = 1;
    const DECAY = 0.84;
    const OVERDRIVE = 1.45;
    const GLOW_PX = 5;
    let secondMs = demo ? DEMO_SECOND_MS : SECOND_MS;
    let totalMs = COUNT_FROM * secondMs;
    function q<T extends Element>(sel: string): T {
        return root.querySelector(sel) as T;
    }
    function on(el: EventTarget, type: string, fn: (e: Event) => void): void {
        el.addEventListener(type, fn);
        offs.push(() => el.removeEventListener(type, fn));
    }
    function clamp(v: number, lo: number, hi: number): number {
        return Math.max(lo, Math.min(hi, v));
    }
    // 지수 접근: 프레임률이 달라도 같은 속도가 되도록 dt 를 60fps 프레임 수로 환산해 쓴다
    function approach(x: number, target: number, per: number, dt: number): number {
        return x + (target - x) * (1 - Math.pow(1 - per, dt * 60));
    }
    const toggle = q<HTMLButtonElement>('[data-r="toggle"]');
    const resetBtn = q<HTMLButtonElement>('[data-r="reset"]');
    const status = q<HTMLElement>('[data-r="status"]');
    // 남은 시간. 경과는 rAF 타임스탬프 차이를 누적한 값이라 시계를 따로 읽지 않는다
    function remainMs(): number {
        return clamp(totalMs - elapsed, 0, totalMs);
    }
    function syncButtons(): void {
        toggle.textContent = running ? "멈춤" : "시작";
        toggle.setAttribute("aria-pressed", running ? "true" : "false");
    }
    // 스크린리더 안내는 멈출 때와 끝날 때만 갱신한다. 시연 루프 중에는 읽지 않는다
    function say(msg: string): void {
        if (!demo) status.textContent = msg;
    }
    function stopDemo(): void {
        if (!demo) return;
        demo = false;
        root.classList.remove("is-demo");
        root.removeAttribute("data-demo");
        hooks.stop();
    }
    function restart(): void {
        elapsed = 0;
        resetState();
    }
    function update(dt: number): void {
        tick(dt);
        draw();
    }
    function frame(ts: number): void {
        raf = requestAnimationFrame(frame);
        const raw = lastTs < 0 ? 0 : ts - lastTs;
        lastTs = ts;
        if (running) {
            elapsed += raw;
            if (demo) {
                const cycle = totalMs + HOLD_MS;
                if (elapsed >= cycle) {
                    elapsed %= cycle;
                    resetState();
                }
            } else if (elapsed >= totalMs) {
                elapsed = totalMs;
                running = false;
                say("시간이 다 됐습니다");
                syncButtons();
            }
        }
        if (reduce && ts - lastDraw < 250) return;
        lastDraw = ts;
        update(Math.min(raw, 50) / 1000);
    }
    on(toggle, "click", () => {
        stopDemo();
        if (!running && elapsed >= totalMs) restart();
        running = !running;
        say(running ? "" : "멈췄습니다");
        syncButtons();
        update(0);
    });
    on(resetBtn, "click", () => {
        stopDemo();
        running = false;
        restart();
        say("");
        syncButtons();
        update(0);
    });
    type Seg = { glow: SVGPolygonElement; lit: SVGPolygonElement; hot: SVGPolygonElement; b: number; on: boolean };
    const SVG_NS = "http://www.w3.org/2000/svg";
    const digitsEl = q<HTMLElement>('[data-r="digits"]');
    // 세그먼트 a b c d e f g 가 켜지는 숫자 0 부터 9
    const MASKS: string[] = ["abcdef", "bc", "abdeg", "abcdg", "bcfg", "acdfg", "acdefg", "abc", "abcdefg", "abcdfg"];
    const NAMES = "abcdefg";
    // 육각형 하나: 가운데 (cx, cy), 긴 쪽 반길이 L, 반두께 h
    function hexPts(cx: number, cy: number, L: number, h: number, horizontal: boolean): string {
        const p: number[][] = [[-L, 0], [-L + h, -h], [L - h, -h], [L, 0], [L - h, h], [-L + h, h]];
        return p
            .map((v) => (horizontal ? [cx + v[0], cy + v[1]] : [cx + v[1], cy + v[0]]))
            .map((v) => v[0].toFixed(1) + "," + v[1].toFixed(1))
            .join(" ");
    }
    const GEO: Array<[number, number, boolean]> = [
        [20, 6, true], [34, 20.5, false], [34, 49.5, false], [20, 64, true], [6, 49.5, false], [6, 20.5, false], [20, 35, true],
    ];
    function poly(cls: string, pts: string, parent: SVGElement, filter?: string): SVGPolygonElement {
        const el = document.createElementNS(SVG_NS, "polygon") as SVGPolygonElement;
        el.setAttribute("class", cls);
        el.setAttribute("points", pts);
        if (filter) el.setAttribute("filter", filter);
        parent.appendChild(el);
        return el;
    }
    const digits: Seg[][] = [];
    const blurs: SVGElement[] = [];
    for (let d = 0; d < 2; d++) {
        const svg = document.createElementNS(SVG_NS, "svg") as SVGElement;
        svg.setAttribute("class", cx("cd__digit"));
        svg.setAttribute("viewBox", "-6 -6 52 82");
        svg.setAttribute("aria-hidden", "true");
        const defs = document.createElementNS(SVG_NS, "defs");
        const flt = document.createElementNS(SVG_NS, "filter");
        flt.setAttribute("id", "cd-glow-" + d);
        flt.setAttribute("x", "-50%");
        flt.setAttribute("y", "-50%");
        flt.setAttribute("width", "200%");
        flt.setAttribute("height", "200%");
        const bl = document.createElementNS(SVG_NS, "feGaussianBlur") as SVGElement;
        bl.setAttribute("stdDeviation", String(GLOW_PX));
        flt.appendChild(bl);
        defs.appendChild(flt);
        svg.appendChild(defs);
        blurs.push(bl);
        const segs: Seg[] = [];
        GEO.forEach((gm) => {
            const pts = hexPts(gm[0], gm[1], 12.4, 3.4, gm[2]);
            poly(cx("cd__ghost"), pts, svg);
            const glow = poly(cx("cd__glow"), pts, svg, "url(#cd-glow-" + d + ")");
            const lit = poly(cx("cd__lit"), pts, svg);
            const hot = poly(cx("cd__hot"), pts, svg);
            segs.push({ glow, lit, hot, b: 0, on: false });
        });
        digits.push(segs);
        digitsEl.appendChild(svg);
    }
    function shownCount(): number {
        return Math.ceil(remainMs() / secondMs - 1e-6);
    }
    function wanted(): number[] {
        const n = shownCount();
        return [Math.floor(n / 10), n % 10];
    }
    function resize(): void {}
    function resetState(): void {
        digits.forEach((segs) =>
            segs.forEach((s) => {
                s.b = 0;
                s.on = false;
            })
        );
    }
    hooks.stop = () => {
        elapsed *= SECOND_MS / secondMs;
        secondMs = SECOND_MS;
        totalMs = COUNT_FROM * secondMs;
    };
    // 밝기 b: 켜지는 순간 OVERDRIVE 로 치솟았다 SEG_ON 으로 내려앉고, 꺼지면 매 프레임 DECAY 배로 줄어든다
    function tick(dt: number): void {
        const w = wanted();
        digits.forEach((segs, d) => {
            const mask = MASKS[w[d]];
            segs.forEach((s, k) => {
                const on = mask.indexOf(NAMES.charAt(k)) >= 0;
                if (reduce) {
                    s.b = on ? SEG_ON : 0;
                } else if (on) {
                    if (!s.on) s.b = OVERDRIVE;
                    s.b = approach(s.b, SEG_ON, 0.16, dt);
                } else {
                    s.b *= Math.pow(DECAY, dt * 60);
                    if (s.b < 0.004) s.b = 0;
                }
                s.on = on;
            });
        });
    }
    function draw(): void {
        let total = 0;
        digits.forEach((segs) =>
            segs.forEach((s) => {
                total += clamp(s.b, 0, 1.4);
                const lit = clamp(s.b, 0, 1);
                s.lit.style.opacity = lit.toFixed(3);
                s.glow.style.opacity = (lit * 0.85).toFixed(3);
                s.hot.style.opacity = clamp((s.b - 1) / (OVERDRIVE - 1), 0, 1).toFixed(3);
            })
        );
        // 켜진 밝기의 합이 판 전체에 번지는 후광이 된다 (칸 14 개 기준 0 ~ 1)
        const k = clamp(total / 14, 0, 1);
        digitsEl.style.boxShadow = "inset 0 0 0 2px rgba(255,247,230,.12), 0 0 " + (10 + 50 * k).toFixed(1) + "px " + (2 + 20 * k).toFixed(1) + "px rgba(76,212,166," + (0.1 + 0.45 * k).toFixed(3) + ")";
    }
    const ro = new ResizeObserver(() => {
        resize();
        draw();
    });
    ro.observe(root);
    offs.push(() => ro.disconnect());
    resize();
    resetState();
    syncButtons();
    update(0);
    raf = requestAnimationFrame(frame);
    return () => {
        cancelAnimationFrame(raf);
        offs.forEach((f) => f());
    };
  }, []);

  return (
    <div className={cx("cd") + " is-demo"} id="cd" data-demo="1" ref={rootRef}>
      <div className={cx("cd__view cd__view--seg")}>
      <div className={cx("cd__digits")} data-r="digits" role="timer" aria-label="남은 시간 일곱 세그먼트"></div>
      </div>
      <div className={cx("cd__bar")}>
        <button className={cx("cd__btn")} type="button" data-r="toggle">멈춤</button>
        <button className={cx("cd__btn")} type="button" data-r="reset">다시</button>
      </div>
      <p className={cx("cd__sr")} aria-live="polite" data-r="status"></p>
    </div>
  );
}
