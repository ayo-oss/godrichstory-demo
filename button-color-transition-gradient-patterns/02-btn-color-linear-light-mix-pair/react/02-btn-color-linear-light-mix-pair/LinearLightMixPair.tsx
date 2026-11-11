// LinearLightMixPair — vanilla 판(02-btn-color-linear-light-mix-pair) 의 React 포트.
// 같은 두 색을 같은 진행도로 섞는다. 왼쪽은 sRGB 값 그대로(SRGB), 오른쪽은 선형 밝기에서 섞는다(LINEAR).
import { useEffect, useRef } from "react";
import styles from "./LinearLightMixPair.module.scss";

type Box<T> = { current: T };
type Rgb = [number, number, number];

const MIX_RATE = 5;
const START_MS = 200;
const ON_MS = 1000;
const RAMP_MS = 800;
const HOLD_MS = 100;
const CYCLE_MS = 2000;

function toHex(rgb: Rgb): string {
  return "#" + rgb.map((c) => ("0" + Math.round(c).toString(16)).slice(-2)).join("");
}
function toLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function toGamma(l: number): number {
  const s = l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, s * 255));
}
// 시연 전용: 진행도를 smoothstep 으로 오르내려 변화가 가장 큰 순간이 두 중간 색이 벌어진 한가운데에 오게 한다.
function demoMix(now: number): number {
  if (now < START_MS) return 0;
  const c = (now - START_MS) % CYCLE_MS;
  if (c < RAMP_MS) { const s = c / RAMP_MS; return s * s * (3 - 2 * s); }
  if (c < RAMP_MS + HOLD_MS) return 1;
  if (c < 2 * RAMP_MS + HOLD_MS) { const s = (c - RAMP_MS - HOLD_MS) / RAMP_MS; return 1 - s * s * (3 - 2 * s); }
  return 0;
}
function mixRaw(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function mixLinear(a: Rgb, b: Rgb, t: number): Rgb {
  const one = (i: number): number => {
    const la = toLinear(a[i]);
    return toGamma(la + (toLinear(b[i]) - la) * t);
  };
  return [one(0), one(1), one(2)];
}

export default function LinearLightMixPair() {
  const rawRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const linRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const rawHexRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const linHexRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const rawMidRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const linMidRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const rawMidHexRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const linMidHexRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;

  useEffect(() => {
    const rawBtn = rawRef.current;
    const linBtn = linRef.current;
    const rawHex = rawHexRef.current;
    const linHex = linHexRef.current;
    const rawMidEl = rawMidRef.current;
    const linMidEl = linMidRef.current;
    const rawMidHexEl = rawMidHexRef.current;
    const linMidHexEl = linMidHexRef.current;
    if (!rawBtn || !linBtn || !rawHex || !linHex || !rawMidEl || !linMidEl || !rawMidHexEl || !linMidHexEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const readRgb = (name: string): Rgb => {
      let v = getComputedStyle(rawBtn).getPropertyValue(name).trim().replace("#", "");
      if (v.length === 3) v = v.split("").map((c) => c + c).join("");
      return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
    };
    const from = readRgb("--c-from");
    const to = readRgb("--c-to");
    const rawMid = toHex(mixRaw(from, to, 0.5));
    const linMid = toHex(mixLinear(from, to, 0.5));
    rawMidEl.style.background = rawMid;
    linMidEl.style.background = linMid;
    rawMidHexEl.textContent = rawMid;
    linMidHexEl.textContent = linMid;
    let mix = 0;
    let demo = !reduce;
    let pointerIn = false;
    let kbFocus = false;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    const demoOn = (now: number): boolean => demo && now >= START_MS && (now - START_MS) % CYCLE_MS < ON_MS;
    const paint = (): void => {
      const a = mixRaw(from, to, mix);
      const b = mixLinear(from, to, mix);
      rawBtn.style.background = toHex(a);
      linBtn.style.background = toHex(b);
      rawHex.textContent = toHex(a);
      linHex.textContent = toHex(b);
    };
    const stopDemo = (): void => { demo = false; };
    const jump = (): void => { mix = pointerIn || kbFocus ? 1 : 0; paint(); };
    const cleanups: Array<() => void> = [];
    [rawBtn, linBtn].forEach((b) => {
      const onEnter = (): void => { stopDemo(); pointerIn = true; if (reduce) jump(); };
      const onLeave = (): void => { pointerIn = false; if (reduce) jump(); };
      const onFocus = (): void => { kbFocus = b.matches(":focus-visible"); if (kbFocus) stopDemo(); if (reduce) jump(); };
      const onBlur = (): void => { kbFocus = false; if (reduce) jump(); };
      b.addEventListener("pointerenter", onEnter);
      b.addEventListener("pointerleave", onLeave);
      b.addEventListener("focus", onFocus);
      b.addEventListener("blur", onBlur);
      cleanups.push(() => {
        b.removeEventListener("pointerenter", onEnter);
        b.removeEventListener("pointerleave", onLeave);
        b.removeEventListener("focus", onFocus);
        b.removeEventListener("blur", onBlur);
      });
    });

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demo) {
        mix = demoMix(now);
      } else {
        const g = demoOn(now) || pointerIn || kbFocus ? 1 : 0;
        mix += (g - mix) * (1 - Math.exp(-dt * MIX_RATE));
        if (Math.abs(g - mix) < 0.002) mix = g;
      }
      paint();
      raf = requestAnimationFrame(tick);
    }

    if (reduce) paint();
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.bc}>
        <div className={styles.bc__pair}>
          <div className={styles.bc__cell}>
            <button className={styles.bc__btn} type="button" ref={rawRef}>구독하기</button>
            <p className={styles.bc__meta}><span className={styles.bc__tag}>SRGB</span> <span className={styles.bc__hex} ref={rawHexRef}>#ff9ebb</span></p>
            <p className={styles.bc__meta}><span className={styles.bc__tag}>50%</span> <span className={styles.bc__swatch} ref={rawMidRef}></span> <span className={styles.bc__hex} ref={rawMidHexRef}>#a6b9b0</span></p>
          </div>
          <div className={styles.bc__cell}>
            <button className={styles.bc__btn} type="button" ref={linRef}>구독하기</button>
            <p className={styles.bc__meta}><span className={styles.bc__tag}>LINEAR</span> <span className={styles.bc__hex} ref={linHexRef}>#ff9ebb</span></p>
            <p className={styles.bc__meta}><span className={styles.bc__tag}>50%</span> <span className={styles.bc__swatch} ref={linMidRef}></span> <span className={styles.bc__hex} ref={linMidHexRef}>#c1bcb1</span></p>
          </div>
        </div>
      </div>
    </main>
  );
}
