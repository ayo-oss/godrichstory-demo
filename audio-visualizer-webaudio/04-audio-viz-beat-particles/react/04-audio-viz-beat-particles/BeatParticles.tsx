// BeatParticles — vanilla 판(run/291/demo/04-audio-viz-beat-particles/index.html) 의 React 포트.
// 저음 에너지가 자기 이동 평균을 넘는 순간(비트)에 겹 하나가 터진다. 코어는 늘 그 자리에 남는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BeatParticles.module.scss";

export type BeatParticlesProps = {
  /** 격자 미리보기용 2초 자동 루프. 재생을 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type DotVars = CSSProperties & { "--a"?: string; "--i"?: string };
/** ambient 타입에 useRef<T> 의 null 합집합이 없어 로컬로 좁힌다 */
type Box<T> = { current: T };

const RING_COUNT = 4;
const DOT_COUNT = 8;

export default function BeatParticles({
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#ffd23f",
}: BeatParticlesProps) {
  const [live, setLive] = useState(demo);
  const [playing, setPlaying] = useState(false);
  const [beats, setBeats] = useState(0);
  const [hitRing, setHitRing] = useState(-1);
  const [coreHit, setCoreHit] = useState(false);
  const ctxBox = useRef(null) as Box<AudioContext | null>;
  const nodeBox = useRef(null) as Box<AnalyserNode | null>;
  const frameBox = useRef(0) as Box<number>;
  const avgBox = useRef(0) as Box<number>;
  const lastBeatBox = useRef(0) as Box<number>;
  const turnBox = useRef(0) as Box<number>;
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
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.5;
    const out = ctx.createGain();
    out.gain.value = 0.08;
    out.connect(analyser);
    analyser.connect(ctx.destination);
    // 킥 — 낮은 사인파를 0.5초마다 한 번씩 쳐서 2초에 네 번 비트(120BPM).
    const kick = ctx.createOscillator();
    const kickAmp = ctx.createGain();
    kick.type = "sine";
    kick.frequency.value = 70;
    kickAmp.gain.value = 0;
    for (let b = 0; b < 128; b++) {
      const at = ctx.currentTime + b * 0.5;
      kickAmp.gain.setValueAtTime(1, at);
      kickAmp.gain.exponentialRampToValueAtTime(0.004, at + 0.3);
    }
    kick.connect(kickAmp);
    kickAmp.connect(out);
    kick.start();
    // 패드 — "평균보다 큰 순간"이 성립하려면 바닥 에너지가 필요하다.
    [110, 164.81, 220].forEach((hz) => {
      const pad = ctx.createOscillator();
      const padAmp = ctx.createGain();
      pad.type = "sawtooth";
      pad.frequency.value = hz;
      padAmp.gain.value = 0.035;
      pad.connect(padAmp);
      padAmp.connect(out);
      pad.start();
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
    let bass = 0;
    for (let k = 0; k < 4; k++) {
      bass += freq[k];
    }
    bass = bass / (4 * 255);
    const now = performance.now();
    // 비트 판정: 저음 에너지가 직전 구간의 이동 평균 × 1.3 을 넘는 순간이다(고정 문턱은 셈여림에 약하다).
    if (bass > avgBox.current * 1.3 && bass > 0.14 && now - lastBeatBox.current > 220) {
      lastBeatBox.current = now;
      turnBox.current += 1;
      setBeats(turnBox.current);
      setHitRing(turnBox.current % RING_COUNT);
      setCoreHit(true);
      window.setTimeout(() => setCoreHit(false), 460);
    }
    avgBox.current += (bass - avgBox.current) * 0.12;
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
  const rings = Array.from({ length: RING_COUNT }, (_, r) => (
    <div className={[styles.ring, hitRing === r ? styles.ringHit : ""].join(" ")} key={r}>
      {Array.from({ length: DOT_COUNT }, (_, d) => {
        const dotVars: DotVars = {
          "--a": (((d * 45 + r * 11.25) % 360)).toFixed(2) + "deg",
          "--i": String(r),
        };
        return <i className={styles.dot} key={d} style={dotVars} />;
      })}
    </div>
  ));
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
        <div className={styles.field} aria-hidden="true">
          {rings}
          <div className={[styles.core, coreHit ? styles.coreHit : ""].join(" ")}>
            <svg className={styles.coreIco} aria-hidden="true">
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
          <p className={styles.count}>
            <span className={styles.countLabel}>잡은 비트</span>
            <b className={styles.countBox}>
              <span className={styles.countText} aria-live="polite">
                {beats}
              </span>
              <span className={styles.loop} aria-hidden="true">
                <i>1</i>
                <i>3</i>
                <i>5</i>
                <i>7</i>
              </span>
            </b>
          </p>
        </div>
      </div>
    </main>
  );
}
