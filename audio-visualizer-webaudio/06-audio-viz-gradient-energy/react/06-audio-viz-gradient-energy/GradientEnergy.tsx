// GradientEnergy — vanilla 판(run/291/demo/06-audio-viz-gradient-energy/index.html) 의 React 포트.
// 전체 에너지를 색상각 하나로 바꿔 판을 물들인다. --hue 는 @property 로 등록돼 있어 연속 보간된다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GradientEnergy.module.scss";

export type GradientEnergyProps = {
  /** 격자 미리보기용 2초 자동 루프. 재생을 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
/** ambient 타입에 useRef<T> 의 null 합집합이 없어 로컬로 좁힌다 */
type Box<T> = { current: T };

export default function GradientEnergy({
  demo = true,
  duration = 300,
  easing = "ease-out",
  color = "#ffd23f",
}: GradientEnergyProps) {
  const [live, setLive] = useState(demo);
  const [playing, setPlaying] = useState(false);
  const [energy, setEnergy] = useState(0.32);
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
    analyser.smoothingTimeConstant = 0.7;
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
    let sum = 0;
    for (let k = 0; k < freq.length; k++) {
      sum += freq[k];
    }
    setEnergy(Math.min(1, (sum / (freq.length * 255)) * 2.6)); // ×2.6 은 미터 눈금 보정
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
  // --hue 는 이 판 자신의 등록된 속성 — inherits: false 라 값을 쓰는 요소가 스스로 가져야 한다 (262 실측).
  const rootVars: Vars = { ...vars, "--hue": (200 + energy * 140).toFixed(1) + "deg" };
  return (
    <main className={styles.stage} style={rootVars}>
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
        <div className={styles.panel}>
          <p className={styles.label}>전체 에너지</p>
          <div className={styles.meter} aria-hidden="true">
            <i className={styles.fill} style={{ transform: `scaleX(${energy.toFixed(3)})` }} />
          </div>
          <p className={styles.read}>
            <span className={styles.readLabel}>지금 세기</span>
            <b className={styles.readBox}>
              <span className={styles.readText} aria-live="polite">
                {Math.round(energy * 100)}%
              </span>
              <span className={styles.loop} aria-hidden="true">
                <i>32%</i>
                <i>74%</i>
                <i>51%</i>
              </span>
            </b>
          </p>
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
        </div>
      </div>
    </main>
  );
}
