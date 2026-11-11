import { useEffect, useRef } from "react";
import styles from "./EmbedLazyClickToLoad.module.scss";

// 클릭으로 불러오는 지연 임베드 — 자리표시의 실측 높이를 기준으로
// easeOutCubic 보간해 카드 높이를 계산으로 늘린다. 실키·실서버 요청 없음.
// 클릭 시 즉시 펼침(실사용자 리스너 있음).
const CYCLE_MS = 2000;
const PRESS_AT = 900;
const EXPAND_MS = 500;
const HINT_MS = 700;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawSeedThumb(canvas: HTMLCanvasElement, seed: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rnd = mulberry32(seed);
  const w = canvas.width;
  const h = canvas.height;
  const hues = [216, 32, 268, 168];
  ctx.fillStyle = "hsl(" + hues[Math.floor(rnd() * hues.length)] + ", 38%, 22%)";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    const cx = rnd() * w;
    const cy = rnd() * h;
    const r = (0.18 + rnd() * 0.3) * Math.min(w, h);
    ctx.fillStyle =
      "hsla(" +
      hues[Math.floor(rnd() * hues.length)] +
      ", " +
      (44 + rnd() * 22).toFixed(1) +
      "%, " +
      (38 + rnd() * 26).toFixed(1) +
      "%, .5)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255, 247, 230, .06)";
  for (let j = 0; j < h; j += 4) ctx.fillRect(0, j, w, 1);
}

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

export default function EmbedLazyClickToLoad() {
  const cardRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const frameThumbRef = useRef<HTMLCanvasElement>(null);
  const hintArrowRef = useRef<HTMLSpanElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const heightValueRef = useRef<HTMLSpanElement>(null);
  const pressAtOverrideRef = useRef(false);

  useEffect(() => {
    const card = cardRef.current;
    const placeholder = placeholderRef.current;
    const frame = frameRef.current;
    const frameThumb = frameThumbRef.current;
    const hintArrow = hintArrowRef.current;
    const progressBar = progressBarRef.current;
    const heightValueEl = heightValueRef.current;
    if (!card || !placeholder || !frame || !frameThumb || !hintArrow || !progressBar || !heightValueEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 340px)").matches;
    const FRAME_H = narrow ? 128 : 168;

    drawSeedThumb(frameThumb, 108);

    let pressed = false;
    let pressTime = 0;
    let phH = 0;
    let prevT = 0;

    function enterPressed(t: number) {
      pressed = true;
      pressTime = t;
      pressAtOverrideRef.current = false;
      phH = placeholder!.offsetHeight;
      placeholder!.setAttribute("aria-pressed", "true");
    }

    function resetToIdle() {
      pressed = false;
      phH = 0;
      card!.style.height = "";
      frame!.style.opacity = "0";
      progressBar!.style.transform = "scaleX(0)";
      placeholder!.setAttribute("aria-pressed", "false");
    }

    // 계산 겹: 자리표시의 실측 높이(phH)에서 FRAME_H 까지 easeOutCubic 으로 보간해
    // 카드 높이를 계산한다. 절반을 넘으면 실 프레임이 페이드로 등장하고,
    // 펼침이 끝난 뒤엔 남은 시간 동안 진행 바가 채워진다.
    function apply(t: number) {
      let h: number;
      const hintOpacity = 0.86 + 0.14 * Math.sin((2 * Math.PI * t) / HINT_MS);
      if (!pressed) {
        h = placeholder!.offsetHeight;
        card!.style.height = h + "px";
        hintArrow!.style.opacity = hintOpacity.toFixed(3);
      } else {
        let elapsed = t - pressTime;
        if (elapsed < 0) elapsed += CYCLE_MS;
        const delta = FRAME_H - phH;
        const p = easeOutCubic(Math.min(1, elapsed / EXPAND_MS));
        h = phH + delta * p;
        card!.style.height = h.toFixed(1) + "px";
        const frameOpacity = p <= 0.55 ? 0 : Math.min(1, (p - 0.55) / 0.45);
        frame!.style.opacity = frameOpacity.toFixed(3);
        const sweepSpan = CYCLE_MS - PRESS_AT - EXPAND_MS;
        const sweepP = Math.max(0, Math.min(1, (elapsed - EXPAND_MS) / sweepSpan));
        progressBar!.style.transform = "scaleX(" + sweepP.toFixed(3) + ")";
      }
      heightValueEl!.textContent = "높이 " + Math.round(h) + "px";
    }

    if (reduce) {
      apply(0);
      return;
    }

    let start: number | null = null;
    let raf = 0;
    function loop(ts: number) {
      if (start === null) start = ts;
      const raw = ts - start;
      const t = raw % CYCLE_MS;
      if (t < prevT) resetToIdle();
      prevT = t;
      if (!pressed && (pressAtOverrideRef.current || t >= PRESS_AT)) enterPressed(t);
      apply(t);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function handlePress() {
    pressAtOverrideRef.current = true;
  }

  function handleKeyDown(e: { key: string; preventDefault(): void }) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pressAtOverrideRef.current = true;
    }
  }

  return (
    <div className={styles.stage}>
      <section className={styles.panel}>
        <div className={styles.card} ref={cardRef}>
          <div
            className={styles.placeholder}
            ref={placeholderRef}
            role="button"
            tabIndex={0}
            aria-label="재생 항목 불러오기"
            aria-pressed="false"
            onClick={handlePress}
            onKeyDown={handleKeyDown}
          >
            <span className={styles.playIcon} aria-hidden="true" />
            <span className={styles.phLabel}>눌러서 불러오기</span>
            <span className={styles.phSub}>약 0.5MB 절약</span>
            <span className={styles.hintArrow} ref={hintArrowRef} aria-hidden="true" />
          </div>
          <div className={styles.frame} ref={frameRef} aria-hidden="true">
            <canvas className={styles.frameThumb} ref={frameThumbRef} width={240} height={120} />
            <div className={styles.frameScrim} />
            <div className={styles.frameContent}>
              <span className={styles.framePlay} aria-hidden="true" />
              <span className={styles.frameLabel}>불러온 영상 프레임</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressBar} ref={progressBarRef} />
            </div>
          </div>
        </div>
        <div className={styles.readout} aria-live="polite">
          <span className={styles.readoutLabel}>현재 높이</span>
          <span className={styles.readoutValue} ref={heightValueRef}>0px</span>
        </div>
      </section>
    </div>
  );
}
