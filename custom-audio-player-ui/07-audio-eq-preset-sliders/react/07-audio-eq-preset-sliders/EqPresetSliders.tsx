import { useEffect, useRef } from "react";
import styles from "./EqPresetSliders.module.scss";

type Bar = { el: HTMLDivElement | null; f1: number; p1: number; f2: number; p2: number; w2: number; base: number };

const BANDS = [
  { label: "저음", aria: "저음 반응폭" },
  { label: "중음", aria: "중음 반응폭" },
  { label: "고음", aria: "고음 반응폭" },
];

export default function EqPresetSliders() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const playRef = useRef<HTMLButtonElement | null>(null);
  const barsElRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sliderRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const BAND_COUNT = 3;
    const root = rootRef.current;
    const playBtn = playRef.current;
    const barsEls = (barsElRefs.current || []).filter((b): b is HTMLDivElement => !!b);
    const sliders = (sliderRefs.current || []).filter((s): s is HTMLInputElement => !!s);
    if (!root || !playBtn || barsEls.length !== BAND_COUNT || sliders.length !== BAND_COUNT) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    // 결정론 난수 — Math.random 을 쓰지 않는다. LCG(선형합동생성기) 하나로 막대별 위상·기준 높이를 만든다.
    function makeLcg(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    const BARS_PER_BAND = 6;
    const BAND_RESPONSE_RANGE = 1.6; // 슬라이더 반응폭 배율 상한 — 변형: 키우면 슬라이더를 움직였을 때 막대 그룹이 흔들리는 높이 차이가 더 커진다
    const rng = makeLcg(3307);

    const bands: Bar[][] = [];
    for (let b = 0; b < BAND_COUNT; b++) {
      const barsEl = barsEls[b]!;
      const bars: Bar[] = [];
      for (let i = 0; i < BARS_PER_BAND; i++) {
        const el = document.createElement("div");
        el.className = styles.bar;
        barsEl.appendChild(el);
        bars.push({
          el,
          f1: 0.5 + rng() * 0.35,
          p1: rng() * Math.PI * 2,
          f2: 1.3 + rng() * 0.6,
          p2: rng() * Math.PI * 2,
          w2: 0.2 + rng() * 0.2,
          base: 0.32 + rng() * 0.14,
        });
      }
      bands.push(bars);
    }

    function synth(bar: Bar, tSec: number) {
      const s1 = Math.sin(tSec * bar.f1 * Math.PI * 2 + bar.p1);
      const s2 = Math.sin(tSec * bar.f2 * Math.PI * 2 + bar.p2) * bar.w2;
      return (s1 + s2) / (1 + bar.w2); // -1..1
    }

    function human() { if (isDemo) { root!.classList.remove(styles["is-demo"]); isDemo = false; } }

    let playing = true, t0 = 0;

    function render(now: number) {
      const tSec = (now - t0) / 1000;
      const effPlaying = isDemo ? true : playing;
      for (let b = 0; b < BAND_COUNT; b++) {
        const norm = Number(sliders[b]!.value) / 100; // 0..1
        const amp = norm * BAND_RESPONSE_RANGE;
        const bars = bands[b];
        for (let i = 0; i < bars.length; i++) {
          const bar = bars[i];
          const sway = effPlaying ? synth(bar, tSec) : 0;
          let h = bar.base + sway * amp * 0.5;
          h = Math.max(0.06, Math.min(1, h));
          // 막대는 바닥이 기준점이라 아래쪽 원점으로 세로로만 자란다 — 중심 기준이 아닌 실제 앵커 지점
          bar.el!.style.transform = "scaleY(" + h + ")";
        }
      }
    }

    function setPlaying(next: boolean) {
      playing = next;
      root!.classList.toggle(styles["is-playing"], next);
    }

    function onPlayClick() { human(); setPlaying(!playing); }
    function onPlayKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); human(); setPlaying(!playing); }
    }
    function onSliderInput() { human(); }
    function onReduceSliderInput() { human(); render(performance.now()); }

    sliders.forEach((s) => s!.addEventListener("input", reduce ? onReduceSliderInput : onSliderInput));

    let driveStart = 0;
    function triangle(frac: number) { return frac < 0.5 ? frac * 2 : 2 - frac * 2; }
    let raf = 0;
    function frame(now: number) {
      if (!t0) t0 = now;
      if (isDemo) {
        if (!driveStart) driveStart = now;
        const DRIVE_PERIOD_MS = 2000; // 렌더 캐처 창(설정 초=2.0)과 같은 주기 — 시연 전용
        for (let b = 0; b < BAND_COUNT; b++) {
          const phase = b / BAND_COUNT;
          const frac = ((now - driveStart) / DRIVE_PERIOD_MS + phase) % 1;
          sliders[b]!.value = String(Math.round(triangle(frac) * 100));
        }
      }
      render(now);
      raf = requestAnimationFrame(frame);
    }

    function onReduceClick() { human(); setPlaying(!playing); render(performance.now()); }
    function onReduceKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); human(); setPlaying(!playing); render(performance.now()); }
    }

    if (reduce) {
      root.classList.add(styles["is-still"]);
      t0 = performance.now();
      render(t0);
      playBtn.addEventListener("click", onReduceClick);
      playBtn.addEventListener("keydown", onReduceKeydown);
    } else {
      playBtn.addEventListener("click", onPlayClick);
      playBtn.addEventListener("keydown", onPlayKeydown);
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      sliders.forEach((s) => s!.removeEventListener("input", reduce ? onReduceSliderInput : onSliderInput));
      if (reduce) {
        playBtn.removeEventListener("click", onReduceClick);
        playBtn.removeEventListener("keydown", onReduceKeydown);
      } else {
        playBtn.removeEventListener("click", onPlayClick);
        playBtn.removeEventListener("keydown", onPlayKeydown);
      }
      barsEls.forEach((el) => { if (el) el.innerHTML = ""; });
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.peq + " " + styles["is-demo"] + " " + styles["is-playing"]} ref={rootRef}>
        <p className={styles.hint}><span>슬라이더 값을 올리면 그 대역 막대 그룹이 흔들리는 반응폭이 커집니다</span></p>
        <div className={styles.panel}>
          <button className={styles.play} ref={playRef} type="button" aria-label="재생">
            <svg className={`${styles.ico} ${styles.icoPlay}`} aria-hidden="true"><use href="#ico-play" /></svg>
            <svg className={`${styles.ico} ${styles.icoPause}`} aria-hidden="true"><use href="#ico-pause" /></svg>
          </button>
          <div className={styles.bands}>
            {BANDS.map((band, i) => (
              <div className={styles.band} key={band.label} data-band={i}>
                <div className={styles.bars} ref={(el: HTMLDivElement | null) => { if (barsElRefs.current) barsElRefs.current[i] = el; }} aria-hidden="true" />
                <input
                  className={styles.slider}
                  type="range"
                  min={0}
                  max={100}
                  defaultValue={30}
                  ref={(el: HTMLInputElement | null) => { if (sliderRefs.current) sliderRefs.current[i] = el; }}
                  aria-label={band.aria}
                />
                <span className={styles.label}>{band.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
