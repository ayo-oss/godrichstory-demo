import { useEffect, useRef } from "react";
import styles from "./TimezoneCardStack.module.scss";

const OFFSETS = [-8, 0, 9, 5.5];

type CardRow = { off: number; el: HTMLDivElement; offsetEl: HTMLElement; timeEl: HTMLElement };

export default function TimezoneCardStack() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cardsBoxRef = useRef<HTMLDivElement | null>(null);
  const readoutRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const input = inputRef.current;
    const cardsBox = cardsBoxRef.current;
    const readout = readoutRef.current;
    if (!root || !input || !cardsBox || !readout) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    const cards: CardRow[] = OFFSETS.map((off) => {
      const el = document.createElement("div");
      el.className = styles.card;
      const offsetEl = document.createElement("span");
      offsetEl.className = styles.offset;
      const timeEl = document.createElement("span");
      timeEl.className = styles.time;
      el.appendChild(offsetEl);
      el.appendChild(timeEl);
      cardsBox.appendChild(el);
      return { off, el, offsetEl, timeEl };
    });

    function human() {
      if (isDemo) {
        root!.classList.remove("is-demo");
        isDemo = false;
      }
    }

    function pad2(n: number) {
      return (n < 10 ? "0" : "") + n;
    }
    function formatOffset(off: number) {
      const sign = off >= 0 ? "+" : "-";
      const abs = Math.abs(off);
      const h = Math.floor(abs);
      const m = Math.round((abs - h) * 60);
      return "UTC" + sign + h + (m ? ":" + pad2(m) : "");
    }
    function addOffsetMinutes(baseMinutes: number, offsetHours: number) {
      let total = (baseMinutes + offsetHours * 60) % 1440;
      if (total < 0) total += 1440;
      return total;
    }
    function isDaytime(minutes: number) {
      return minutes >= 360 && minutes < 1080;
    }
    function clamp01(v: number) {
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }
    function brightnessOf(minutes: number) {
      const distFromNoon = Math.abs(minutes - 720) / 720;
      return clamp01(1 - distFromNoon * 0.7);
    }

    const SENT_PREFIX = "기준 ";
    const SENT_MID = " 시각일 때 첫 카드는 ";
    const SENT_SUFFIX = "입니다";

    let targets = OFFSETS.map(() => 0);
    let rendered = OFFSETS.map(() => 0);
    const LERP_RATE = 0.15;

    function readBaseMinutes() {
      const parts = input!.value.split(":");
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      return h * 60 + m;
    }

    function applyValue(baseMinutes: number) {
      cards.forEach((card, i) => {
        const minutes = addOffsetMinutes(baseMinutes, card.off);
        const h = Math.floor(minutes / 60);
        const m = Math.floor(minutes % 60);
        card.offsetEl.textContent = formatOffset(card.off);
        card.timeEl.textContent = pad2(h) + ":" + pad2(m);
        card.el.classList.toggle("is-night", !isDaytime(minutes));
        targets[i] = brightnessOf(minutes);
        if (reduce) rendered[i] = targets[i];
      });
      const bh = Math.floor(baseMinutes / 60);
      const bm = Math.floor(baseMinutes % 60);
      const first = cards[0];
      const firstMinutes = addOffsetMinutes(baseMinutes, first.off);
      const fh = Math.floor(firstMinutes / 60);
      const fm = Math.floor(firstMinutes % 60);
      readout!.textContent =
        SENT_PREFIX + pad2(bh) + ":" + pad2(bm) + SENT_MID + pad2(fh) + ":" + pad2(fm) + SENT_SUFFIX;
      if (reduce) paint();
    }

    function paint() {
      cards.forEach((card, i) => {
        card.el.style.setProperty("--b", rendered[i].toFixed(3));
      });
    }

    function onInput() {
      human();
      applyValue(readBaseMinutes());
    }
    input.addEventListener("input", onInput);
    input.addEventListener("change", onInput);

    const DEMO_TIMES = ["09:30", "14:00", "23:15", "03:45", "18:20"];
    const DRIVE_PERIOD_MS = 2000;
    let driveStart = 0;
    let lastIdx = -1;
    let rafDrive = 0;
    function driveTick(now: number) {
      if (!driveStart) driveStart = now;
      if (isDemo) {
        const frac = ((now - driveStart) % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
        const idx = Math.floor(frac * DEMO_TIMES.length);
        if (idx !== lastIdx) {
          lastIdx = idx;
          input!.value = DEMO_TIMES[idx];
          applyValue(readBaseMinutes());
        }
      }
      rafDrive = requestAnimationFrame(driveTick);
    }

    let rafFrame = 0;
    function frame() {
      rendered = rendered.map((v, i) => v + (targets[i] - v) * LERP_RATE);
      paint();
      rafFrame = requestAnimationFrame(frame);
    }

    applyValue(readBaseMinutes());

    if (!reduce) {
      rafDrive = requestAnimationFrame(driveTick);
      rafFrame = requestAnimationFrame(frame);
    }

    return () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("change", onInput);
      if (rafDrive) cancelAnimationFrame(rafDrive);
      if (rafFrame) cancelAnimationFrame(rafFrame);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.tz} is-demo`}>
      <label className={styles.field}>
        <span className={styles.cap}>기준 시각</span>
        <input ref={inputRef} className={styles.input} type="time" step={60} defaultValue="09:30" aria-describedby="tzReadoutReact" />
      </label>
      <div ref={cardsBoxRef} className={styles.cards} aria-hidden="true" />
      <p ref={readoutRef} className={styles.readout} id="tzReadoutReact" role="status" aria-live="polite" />
    </div>
  );
}
