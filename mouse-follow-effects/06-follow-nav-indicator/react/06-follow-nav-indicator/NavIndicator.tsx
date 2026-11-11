// NavIndicator — vanilla 판(run/079/demo/06-follow-nav-indicator/index.html) 의 React 포트.
// 알약 하이라이트가 getBoundingClientRect 로 잰 항목 자리로 lerp(0.16)로 미끄러져 옮겨 가고,
// 로고 눈동자는 커서 x 를 따라간다. 계수·자리 재는 법은 vanilla 와 같다.
// 미리보기 루프의 키프레임 자리는 로드 시 실측해 CSS 변수로 넣는다(vanilla 079-06 수리와 동일).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./NavIndicator.module.scss";

export type NavIndicatorProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 전역 DOM 타입에 기대지 않는다 — 포인터 이벤트에서 실제로 읽는 것만 적는다
type PtrEvt = { clientX: number };

const NAV_LABEL = "데모 메뉴";
const ITEMS = ["홈", "작품", "소개"];
const HINT = "메뉴 위로 옮기면 알약이 미끄러져 따라옵니다";

// lerp: 매 프레임 남은 거리의 일부만 더 가는 선형 보간
function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

export default function NavIndicator({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: NavIndicatorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement>;
  const pillRef = useRef<HTMLSpanElement | null>(null);
  const itemRef = useRef<(HTMLButtonElement | null)[]>(new Array(ITEMS.length).fill(null)) as Box<(HTMLButtonElement | null)[]>;
  const pupilRef = useRef<(HTMLSpanElement | null)[]>(new Array(2).fill(null)) as Box<(HTMLSpanElement | null)[]>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function setItem(index: number) {
    return (el: HTMLButtonElement | null): void => {
      itemRef.current[index] = el;
    };
  }

  function setPupil(index: number) {
    return (el: HTMLSpanElement | null): void => {
      pupilRef.current[index] = el;
    };
  }

  useEffect(() => {
    const root = rootRef.current;
    const wrap = wrapRef.current;
    if (!root || !wrap) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 알약이 가야 할 자리 — 항목의 왼쪽 끝과 폭. getBoundingClientRect 로 잰다
    let slot = { x: 0, w: 0 };
    let now = { x: 0, w: 0 };
    let px = 0.5;
    let pxNow = 0.5;

    function measure(el: HTMLElement): { x: number; w: number } {
      const r = el.getBoundingClientRect();
      const w = wrap.getBoundingClientRect();
      return { x: r.left - w.left, w: r.width };
    }

    // 미리보기 루프의 알약 자리 — 항목 폭은 글자·폰트·로케일마다 달라지므로 로드 시 실측해
    // wrap 에 CSS 변수로 박는다. @keyframes nvSlide 는 이 변수를 읽는다
    // (하드코딩 px 는 폰트가 바뀌는 순간 알약이 글자를 넘어선다 — 079-06 수리)
    function injectSlots(): void {
      itemRef.current.forEach((item, i) => {
        if (!item) return;
        const s = measure(item);
        wrap.style.setProperty("--p" + i + "x", s.x.toFixed(1) + "px");
        wrap.style.setProperty("--p" + i + "w", s.w.toFixed(1) + "px");
      });
    }

    function draw(): void {
      const pill = pillRef.current;
      if (pill) {
        pill.style.transform = "translate3d(" + now.x.toFixed(1) + "px,0,0)";
        pill.style.width = now.w.toFixed(1) + "px";
      }
      const d = pxNow - 0.5;
      for (let i = 0; i < pupilRef.current.length; i++) {
        const pupil = pupilRef.current[i];
        if (pupil) pupil.style.transform = "translate3d(" + (d * 5).toFixed(1) + "px,0,0)";
      }
    }

    function tick(): void {
      now.x = lerp(now.x, slot.x, 0.16);
      now.w = lerp(now.w, slot.w, 0.16);
      pxNow = lerp(pxNow, px, 0.1);
      draw();
      raf = requestAnimationFrame(tick);
    }

    const offs: (() => void)[] = [];
    itemRef.current.forEach((item) => {
      if (!item) return;
      const onEnter = (event: PtrEvt): void => {
        setDemo(false);
        slot = measure(item);
        const w = wrap.getBoundingClientRect();
        px = Math.min(1, Math.max(0, (event.clientX - w.left) / w.width));
        if (reduce) {
          // reduce 에서는 미끄러짐 없이 즉시 항목 자리에 붙는다
          now = { x: slot.x, w: slot.w };
          draw();
        }
      };
      const onFocus = (): void => {
        setDemo(false);
        slot = measure(item);
        if (reduce) {
          now = { x: slot.x, w: slot.w };
          draw();
        }
      };
      item.addEventListener("pointerenter", onEnter);
      item.addEventListener("focus", onFocus);
      offs.push(() => {
        item.removeEventListener("pointerenter", onEnter);
        item.removeEventListener("focus", onFocus);
      });
    });

    // 무대 안 어디서든 로고 눈동자는 커서 x 를 본다
    function onMove(event: PtrEvt): void {
      const w = wrap.getBoundingClientRect();
      px = Math.min(1, Math.max(0, (event.clientX - w.left) / w.width));
    }
    root.addEventListener("pointermove", onMove);

    let raf = 0;
    const first = itemRef.current[0];
    if (first) slot = measure(first);
    now = { x: slot.x, w: slot.w };
    injectSlots();
    draw();
    // 폰트가 늦게 들어오거나 창이 바뀌면 슬롯이 달라진다 — 재주입 (079-06 수리)
    const ro: ResizeObserver | null = "ResizeObserver" in window ? new ResizeObserver(injectSlots) : null;
    ro?.observe(wrap);
    const fonts = (document as { fonts?: { ready: Promise<unknown> } }).fonts;
    const fontsDone: Promise<unknown> | null = fonts ? fonts.ready.then(() => injectSlots()) : null;
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      offs.forEach((off) => off());
      root.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      ro?.disconnect();
      void fontsDone;
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + (demo ? " " + styles.isDemo : "")} style={vars} ref={rootRef}>
        <nav className={styles.bar} aria-label={NAV_LABEL}>
          <span className={styles.logo} aria-hidden="true">
            <span className={styles.eye}><span className={styles.pupil} ref={setPupil(0)}></span></span>
            <span className={styles.eye}><span className={styles.pupil} ref={setPupil(1)}></span></span>
          </span>
          <span className={styles.items} ref={wrapRef}>
            <span className={styles.pill} aria-hidden="true" ref={pillRef}></span>
            {ITEMS.map((label, i) => (
              <button className={styles.item} type="button" key={label} ref={setItem(i)}>{label}</button>
            ))}
          </span>
        </nav>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
