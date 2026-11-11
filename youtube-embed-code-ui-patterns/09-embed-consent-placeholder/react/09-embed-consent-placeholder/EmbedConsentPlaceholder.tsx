import { useEffect, useRef } from "react";
import styles from "./EmbedConsentPlaceholder.module.scss";

// 동의 후 불러오는 임베드(09) — 안내 블록의 실측 높이를 접힘 진행도에 맞춰
// 그대로 프레임 높이로 넘긴다(계산 겹). 실키·실서버 요청 없음.
// 동의 버튼 클릭 시 즉시 전환(실사용자 리스너 있음).
const CYCLE_MS = 2000;
const CONSENT_AT = 700;
const CONSENT_FOLD_MS = 200;
const DOT_MS = 700;

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

export default function EmbedConsentPlaceholder() {
  const noticeRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const frameThumbRef = useRef<HTMLCanvasElement>(null);
  const statusDotRef = useRef<HTMLSpanElement>(null);
  const consentBtnRef = useRef<HTMLButtonElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const consentOverrideRef = useRef(false);

  useEffect(() => {
    const notice = noticeRef.current;
    const frame = frameRef.current;
    const frameThumb = frameThumbRef.current;
    const statusDot = statusDotRef.current;
    const consentBtn = consentBtnRef.current;
    const progressBar = progressBarRef.current;
    if (!notice || !frame || !frameThumb || !statusDot || !consentBtn || !progressBar) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 340px)").matches;
    const FRAME_BASE_H = narrow ? 56 : 96;

    drawSeedThumb(frameThumb, 109);

    let consented = false;
    let consentTime = 0;
    let noticeH = 0;
    let prevT = 0;

    function enterConsent(t: number) {
      consented = true;
      consentTime = t;
      consentOverrideRef.current = false;
      noticeH = notice!.offsetHeight;
      consentBtn!.setAttribute("aria-expanded", "false");
    }

    function resetToIdle() {
      consented = false;
      noticeH = 0;
      notice!.style.height = "";
      frame!.style.height = "0px";
      progressBar!.style.transform = "scaleX(0)";
      consentBtn!.setAttribute("aria-expanded", "true");
    }

    // 계산 겹: 동의 순간 안내 블록의 실측 높이(noticeH)를 접힘 진행도(p)에 맞춰
    // 그대로 프레임 높이 증가분으로 넘긴다 — 안내가 접히는 만큼 프레임이 자란다.
    function apply(t: number) {
      const dotOpacity = 0.86 + 0.14 * Math.sin((2 * Math.PI * t) / DOT_MS);
      if (!consented) {
        statusDot!.style.opacity = dotOpacity.toFixed(3);
        return;
      }
      let elapsed = t - consentTime;
      if (elapsed < 0) elapsed += CYCLE_MS;
      const p = easeOutCubic(Math.min(1, elapsed / CONSENT_FOLD_MS));
      notice!.style.height = (noticeH * (1 - p)).toFixed(1) + "px";
      frame!.style.height = (FRAME_BASE_H + noticeH * p).toFixed(1) + "px";
      const sweepSpan = CYCLE_MS - CONSENT_AT - CONSENT_FOLD_MS;
      const sweepP = Math.max(0, Math.min(1, (elapsed - CONSENT_FOLD_MS) / sweepSpan));
      progressBar!.style.transform = "scaleX(" + sweepP.toFixed(3) + ")";
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
      if (!consented && (consentOverrideRef.current || t >= CONSENT_AT)) enterConsent(t);
      apply(t);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleConsent() {
    consentOverrideRef.current = true;
  }

  return (
    <div className={styles.stage}>
      <section className={styles.panel}>
        <div className={styles.card}>
          <div className={styles.notice} ref={noticeRef}>
            <div className={styles.noticeHead}>
              <span className={styles.statusDot} ref={statusDotRef} aria-hidden="true" />
              <span className={styles.noticeLead}>이 영상은 외부 서비스에서 불러옵니다.</span>
            </div>
            <p className={styles.noticeSub}>동의하면 이 자리에 불러옵니다.</p>
            <button
              type="button"
              className={styles.consentBtn}
              ref={consentBtnRef}
              aria-expanded="true"
              onClick={handleConsent}
            >
              동의하고 불러오기
            </button>
          </div>
          <div className={styles.frame} ref={frameRef} aria-hidden="true">
            <canvas className={styles.frameThumb} ref={frameThumbRef} width={240} height={80} />
            <div className={styles.frameScrim} />
            <div className={styles.frameContent}>
              <span className={styles.framePlay} aria-hidden="true" />
              <span className={styles.frameLabel}>동의 후 재생되는 영상</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressBar} ref={progressBarRef} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
