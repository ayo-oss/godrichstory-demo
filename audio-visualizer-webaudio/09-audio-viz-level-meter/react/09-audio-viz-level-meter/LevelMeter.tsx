// LevelMeter — vanilla 판(run/291/demo/09-audio-viz-level-meter/index.html) 의 React 포트.
// RMS 로 세그먼트 LED 를 아래부터 켜고, 가장 높았던 칸에 선이 잠시 머문다(피크 홀드).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LevelMeter.module.scss";

export type LevelMeterProps = {
  /** 격자 미리보기용 2초 자동 루프. 재생을 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
/** ambient 타입에 useRef<T> 의 null 합집합이 없어 로컬로 좁힌다 */
type Box<T> = { current: T };

const SEGS = 12;

export default function LevelMeter({
  demo = true,
  duration = 220,
  easing = "ease-out",
  color = "#17141a",
}: LevelMeterProps) {
  const [live, setLive] = useState(demo);
  const [playing, setPlaying] = useState(false);
  const [fill, setFill] = useState(30);
  const [db, setDb] = useState(-12);
  const ctxBox = useRef(null) as Box<AudioContext | null>;
  const nodeBox = useRef(null) as Box<AnalyserNode | null>;
  const frameBox = useRef(0) as Box<number>;
  const peakBox = useRef(0.3) as Box<number>;
  const holdBox = useRef(0) as Box<number>;
  const wrapBox = useRef<HTMLDivElement | null>(null);
  const [pkPx, setPkPx] = useState(36);
  const [snap, setSnap] = useState(false);
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
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.5;
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
    // RMS — 제곱 평균 제곱근. 진폭의 평균이 아니라 에너지의 평균이라 미터의 눈금과 맞다.
    const wave = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(wave);
    let sum = 0;
    for (let k = 0; k < wave.length; k++) {
      const v = (wave[k] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / wave.length);
    const frac = Math.min(1, rms * 3.4); // ×3.4 는 미터 눈금 보정 — 재생 음량은 바꾸지 않는다
    setFill(frac * 100);
    // 피크 홀드 — 더 높은 순간이 오면 즉시 올라가 900ms 붙어 있다가 서서히 내려온다.
    const now = performance.now();
    if (frac >= peakBox.current) {
      peakBox.current = frac;
      holdBox.current = now + 900;
      setSnap(true);
    } else if (now > holdBox.current) {
      peakBox.current = Math.max(frac, peakBox.current - 0.01);
      setSnap(false);
    }
    if (wrapBox.current) {
      setPkPx(peakBox.current * wrapBox.current.clientHeight);
    }
    setDb(Math.max(-40, Math.round(20 * Math.log(Math.max(rms, 0.001)) / Math.log(10))));
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
  const rootVars: Vars = { ...vars, "--fill": fill.toFixed(1) + "%" };
  const segs = Array.from({ length: SEGS }, (_, i) => <i key={i} />);
  return (
    <main className={styles.stage} style={rootVars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-speaker-high" viewBox="0 0 256 256" fill="currentColor">
            <path d="M80 88v80H32a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8Z" opacity=".2" />
            <path d="M155.51 24.81a8 8 0 0 0-8.42.88L77.25 80H32a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h45.25l69.84 54.31A8 8 0 0 0 160 224V32a8 8 0 0 0-4.49-7.19M32 96h40v64H32Zm112 111.64l-56-43.55V91.91l56-43.55Zm54-106.08a40 40 0 0 1 0 52.88a8 8 0 0 1-12-10.58a24 24 0 0 0 0-31.72a8 8 0 0 1 12-10.58m28-27a80 80 0 0 1 0 106.88a8 8 0 0 1-12-10.64a64 64 0 0 0 0-85.6a8 8 0 0 1 12-10.64" />
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
            <use href="#ico-speaker-high" />
          </svg>
          <span>재생을 누르면 실제 소리로 움직입니다</span>
        </p>
        <div className={styles.body}>
          <div className={styles.colWrap} ref={wrapBox} aria-hidden="true">
            <div className={styles.colOff}>{segs}</div>
            <div className={styles.lit}>
              <div className={styles.colOn}>{segs}</div>
            </div>
            <i
              className={[styles.peak, snap ? styles.peakSnap : ""].join(" ")}
              style={{ transform: `translateY(-${pkPx.toFixed(1)}px)` }}
            />
          </div>
          <p className={styles.read}>
            <span className={styles.readLabel}>입력 레벨</span>
            <b className={styles.db}>
              <span className={styles.dbText} aria-live="polite">
                {db} dB
              </span>
              <span className={styles.loop} aria-hidden="true">
                <i>-12 dB</i>
                <i>-4 dB</i>
                <i>-8 dB</i>
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
