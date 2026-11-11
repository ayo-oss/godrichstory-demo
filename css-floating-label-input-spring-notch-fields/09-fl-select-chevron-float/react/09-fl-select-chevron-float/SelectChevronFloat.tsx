// SelectChevronFloat - vanilla 판(09-fl-select-chevron-float) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./SelectChevronFloat.module.scss";

type Spring = { x: number; v: number };
type Plan = { a: number; b: number; s: number; rate: number; text: string };
type Base = { input: HTMLInputElement | HTMLTextAreaElement; focus: boolean; up: boolean };
type F = { box: HTMLElement; btn: HTMLElement; val: HTMLElement; label: HTMLElement; chev: HTMLElement; menu: HTMLElement; opts: HTMLElement[]; open: boolean; hi: number; sel: number; sp: Spring; closeIn: number };

export default function SelectChevronFloat() {
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

    // 기법: 열림 정도 x 하나를 스프링으로 돌리고, 쉐브론 각도·목록 높이·라벨 상승을 전부 그 x 에서 파생한다. 값이 하나라 셋이 어긋날 수 없다.
    const CHEV_STIFF = 160;
    const CHEV_DAMP = 13;
    const OPEN_DEG = 180;
    const PICK_DELAY = 220;
    const OPT_H = 36;
    const MENU_PAD = 4;
    const RISE_PX = 15;
    const LABEL_SCALE = 0.74;
    const fields: F[] = qa("[data-r=box]").map(function (box: HTMLElement): F {
        const menu = box.querySelector("[data-r=menu]") as HTMLElement;
        const opts: HTMLElement[] = Array.prototype.slice.call(menu.querySelectorAll("[data-r=opt]"));
        return {
            box: box,
            btn: box.querySelector("[data-r=btn]") as HTMLElement,
            val: box.querySelector("[data-r=val]") as HTMLElement,
            label: box.querySelector("[data-r=label]") as HTMLElement,
            chev: box.querySelector("[data-r=chev]") as HTMLElement,
            menu: menu, opts: opts,
            open: false, hi: 0, sel: -1, sp: { x: 0, v: 0 }, closeIn: 0
        };
    });
    // 이벤트 표: [시각(ms), 칸, 동작, 값]. 2초 주기로 되풀이한다.
    const EVENTS: Array<[number, number, string, number]> = [
        [200, 0, "open", 0],
        [480, 0, "hi", 1],
        [720, 0, "hi", 2],
        [980, 0, "pick", 2],
        [1250, 1, "open", 0],
        [1500, 1, "hi", 1],
        [1720, 1, "pick", 1]
    ];
    let lastT = -1;
    function syncAria(f: F): void {
        f.btn.setAttribute("aria-expanded", String(f.open));
        if (f.open) {
            f.btn.setAttribute("aria-activedescendant", f.opts[f.hi].id);
            f.box.setAttribute("data-open", "");
        } else {
            f.btn.removeAttribute("aria-activedescendant");
            f.box.removeAttribute("data-open");
        }
        f.opts.forEach(function (o: HTMLElement, i: number): void {
            if (i === f.hi && f.open) o.setAttribute("data-hi", "");
            else o.removeAttribute("data-hi");
            o.setAttribute("aria-selected", String(i === f.sel));
        });
        f.val.textContent = f.sel >= 0 ? f.opts[f.sel].textContent : "";
        if (reduce) {
            f.sp.x = f.open ? 1 : 0;
            f.sp.v = 0;
            render();
        }
    }
    function setOpen(f: F, v: boolean): void {
        f.open = v;
        f.closeIn = 0;
        if (v && f.sel >= 0) f.hi = f.sel;
        syncAria(f);
    }
    function pick(f: F, idx: number): void {
        f.sel = idx;
        f.hi = idx;
        if (reduce) setOpen(f, false);
        else {
            f.closeIn = PICK_DELAY / 1000;
            syncAria(f);
        }
    }
    function move(f: F, to: number): void {
        f.hi = clamp(to, 0, f.opts.length - 1);
        syncAria(f);
    }
    function resetFields(): void {
        fields.forEach(function (f: F): void {
            f.sel = -1;
            f.hi = 0;
            setOpen(f, false);
        });
    }
    function relayout(): void {
        fields.forEach(syncAria);
    }
    function script(ts: number): void {
        const t = ts % 2000;
        if (lastT < 0) lastT = t;
        if (t < lastT) resetFields();
        EVENTS.forEach(function (e: [number, number, string, number]): void {
            if (e[0] <= lastT || e[0] > t) return;
            const f = fields[e[1]];
            if (e[2] === "open") setOpen(f, true);
            else if (e[2] === "hi") move(f, e[3]);
            else pick(f, e[3]);
        });
        lastT = t;
    }
    function step(dt: number, ts: number): void {
        fields.forEach(function (f: F): void {
            springStep(f.sp, f.open ? 1 : 0, CHEV_STIFF, CHEV_DAMP, dt);
            if (f.closeIn > 0) {
                f.closeIn -= dt;
                if (f.closeIn <= 0) setOpen(f, false);
            }
        });
    }
    function render(): void {
        fields.forEach(function (f: F): void {
            const x = f.sp.x;
            const o = clamp(x, 0, 1);
            const r = f.sel >= 0 ? Math.max(1, clamp(x, 0, 1.25)) : clamp(x, 0, 1.25);
            const s = 1 - (1 - LABEL_SCALE) * r;
            f.label.style.transform = "translate3d(0," + (-RISE_PX * r).toFixed(2) + "px,0) scale(" + s.toFixed(3) + ")";
            f.chev.style.transform = "rotate(" + (OPEN_DEG * x).toFixed(1) + "deg)";
            f.box.style.setProperty("--p", clamp(r, 0, 1).toFixed(3));
            const h = (OPT_H * f.opts.length + 2 * MENU_PAD) * o;
            f.menu.style.height = h.toFixed(1) + "px";
            f.menu.style.opacity = clamp(o * 1.6, 0, 1).toFixed(3);
            f.menu.style.visibility = h < 1 ? "hidden" : "visible";
        });
    }
    fields.forEach(function (f: F): void {
        f.opts.forEach(function (o: HTMLElement, k: number): void {
            on(o, "pointerenter", function (): void {
                if (f.open) move(f, k);
            });
            on(o, "click", function (): void {
                stopDemo();
                pick(f, k);
            });
        });
        // 목록을 누를 때 버튼이 포커스를 잃어 닫히지 않게 한다.
        on(f.menu, "mousedown", function (e: MouseEvent): void {
            e.preventDefault();
        });
        on(f.btn, "click", function (e: MouseEvent): void {
            stopDemo();
            if (e.detail === 0 && f.open) pick(f, f.hi);
            else setOpen(f, !f.open);
        });
        on(f.btn, "keydown", function (e: KeyboardEvent): void {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                stopDemo();
                if (!f.open) setOpen(f, true);
                else move(f, f.hi + (e.key === "ArrowDown" ? 1 : -1));
            } else if (e.key === "Escape" && f.open) {
                setOpen(f, false);
            }
        });
        on(f.btn, "blur", function (): void {
            if (f.open) setOpen(f, false);
        });
    });
    on(document, "pointerdown", function (e: PointerEvent): void {
        fields.forEach(function (f: F): void {
            if (f.open && !f.box.contains(e.target as Node)) setOpen(f, false);
        });
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
      <div ref={rootRef} className={styles["fl"] + " is-demo"} data-demo="1">
        <div className={styles["fl__field"]}>
          <div className={styles["fl__box"]} data-r="box">
            <button className={styles["fl__input"] + " " + styles["fl__select"]} id="c1" data-r="btn" type="button" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="m1">
              <span className={styles["fl__val"]} data-r="val" />
            </button>
            <label className={styles["fl__label"]} htmlFor="c1" id="l1" data-r="label">도시</label>
            <svg className={styles["fl__chev"]} data-r="chev" aria-hidden="true" width="24" height="24" viewBox="0 0 256 256"><g fill="currentColor"><path d="m208 96l-80 80l-80-80Z" opacity=".2"/><path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z"/></g></svg>
            <ul className={styles["fl__menu"]} id="m1" role="listbox" aria-labelledby="l1" data-r="menu">
              <li className={styles["fl__opt"]} role="option" id="m1o0" data-r="opt" aria-selected="false">서울</li>
              <li className={styles["fl__opt"]} role="option" id="m1o1" data-r="opt" aria-selected="false">부산</li>
              <li className={styles["fl__opt"]} role="option" id="m1o2" data-r="opt" aria-selected="false">제주</li>
            </ul>
          </div>
        </div>
        <div className={styles["fl__field"]}>
          <div className={styles["fl__box"]} data-r="box">
            <button className={styles["fl__input"] + " " + styles["fl__select"]} id="c2" data-r="btn" type="button" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="m2">
              <span className={styles["fl__val"]} data-r="val" />
            </button>
            <label className={styles["fl__label"]} htmlFor="c2" id="l2" data-r="label">요일</label>
            <svg className={styles["fl__chev"]} data-r="chev" aria-hidden="true" width="24" height="24" viewBox="0 0 256 256"><g fill="currentColor"><path d="m208 96l-80 80l-80-80Z" opacity=".2"/><path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z"/></g></svg>
            <ul className={styles["fl__menu"] + " " + styles["fl__menu--up"]} id="m2" role="listbox" aria-labelledby="l2" data-r="menu">
              <li className={styles["fl__opt"]} role="option" id="m2o0" data-r="opt" aria-selected="false">월요일</li>
              <li className={styles["fl__opt"]} role="option" id="m2o1" data-r="opt" aria-selected="false">수요일</li>
              <li className={styles["fl__opt"]} role="option" id="m2o2" data-r="opt" aria-selected="false">금요일</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
