// OdometerStripMotionBlur - vanilla 판(06-cd-odometer-strip-motion-blur) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./OdometerStripMotionBlur.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function OdometerStripMotionBlur() {
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
    const TOTAL_MS = 1500;
    const HOLD_MS = 300;
    const DIGIT_COUNT = 3;
    const SPIN_MS = 70;
    const BLUR_GAIN = 0.05;
    const CARRY_DELAY = 55;
    let totalMs = TOTAL_MS;
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
    type Col = { win: HTMLElement; strip: HTMLElement; pos: number; vel: number };
    const colsEl = q<HTMLElement>('[data-r="cols"]');
    const cols: Col[] = [];
    // 띠에는 0 부터 9 를 쓰고 이어서 0, 1 을 한 번 더 둔다(12 칸). 한 자리가 아홉에서 영으로 넘어갈 때 끊기지 않게 하는 여분이다
    const STRIP: string[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "1"];
    // 왼쪽이 가장 높은 자리(1 단위). 그 바로 뒤에 소수점을 둔다
    for (let i = DIGIT_COUNT - 1; i >= 0; i--) {
        const win = document.createElement("div");
        win.className = cx("cd__col");
        const strip = document.createElement("div");
        strip.className = cx("cd__strip");
        STRIP.forEach((d) => {
            const s = document.createElement("span");
            s.textContent = d;
            strip.appendChild(s);
        });
        win.appendChild(strip);
        colsEl.appendChild(win);
        cols[i] = { win, strip, pos: 0, vel: 0 };
        if (i === DIGIT_COUNT - 1) {
            const dot = document.createElement("span");
            dot.className = cx("cd__dot");
            dot.textContent = ".";
            colsEl.appendChild(dot);
        }
    }
    let rowH = 60;
    // 자리 i 가 가리켜야 할 값. 올림은 낮은 자리보다 CARRY_DELAY × i 만큼 늦게 도착한다
    function targetOf(i: number): number {
        const t = Math.max(0, elapsed - CARRY_DELAY * i);
        const cs = Math.ceil(clamp(totalMs - t, 0, totalMs) / 10 - 1e-6);
        return Math.floor(cs / Math.pow(10, i));
    }
    function resize(): void {
        rowH = cols[0].win.clientHeight || 60;
    }
    function resetState(): void {
        cols.forEach((c, i) => {
            c.pos = targetOf(i);
            c.vel = 0;
        });
    }
    function tick(dt: number): void {
        cols.forEach((c, i) => {
            const tv = targetOf(i);
            if (reduce || dt <= 0) {
                c.pos = tv;
                c.vel = 0;
                return;
            }
            const before = c.pos;
            c.pos += (tv - c.pos) * (1 - Math.exp((-dt * 1000) / SPIN_MS));
            // 띠 속도: 프레임마다 위치 변화를 시간으로 나눠 잰다 (자리 수 / 1000ms)
            c.vel = Math.abs(c.pos - before) / dt;
        });
    }
    function draw(): void {
        let spin = 0;
        cols.forEach((c) => {
            spin += c.vel;
            const m = ((((c.pos - 1) % 10) + 10) % 10) + 1;
            const blur = Math.min(5, c.vel * BLUR_GAIN);
            const stretch = 1 + Math.min(0.5, c.vel * BLUR_GAIN * 0.08);
            c.strip.style.transformOrigin = "50% " + (m * rowH + rowH / 2).toFixed(1) + "px";
            c.strip.style.transform = "translateY(" + (-m * rowH).toFixed(1) + "px) scaleY(" + stretch.toFixed(3) + ")";
            c.strip.style.filter = blur > 0.15 ? "blur(" + blur.toFixed(2) + "px)" : "none";
        });
        // 띠가 빨리 돌수록 하우징 둘레에 빛이 번진다 (속도 합계 -> 0 ~ 1)
        const k = reduce ? 0 : clamp(spin / 150, 0, 1);
        colsEl.style.boxShadow = "inset 0 0 0 2px rgba(255,247,230,.16), 0 0 " + (8 + 56 * k).toFixed(1) + "px " + (4 + 22 * k).toFixed(1) + "px rgba(185,160,255," + (0.12 + 0.5 * k).toFixed(3) + ")";
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
      <div className={cx("cd__view cd__view--odo")}>
      <div className={cx("cd__cols")} data-r="cols" role="timer" aria-label="남은 시간 주행계"></div>
      <p className={cx("cd__unit")}><span>초</span></p>
      </div>
      <div className={cx("cd__bar")}>
        <button className={cx("cd__btn")} type="button" data-r="toggle">멈춤</button>
        <button className={cx("cd__btn")} type="button" data-r="reset">다시</button>
      </div>
      <p className={cx("cd__sr")} aria-live="polite" data-r="status"></p>
    </div>
  );
}
