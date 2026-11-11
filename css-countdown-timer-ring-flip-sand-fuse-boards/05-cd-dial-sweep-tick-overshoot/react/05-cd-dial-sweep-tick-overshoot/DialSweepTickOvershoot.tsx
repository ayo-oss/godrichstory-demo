// DialSweepTickOvershoot - vanilla 판(05-cd-dial-sweep-tick-overshoot) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./DialSweepTickOvershoot.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function DialSweepTickOvershoot() {
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
    const TICK_COUNT = 10;
    const DEMO_SECOND_MS = 150;
    const SECOND_MS = 1000;
    const HOLD_MS = 300;
    const SPRING_K = 520;
    const DAMPING = 22;
    const SECTOR_ALPHA = 0.55;
    let secondMs = demo ? DEMO_SECOND_MS : SECOND_MS;
    let totalMs = TICK_COUNT * secondMs;
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
    const sector = q<HTMLElement>('[data-r="sector"]');
    const needle = q<HTMLElement>('[data-r="needle"]');
    const face = q<HTMLElement>('[data-r="face"]');
    const num = q<HTMLElement>('[data-r="num"]');
    const STEP_DEG = 360 / TICK_COUNT;
    const ticks: HTMLElement[] = [];
    for (let i = 0; i < TICK_COUNT; i++) {
        const t = document.createElement("i");
        t.className = cx("cd__tick");
        t.style.transform = "rotate(" + i * STEP_DEG + "deg)";
        face.appendChild(t);
        ticks.push(t);
    }
    let angle = 0;
    let vel = 0;
    let passed = 0;
    // 지난 눈금 수: secondMs 가 한 번 지날 때마다 한 칸
    function passedTicks(): number {
        return Math.min(TICK_COUNT, Math.floor(elapsed / secondMs + 1e-6));
    }
    function resize(): void {}
    function resetState(): void {
        angle = 0;
        vel = 0;
        passed = 0;
    }
    hooks.stop = () => {
        elapsed *= SECOND_MS / secondMs;
        secondMs = SECOND_MS;
        totalMs = TICK_COUNT * secondMs;
    };
    function tick(dt: number): void {
        passed = passedTicks();
        const target = passed * STEP_DEG;
        if (reduce) {
            angle = target;
            vel = 0;
            return;
        }
        let left = dt;
        while (left > 0) {
            const h = Math.min(left, 1 / 240);
            vel += (-SPRING_K * (angle - target) - DAMPING * vel) * h;
            angle += vel * h;
            left -= h;
        }
    }
    function draw(): void {
        needle.style.transform = "rotate(" + angle.toFixed(2) + "deg)";
        // 지나온 각도까지 부채꼴을 따로 깐다. 바늘이 튕기면 부채꼴 끝도 같이 튕긴다
        sector.style.setProperty("--a", clamp(angle, 0, 360).toFixed(2));
        sector.style.opacity = String(SECTOR_ALPHA);
        ticks.forEach((t, i) => t.classList.toggle(cx("is-past"), i < passed));
        num.textContent = String(Math.ceil(remainMs() / secondMs - 1e-6));
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
      <div className={cx("cd__view cd__view--dial")}>
      <div className={cx("cd__face")} data-r="face" role="img" aria-label="눈금마다 튕기는 다이얼">
      <div className={cx("cd__sector")} data-r="sector"></div>
      <div className={cx("cd__needle")} data-r="needle"></div>
      <i className={cx("cd__hub")}></i>
      </div>
      <p className={cx("cd__read cd__read--center")} role="timer"><b data-r="num">10</b><span>초</span></p>
      </div>
      <div className={cx("cd__bar")}>
        <button className={cx("cd__btn")} type="button" data-r="toggle">멈춤</button>
        <button className={cx("cd__btn")} type="button" data-r="reset">다시</button>
      </div>
      <p className={cx("cd__sr")} aria-live="polite" data-r="status"></p>
    </div>
  );
}
