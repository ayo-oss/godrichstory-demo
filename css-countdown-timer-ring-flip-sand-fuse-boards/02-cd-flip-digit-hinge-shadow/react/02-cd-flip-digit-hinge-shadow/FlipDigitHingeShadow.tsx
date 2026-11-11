// FlipDigitHingeShadow - vanilla 판(02-cd-flip-digit-hinge-shadow) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./FlipDigitHingeShadow.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function FlipDigitHingeShadow() {
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
    const FLIP_MS = 140;
    const STIFFNESS = 2200;
    const SHADE_MAX = 0.6;
    const DEPTH_PX = 360;
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
    type Leaf = { el: HTMLElement; num: HTMLElement; shade: HTMLElement };
    type Card = {
        el: HTMLElement;
        top: Leaf;
        bot: Leaf;
        leafTop: Leaf;
        leafBot: Leaf;
        cur: number;
        nxt: number;
        flipping: boolean;
        x: number;
        v: number;
        age: number;
    };
    const DAMPING = 2 * 0.55 * Math.sqrt(STIFFNESS);
    const cardsEl = q<HTMLElement>('[data-r="cards"]');
    function leaf(cls: string): Leaf {
        const el = document.createElement("div");
        el.className = cx("cd__half " + cls);
        const num = document.createElement("span");
        num.className = cx("cd__num");
        const shade = document.createElement("i");
        shade.className = cx("cd__shade");
        el.appendChild(num);
        el.appendChild(shade);
        return { el, num, shade };
    }
    function makeCard(): Card {
        const el = document.createElement("div");
        el.className = cx("cd__card");
        el.style.perspective = DEPTH_PX + "px";
        const top = leaf("cd__half--top");
        const bot = leaf("cd__half--bot");
        const leafTop = leaf("cd__half--top cd__leaf cd__leaf--top");
        const leafBot = leaf("cd__half--bot cd__leaf cd__leaf--bot");
        [top, bot, leafTop, leafBot].forEach((l) => el.appendChild(l.el));
        cardsEl.appendChild(el);
        return { el, top, bot, leafTop, leafBot, cur: 0, nxt: 0, flipping: false, x: 0, v: 0, age: 0 };
    }
    const cards: Card[] = [makeCard(), makeCard()];
    function setNums(c: Card, topV: number, botV: number, ltV: number, lbV: number): void {
        c.top.num.textContent = String(topV);
        c.bot.num.textContent = String(botV);
        c.leafTop.num.textContent = String(ltV);
        c.leafBot.num.textContent = String(lbV);
    }
    // 숫자가 바뀌면 접기를 새로 시작한다. 이전 접기가 아직 돌고 있으면 그 끝 값으로 먼저 굳힌다
    function setTarget(c: Card, d: number): void {
        const shown = c.flipping ? c.nxt : c.cur;
        if (shown === d) return;
        if (c.flipping) c.cur = c.nxt;
        c.nxt = d;
        if (reduce) {
            c.cur = d;
            c.flipping = false;
            return;
        }
        c.flipping = true;
        c.x = 0;
        c.v = 0;
        c.age = 0;
    }
    function place(c: Card): void {
        if (!c.flipping) {
            setNums(c, c.cur, c.cur, c.cur, c.cur);
            c.leafTop.el.style.display = "none";
            c.leafBot.el.style.display = "none";
            c.top.shade.style.opacity = "0";
            c.bot.shade.style.opacity = "0";
            return;
        }
        // 접힌 각도 θ (도). 스프링이 1 을 살짝 넘으면 θ 도 180 을 넘어 한 번 튕긴다
        const th = clamp(c.x, 0, 1.12) * 180;
        const s = SHADE_MAX * Math.abs(Math.sin((th * Math.PI) / 180));
        setNums(c, c.nxt, c.cur, c.cur, c.nxt);
        c.leafTop.el.style.display = th < 90 ? "block" : "none";
        c.leafBot.el.style.display = th >= 90 ? "block" : "none";
        c.leafTop.el.style.transform = "rotateX(" + (-th).toFixed(2) + "deg)";
        c.leafBot.el.style.transform = "rotateX(" + (180 - th).toFixed(2) + "deg)";
        // 두 반쪽과 종이 자신의 그림자 농도 = SHADE_MAX × sin θ
        c.top.shade.style.opacity = s.toFixed(3);
        c.bot.shade.style.opacity = s.toFixed(3);
        c.leafTop.shade.style.opacity = (s * 0.7).toFixed(3);
        c.leafBot.shade.style.opacity = (s * 0.7).toFixed(3);
    }
    function shownCount(): number {
        return Math.ceil(remainMs() / secondMs - 1e-6);
    }
    function resize(): void {}
    function resetState(): void {
        cards.forEach((c) => {
            c.flipping = false;
            c.x = 0;
            c.v = 0;
        });
    }
    hooks.stop = () => {
        elapsed *= SECOND_MS / secondMs;
        secondMs = SECOND_MS;
        totalMs = COUNT_FROM * secondMs;
    };
    function tick(dt: number): void {
        const n = shownCount();
        setTarget(cards[0], Math.floor(n / 10));
        setTarget(cards[1], n % 10);
        cards.forEach((c) => {
            if (!c.flipping) return;
            c.age += dt * 1000;
            let left = dt;
            while (left > 0) {
                const h = Math.min(left, 1 / 240);
                c.v += (-STIFFNESS * (c.x - 1) - DAMPING * c.v) * h;
                c.x += c.v * h;
                left -= h;
            }
            if (c.age >= FLIP_MS) {
                c.cur = c.nxt;
                c.flipping = false;
            }
        });
    }
    function draw(): void {
        cards.forEach(place);
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
      <div className={cx("cd__view")}>
      <div className={cx("cd__cards")} data-r="cards" role="timer" aria-label="남은 시간 카드"></div>
      </div>
      <div className={cx("cd__bar")}>
        <button className={cx("cd__btn")} type="button" data-r="toggle">멈춤</button>
        <button className={cx("cd__btn")} type="button" data-r="reset">다시</button>
      </div>
      <p className={cx("cd__sr")} aria-live="polite" data-r="status"></p>
    </div>
  );
}
