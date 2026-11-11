// RadialSpectrum — vanilla 판(run/291/demo/02-audio-viz-radial-spectrum/index.html) 의 React 포트.
// 주파수 구간 하나가 원 둘레의 막대 하나. 재생을 누르면 합성 음원의 AnalyserNode 값으로 막대가 자란다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RadialSpectrum.module.scss";

export type RadialSpectrumProps = {
  /** 격자 미리보기용 2초 자동 루프. 재생을 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type BarVars = CSSProperties & { "--i"?: string; "--h"?: string };
/** ambient 타입에 useRef<T> 의 null 합집합이 없어 로컬로 좁힌다 */
type Box<T> = { current: T };

const BAR_COUNT = 48;
const BAND_NAMES = ["저음", "중음", "고음"];

export default function RadialSpectrum({
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#4cd4a6",
}: RadialSpectrumProps) {
  const [live, setLive] = useState(demo);
  const [playing, setPlaying] = useState(false);
  const [heights, setHeights] = useState<number[]>([]);
  const [band, setBand] = useState(BAND_NAMES[0]);
  const ctxBox = useRef(null) as Box<AudioContext | null>;
  const nodeBox = useRef(null) as Box<AnalyserNode | null>;
  const frameBox = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameBox.current);
      if (ctxBox.current) {
        ctxBox.current.close();
      }
    };
  }, []);

  function buildAudio() {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.72;
    const out = ctx.createGain();
    out.gain.value = 0.06;
    out.connect(analyser);
    analyser.connect(ctx.destination);
    // 외부 음원 파일 없이 코드 진행을 직접 합성한다 — 네 박자마다 화음이 바뀐다.
    [196, 246.94, 293.66, 392].forEach((hz, n) => {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = n === 3 ? "triangle" : "sawtooth";
      osc.frequency.value = hz;
      amp.gain.value = 0;
      for (let beat = 0; beat < 64; beat++) {
        const at = ctx.currentTime + beat * 0.5;
        amp.gain.setValueAtTime(beat % 4 === n % 4 ? 0.9 : 0.25, at);
        amp.gain.exponentialRampToValueAtTime(0.02, at + 0.45);
      }
      osc.connect(amp);
      amp.connect(out);
      osc.start();
    });
    ctxBox.current = ctx;
    nodeBox.current = analyser;
  }

  function draw() {
    const analyser = nodeBox.current;
    if (!analyser) {
      return;
    }
    const freq = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freq);
    const sums = [0, 0, 0];
    const next: number[] = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const b = i % 16;
      const v = freq[b + 1] / 255;
      sums[Math.min(2, Math.floor(b / 6))] += v;
      next.push(0.08 + v * 0.92);
    }
    setHeights(next);
    setBand(BAND_NAMES[sums.indexOf(Math.max(sums[0], sums[1], sums[2]))]);
    frameBox.current = requestAnimationFrame(draw);
  }

  function toggle() {
    setLive(false);
    if (!ctxBox.current) {
      buildAudio();
    }
    const ctx = ctxBox.current;
    if (!ctx) {
      return;
    }
    const next = !playing;
    setPlaying(next);
    // 자동재생 정책: AudioContext 는 사용자 제스처 뒤 resume() 해야 소리가 난다.
    if (next) {
      ctx.resume();
      frameBox.current = requestAnimationFrame(draw);
    } else {
      ctx.suspend();
      cancelAnimationFrame(frameBox.current);
    }
  }

  const cls = [styles.root, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-waveform" viewBox="0 0 256 256" fill="currentColor">
            <path d="M208 96v64H48V96Z" opacity=".2" />
            <path d="M56 96v64a8 8 0 0 1-16 0V96a8 8 0 0 1 16 0m32-72a8 8 0 0 0-8 8v192a8 8 0 0 0 16 0V32a8 8 0 0 0-8-8m40 32a8 8 0 0 0-8 8v128a8 8 0 0 0 16 0V64a8 8 0 0 0-8-8m40 32a8 8 0 0 0-8 8v64a8 8 0 0 0 16 0V96a8 8 0 0 0-8-8m40-16a8 8 0 0 0-8 8v96a8 8 0 0 0 16 0V72a8 8 0 0 0-8-8" />
          </symbol>
          <symbol id="ico-play" viewBox="0 0 256 256" fill="currentColor">
            <path d="M228.23 134.69L84.15 222.81A8 8 0 0 1 72 216.12V39.88a8 8 0 0 1 12.15-6.69l144.08 88.12a7.82 7.82 0 0 1 0 13.38" opacity=".2" />
            <path d="M232.4 114.49L88.32 26.35a16 16 0 0 0-16.2-.3A15.86 15.86 0 0 0 64 39.87v176.26A15.94 15.94 0 0 0 80 232a16.07 16.07 0 0 0 8.36-2.35l144.04-88.14a15.88 15.88 0 0 0 0-27.02M80 215.94V40l143.83 88Z" />
          </symbol>
          <symbol id="ico-pause" viewBox="0 0 256 256" fill="currentColor">
            <path d="M208 48v160a8 8 0 0 1-8 8h-40a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8h40a8 8 0 0 1 8 8M96 40H56a8 8 0 0 0-8 8v160a8 8 0 0 0 8 8h40a8 8 0 0 0 8-8V48a8 8 0 0 0-8-8" opacity=".2" />
            <path d="M200 32h-40a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 176h-40V48h40zM96 32H56a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 176H56V48h40z" />
          </symbol>
        </defs>
      </svg>
      <div className={cls}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true">
            <use href="#ico-waveform" />
          </svg>
          <span>재생을 누르면 실제 소리로 움직입니다</span>
        </p>
        <div className={styles.dial} aria-hidden="true">
          <div className={styles.bars}>
            {Array.from({ length: BAR_COUNT }, (_, i) => {
              const barVars: BarVars = { "--i": String(i) };
              if (heights[i] !== undefined) {
                barVars["--h"] = heights[i].toFixed(3);
              }
              return <span className={styles.bar} key={i} style={barVars} />;
            })}
          </div>
          <div className={styles.hub}>
            <svg className={styles.hubIco} aria-hidden="true">
              <use href="#ico-waveform" />
            </svg>
          </div>
        </div>
        <div className={styles.foot}>
          <button className={styles.play} type="button" aria-pressed={playing} onClick={toggle}>
            <svg className={[styles.ico, playing ? styles.icoHidden : ""].join(" ")} aria-hidden="true">
              <use href="#ico-play" />
            </svg>
            <svg className={[styles.ico, playing ? "" : styles.icoHidden].join(" ")} aria-hidden="true">
              <use href="#ico-pause" />
            </svg>
            <span>{playing ? "정지" : "재생"}</span>
          </button>
          <p className={styles.level}>
            <span className={styles.levelLabel}>센 대역</span>
            <b className={styles.levelBox}>
              <span className={styles.levelText} aria-live="polite">
                {band}
              </span>
              <span className={styles.loop} aria-hidden="true">
                <i>저음</i>
                <i>중음</i>
                <i>고음</i>
              </span>
            </b>
          </p>
        </div>
      </div>
    </main>
  );
}
