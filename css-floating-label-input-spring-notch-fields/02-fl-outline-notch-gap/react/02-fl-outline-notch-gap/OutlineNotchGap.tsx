// OutlineNotchGap - vanilla 판(02-fl-outline-notch-gap) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./OutlineNotchGap.module.scss";

type Spring = { x: number; v: number };
type Plan = { a: number; b: number; s: number; rate: number; text: string };
type Base = { input: HTMLInputElement | HTMLTextAreaElement; focus: boolean; up: boolean };
type F = Base & { box: HTMLElement; label: HTMLElement; outline: HTMLElement; p: number; gap: number; natW: number };

export default function OutlineNotchGap() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    const CLS = {  };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let raf: number = 0;
    let last: number = -1;
    const offs: Array<() => void> = [];
    function q(sel: string): HTMLElement {
        return root.querySelector(sel) as HTMLElement;
    }
    function qa(sel: string): HTMLElement[] {
        const list: HTMLElement[] = Array.prototype.slice.call(root.querySelectorAll(sel));
        return list;
    }
    function clamp(v: number, lo: number, hi: number): number {
        return Math.max(lo, Math.min(hi, v));
    }
    function on(el: EventTarget, type: string, fn: (e: any) => void): void {
        el.addEventListener(type, fn);
        offs.push(function (): void {
            el.removeEventListener(type, fn);
        });
    }
    // 좌표 해시: 같은 입력이면 같은 값 0~1. 난수 함수를 쓰지 않고 사인의 소수부만 쓴다.
    function hash(x: number): number {
        const s = Math.sin(x * 127.1 + 311.7) * 43758.5453;
        return s - Math.floor(s);
    }
    // 지수 접근: 프레임당 비율 per 만큼 목표에 다가간다. f 는 60fps 기준 프레임 수(dt * 60)라 프레임률이 달라도 같은 속도다.
    function approach(x: number, target: number, per: number, f: number): number {
        return x + (target - x) * (1 - Math.pow(1 - per, f));
    }
    // 스프링 한 칸: 가속도 = -k (x - 목표) - c v. 반암시적 오일러를 1/120초 이하 부분 스텝으로 쪼갠다.
    function springStep(s: Spring, target: number, k: number, c: number, dt: number): void {
        let left = dt;
        while (left > 0) {
            const h = Math.min(left, 1 / 120);
            s.v += (-k * (s.x - target) - c * s.v) * h;
            s.x += s.v * h;
            left -= h;
        }
    }
    // 값이 있으면 라벨은 올라가 있어야 한다. 브라우저 자동완성이 값을 채우면 input 이벤트가 없을 수 있어 :autofill 도 함께 본다.
    function isFilled(el: HTMLInputElement | HTMLTextAreaElement): boolean {
        if (el.value !== "") return true;
        try {
            return el.matches(":-webkit-autofill");
        } catch (err) {
            return false;
        }
    }
    let leaveHook: ((i: number) => void) | null = null;
    function stopDemo(): void {
        if (!demo) return;
        demo = false;
        root.removeAttribute("data-demo");
        root.classList.remove("is-demo");
        resetFields();
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
    if (document.fonts) {
        document.fonts.ready.then(function (): void {
            relayout();
        });
    }

    // 시연 계획: 칸마다 포커스 구간(a~b), 타이핑 시작(s)·글자당 ms(rate)·글. 2초 주기로 되풀이하고 주기 첫머리엔 모두 비운다.
    function runPlan(ts: number): void {
        const t = ts % 2000;
        let changed = false;
        for (let i = 0; i < PLAN.length; i += 1) {
            const p = PLAN[i];
            const f = fields[i];
            const isOn = t >= p.a && t < p.b;
            const n = t < p.s ? 0 : Math.min(p.text.length, Math.floor((t - p.s) / p.rate) + 1);
            const v = p.text.slice(0, n);
            if (f.input.value !== v) {
                f.input.value = v;
                changed = true;
            }
            if (f.focus !== isOn) {
                f.focus = isOn;
                changed = true;
                if (!isOn && leaveHook) leaveHook(i);
            }
        }
        if (changed) retarget();
    }
    function resetFields(): void {
        for (let i = 0; i < fields.length; i += 1) {
            fields[i].input.value = "";
            fields[i].focus = false;
        }
        retarget();
    }
    function wire(): void {
        fields.forEach(function (f: F, i: number): void {
            on(f.input, "focus", function (): void {
                stopDemo();
                f.focus = true;
                retarget();
            });
            on(f.input, "blur", function (): void {
                f.focus = false;
                if (leaveHook) leaveHook(i);
                retarget();
            });
            on(f.input, "input", function (): void {
                retarget();
            });
        });
    }

    // 기법: 라벨의 실측 폭을 getBoundingClientRect 로 재서 윗변 틈을 그 폭만큼만 보간해서 연다.
    const NOTCH_PAD = 5;
    const GAP_LERP = 0.22;
    const RADIUS = 8;
    const BORDER_W = 2;
    const LABEL_X = 14;
    const LABEL_SCALE = 0.78;
    const LABEL_LERP = 0.2;
    const RISE_PX = 26;
    const fields: F[] = qa("[data-r=box]").map(function (box: HTMLElement): F {
        const outline = box.querySelector("[data-r=outline]") as HTMLElement;
        outline.style.borderRadius = RADIUS + "px";
        outline.style.borderWidth = BORDER_W + "px";
        return {
            box: box,
            input: box.querySelector("input") as HTMLInputElement,
            label: box.querySelector("label") as HTMLElement,
            outline: outline,
            focus: false, up: false, p: 0, gap: 0, natW: 60
        };
    });
    const PLAN: Plan[] = [
        { a: 200, b: 950, s: 420, rate: 60, text: "Mina Seo" },
        { a: 950, b: 1650, s: 1100, rate: 60, text: "mina@mail.dev" },
        { a: 1650, b: 1980, s: 1750, rate: 60, text: "seoul" }
    ];
    // 라벨 자연 폭 = 지금 그려진 폭 ÷ 지금 배율. 폰트가 늦게 들어오거나 창이 바뀌면 다시 잰다.
    function measure(): void {
        fields.forEach(function (f: F): void {
            const s = 1 - (1 - LABEL_SCALE) * f.p;
            f.natW = f.label.getBoundingClientRect().width / s;
        });
    }
    function targetGap(f: F): number {
        return f.up ? f.natW * LABEL_SCALE + 2 * NOTCH_PAD : 0;
    }
    function retarget(): void {
        fields.forEach(function (f: F): void {
            f.up = f.focus || isFilled(f.input);
            if (f.up) f.box.setAttribute("data-up", "");
            else f.box.removeAttribute("data-up");
            if (reduce) {
                f.p = f.up ? 1 : 0;
                f.gap = targetGap(f);
            }
        });
        if (reduce) render();
    }
    function relayout(): void {
        measure();
        retarget();
    }
    function script(ts: number): void {
        runPlan(ts);
    }
    function step(dt: number, ts: number): void {
        const fr = dt * 60;
        fields.forEach(function (f: F): void {
            f.p = approach(f.p, f.up ? 1 : 0, LABEL_LERP, fr);
            f.gap = approach(f.gap, targetGap(f), GAP_LERP, fr);
        });
    }
    function render(): void {
        fields.forEach(function (f: F): void {
            const s = 1 - (1 - LABEL_SCALE) * f.p;
            f.label.style.transform = "translate3d(0," + (-RISE_PX * f.p).toFixed(2) + "px,0) scale(" + s.toFixed(3) + ")";
            f.box.style.setProperty("--p", f.p.toFixed(3));
            const x0 = LABEL_X - NOTCH_PAD;
            const x1 = x0 + f.gap;
            const cut = f.gap > 0.5 ? "polygon(0 0," + x0.toFixed(1) + "px 0," + x0.toFixed(1) + "px " + (BORDER_W + 1) + "px," + x1.toFixed(1) + "px " + (BORDER_W + 1) + "px," + x1.toFixed(1) + "px 0,100% 0,100% 100%,0 100%)" : "none";
            f.outline.style.clipPath = cut;
        });
    }
    wire();

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
      <div ref={rootRef} className={styles["fl"] + " is-demo"} data-demo="1">
        <div className={styles["fl__field"]}>
          <div className={styles["fl__box"]} data-r="box">
            <i className={styles["fl__outline"]} data-r="outline" aria-hidden="true" />
            <input className={styles["fl__input"]} id="f1" data-r="input" type="text" autoComplete="name" />
            <label className={styles["fl__label"]} htmlFor="f1" data-r="label">이름</label>
          </div>
        </div>
        <div className={styles["fl__field"]}>
          <div className={styles["fl__box"]} data-r="box">
            <i className={styles["fl__outline"]} data-r="outline" aria-hidden="true" />
            <input className={styles["fl__input"]} id="f2" data-r="input" type="email" autoComplete="email" />
            <label className={styles["fl__label"]} htmlFor="f2" data-r="label">이메일 주소</label>
          </div>
        </div>
        <div className={styles["fl__field"]}>
          <div className={styles["fl__box"]} data-r="box">
            <i className={styles["fl__outline"]} data-r="outline" aria-hidden="true" />
            <input className={styles["fl__input"]} id="f3" data-r="input" type="text" autoComplete="off" />
            <label className={styles["fl__label"]} htmlFor="f3" data-r="label">도시</label>
          </div>
        </div>
      </div>
    </main>
  );
}
