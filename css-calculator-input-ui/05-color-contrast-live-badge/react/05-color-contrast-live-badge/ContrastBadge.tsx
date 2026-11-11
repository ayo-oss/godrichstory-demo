import { useEffect, useRef } from "react";
import styles from "./ContrastBadge.module.scss";

type Rgb = { r: number; g: number; b: number };

export default function ContrastBadge() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const swatchRef = useRef<HTMLSpanElement | null>(null);
  const lumBoxRef = useRef<HTMLDivElement | null>(null);
  const lumMarkRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLSpanElement | null>(null);
  const readoutRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const input = inputRef.current;
    const swatch = swatchRef.current;
    const lumBox = lumBoxRef.current;
    const lumMark = lumMarkRef.current;
    const statusEl = statusRef.current;
    const readout = readoutRef.current;
    if (!root || !input || !swatch || !lumBox || !lumMark || !statusEl || !readout) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    function human() {
      if (isDemo) {
        root!.classList.remove("is-demo");
        isDemo = false;
      }
    }

    const PASS_THRESHOLD = 4.5;

    function hexToRgb(hex: string): Rgb {
      const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
      if (!m) return { r: 255, g: 91, b: 60 };
      const n = parseInt(m[1], 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function relativeLuminance(rgb: Rgb) {
      function chan(c: number) {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      }
      return 0.2126 * chan(rgb.r) + 0.7152 * chan(rgb.g) + 0.0722 * chan(rgb.b);
    }
    function contrastRatio(l1: number, l2: number) {
      const hi = Math.max(l1, l2);
      const lo = Math.min(l1, l2);
      return (hi + 0.05) / (lo + 0.05);
    }
    function clamp01(v: number) {
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }

    const SENT_PREFIX = "흰 배경 대비 ";
    const SENT_MID1 = ":1 · 검은 배경 대비 ";
    const SENT_MID2 = ":1 중 ";
    const SENT_SUFFIX = "이 더 낫습니다";

    let targetX = 0;
    let renderedX = 0;
    const LERP_RATE = 0.17;

    function applyValue(hex: string) {
      const rgb = hexToRgb(hex);
      const L = relativeLuminance(rgb);
      const whiteContrast = contrastRatio(L, 1);
      const blackContrast = contrastRatio(L, 0);
      const best = Math.max(whiteContrast, blackContrast);
      const bestName = whiteContrast >= blackContrast ? "흰 배경" : "검은 배경";
      const pass = best >= PASS_THRESHOLD;

      swatch!.style.background = "#" + ("000000" + (((rgb.r << 16) | (rgb.g << 8) | rgb.b) >>> 0).toString(16)).slice(-6);
      statusEl!.textContent = pass ? "통과" : "미달";
      statusEl!.classList.toggle("is-pass", pass);
      statusEl!.classList.toggle("is-fail", !pass);

      const trackW = lumBox!.clientWidth - lumMark!.offsetWidth;
      targetX = clamp01(L) * trackW;
      readout!.textContent =
        SENT_PREFIX + whiteContrast.toFixed(1) + SENT_MID1 + blackContrast.toFixed(1) + SENT_MID2 + bestName + SENT_SUFFIX;
      if (reduce) {
        renderedX = targetX;
        paint();
      }
    }

    function paint() {
      lumMark!.style.transform = "translateX(" + renderedX.toFixed(1) + "px)";
    }

    function onInput() {
      human();
      applyValue(input!.value);
    }
    input.addEventListener("input", onInput);
    input.addEventListener("change", onInput);

    const DEMO_HEXES = ["#ff5b3c", "#2f6df6", "#ffd23f", "#17141a", "#fff7e6", "#8e2287"];
    const DRIVE_PERIOD_MS = 2000;
    let driveStart = 0;
    let lastIdx = -1;
    let rafDrive = 0;
    function driveTick(now: number) {
      if (!driveStart) driveStart = now;
      if (isDemo) {
        const frac = ((now - driveStart) % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
        const idx = Math.floor(frac * DEMO_HEXES.length);
        if (idx !== lastIdx) {
          lastIdx = idx;
          input!.value = DEMO_HEXES[idx];
          applyValue(DEMO_HEXES[idx]);
        }
      }
      rafDrive = requestAnimationFrame(driveTick);
    }

    let rafFrame = 0;
    function frame() {
      renderedX += (targetX - renderedX) * LERP_RATE;
      paint();
      rafFrame = requestAnimationFrame(frame);
    }

    function onResize() {
      applyValue(input!.value);
    }
    window.addEventListener("resize", onResize);
    applyValue(input.value);

    if (!reduce) {
      rafDrive = requestAnimationFrame(driveTick);
      rafFrame = requestAnimationFrame(frame);
    }

    return () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("change", onInput);
      window.removeEventListener("resize", onResize);
      if (rafDrive) cancelAnimationFrame(rafDrive);
      if (rafFrame) cancelAnimationFrame(rafFrame);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.cc} is-demo`}>
      <label className={styles.field}>
        <span className={styles.cap}>hex 값</span>
        <input ref={inputRef} className={styles.input} type="text" maxLength={7} defaultValue="#ff5b3c" aria-describedby="ccReadoutReact" />
      </label>
      <div className={styles.badge} aria-hidden="true">
        <span ref={swatchRef} className={styles.swatch} />
        <div ref={lumBoxRef} className={styles.lum}>
          <div ref={lumMarkRef} className={styles.lumMark} />
        </div>
        <span ref={statusRef} className={styles.status}>통과</span>
      </div>
      <p ref={readoutRef} className={styles.readout} id="ccReadoutReact" role="status" aria-live="polite" />
    </div>
  );
}
