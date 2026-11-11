// LiquidTankSloshLevel - vanilla 판(07-cd-liquid-tank-slosh-level) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./LiquidTankSloshLevel.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function LiquidTankSloshLevel() {
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
    const DRAIN_MS = 1500;
    const HOLD_MS = 300;
    const TANK_H = 100;
    const WAVE_N = 4;
    const SLOSH_DAMP = 0.92;
    let totalMs = DRAIN_MS;
    const cv = q<HTMLCanvasElement>('[data-r="cv"]');
    const ctx2d = cv.getContext("2d");
    if (!ctx2d) return () => {};
    const g: CanvasRenderingContext2D = ctx2d;
    let cw = 1;
    let ch = 1;
    let dpr = 1;
    // 캔버스 안쪽 해상도를 화면 크기와 devicePixelRatio 에 맞춘다. 리사이즈마다 다시 호출된다
    function fitCanvas(): void {
        const r = cv.getBoundingClientRect();
        dpr = Math.min(2, window.devicePixelRatio || 1);
        cw = Math.max(1, Math.round(r.width));
        ch = Math.max(1, Math.round(r.height));
        cv.width = Math.round(cw * dpr);
        cv.height = Math.round(ch * dpr);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function cssVar(name: string): string {
        return getComputedStyle(root).getPropertyValue(name).trim();
    }
    function parseColor(h: string): number[] {
        // CSS 변수 값은 #rrggbb 로도, rgb(r, g, b) 로도, rgb(100%, 50%, 0%) 로도 나올 수 있다
        const m6 = /^#([0-9a-f]{6})$/i.exec(h);
        if (m6) {
            const n = parseInt(m6[1], 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        }
        const m = /([0-9.]+)(%?)[ ,]+([0-9.]+)(%?)[ ,]+([0-9.]+)(%?)/.exec(h);
        if (!m) return [255, 255, 255];
        const ch = (v: string, pct: string): number => Math.round(pct ? (Number(v) * 255) / 100 : Number(v));
        return [ch(m[1], m[2]), ch(m[3], m[4]), ch(m[5], m[6])];
    }
    function rgba(c: number[], a: number): string {
        return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a.toFixed(3) + ")";
    }
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
    // 그림 좌표계는 220 × 120. 탱크는 가운데 160 × TANK_H
    const LW = 220;
    const LH = 120;
    const TANK_W = 160;
    const MIN_LEVEL = 0.16;
    const KICK = 6;
    const GAIN = 0.6;
    const AMP_MAX = 18;
    // <slosh>
    let amp = KICK;
    let wt = 0;
    let prevLevel = 1;
    function levelOf(rem: number): number {
        return MIN_LEVEL + (1 - MIN_LEVEL) * (rem / totalMs);
    }
    // 수위가 변한 만큼 진폭을 키우고, 프레임마다 SLOSH_DAMP 배로 가라앉힌다 (60fps 기준 프레임 수로 환산)
    function sloshStep(a: number, dLevel: number, dt: number): number {
        const next = a * Math.pow(SLOSH_DAMP, dt * 60) + GAIN * Math.abs(dLevel) * TANK_H;
        return Math.min(AMP_MAX, next);
    }
    // 정상파 합성: 모드 k 는 sin(kπx/W) 모양에 시간 위상이 따로 돈다
    function surfaceDy(x: number, a: number, t: number): number {
        let y = 0;
        for (let k = 1; k <= WAVE_N; k++) {
            y += (a / k) * Math.sin((k * Math.PI * x) / TANK_W) * Math.cos(t * (9 + 5 * k) + k * 1.3);
        }
        return y;
    }
    // </slosh>
    let cWater = [110, 200, 255];
    let cWater2 = [185, 160, 255];
    let cGlass = [255, 247, 230];
    function resize(): void {
        fitCanvas();
        cWater = parseColor(cssVar("--water"));
        cWater2 = parseColor(cssVar("--water2"));
        cGlass = parseColor(cssVar("--glass"));
    }
    const num = q<HTMLElement>('[data-r="num"]');
    function resetState(): void {
        amp = KICK;
        prevLevel = levelOf(remainMs());
    }
    function tick(dt: number): void {
        const lv = levelOf(remainMs());
        if (reduce) {
            amp = 0;
            prevLevel = lv;
            return;
        }
        wt += dt;
        amp = sloshStep(amp, dt > 0 ? lv - prevLevel : 0, dt);
        prevLevel = lv;
    }
    function draw(): void {
        const sc = Math.min(cw / LW, ch / LH);
        const ox = (cw - LW * sc) / 2;
        const oy = (ch - LH * sc) / 2;
        g.clearRect(0, 0, cw, ch);
        g.save();
        g.translate(ox, oy);
        g.scale(sc, sc);
        const tx = (LW - TANK_W) / 2;
        const ty = (LH - TANK_H) / 2;
        const lv = levelOf(remainMs());
        const base = ty + TANK_H * (1 - lv);
        const water = (shift: number, alpha: number, c: number[]): void => {
            g.beginPath();
            g.moveTo(tx, ty + TANK_H);
            for (let i = 0; i <= 40; i++) {
                const x = (i / 40) * TANK_W;
                g.lineTo(tx + x, base - surfaceDy(x, amp, wt + shift));
            }
            g.lineTo(tx + TANK_W, ty + TANK_H);
            g.closePath();
            g.fillStyle = rgba(c, alpha);
            g.fill();
        };
        water(0.9, 0.55, cWater2);
        water(0, 0.9, cWater);
        // 수면 선
        g.strokeStyle = rgba(cGlass, 0.7);
        g.lineWidth = 1.2;
        g.beginPath();
        for (let i = 0; i <= 40; i++) {
            const x = (i / 40) * TANK_W;
            const y = base - surfaceDy(x, amp, wt);
            if (i === 0) g.moveTo(tx + x, y);
            else g.lineTo(tx + x, y);
        }
        g.stroke();
        // 유리 벽과 눈금
        g.strokeStyle = rgba(cGlass, 0.8);
        g.lineWidth = 2.4;
        g.lineJoin = "round";
        g.beginPath();
        g.moveTo(tx, ty - 6);
        g.lineTo(tx, ty + TANK_H);
        g.lineTo(tx + TANK_W, ty + TANK_H);
        g.lineTo(tx + TANK_W, ty - 6);
        g.stroke();
        g.lineWidth = 1;
        g.strokeStyle = rgba(cGlass, 0.5);
        for (let i = 1; i < 5; i++) {
            const y = ty + (TANK_H * i) / 5;
            g.beginPath();
            g.moveTo(tx + TANK_W + 4, y);
            g.lineTo(tx + TANK_W + 12, y);
            g.stroke();
        }
        g.restore();
        num.textContent = (remainMs() / 1000).toFixed(1);
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
      <div className={cx("cd__view cd__view--scene")}>
      <canvas className={cx("cd__cv")} data-r="cv" role="img" aria-label="수위가 내려가며 출렁이는 액체 탱크"></canvas>
      <p className={cx("cd__read cd__read--corner")} role="timer"><b data-r="num">1.5</b><span>초</span></p>
      </div>
      <div className={cx("cd__bar")}>
        <button className={cx("cd__btn")} type="button" data-r="toggle">멈춤</button>
        <button className={cx("cd__btn")} type="button" data-r="reset">다시</button>
      </div>
      <p className={cx("cd__sr")} aria-live="polite" data-r="status"></p>
    </div>
  );
}
