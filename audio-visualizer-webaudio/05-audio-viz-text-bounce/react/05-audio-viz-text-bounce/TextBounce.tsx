// TextBounce — vanilla 판(run/291/demo/05-audio-viz-text-bounce/index.html) 의 React 포트.
// 제목의 글자를 저·중·고 대역에 나눠 건다. 대역마다 다른 글자가 튄다(글자는 자기 중심에서 커진다).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TextBounce.module.scss";

export type TextBounceProps = {
  /** 격자 미리보기용 2초 자동 루프. 재생을 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type LetterVars = CSSProperties & { "--j"?: string };
/** ambient 타입에 useRef<T> 의 null 합집합이 없어 로컬로 좁힌다 */
type Box<T> = { current: T };

const BAND_NAMES = ["저음", "중음", "고음"];
/** 브랜드 낱말이라 로케일을 안 탄다. data-band 로 저·중·고에 나눠 건다 */
const LETTERS: { ch: string; band: number }[] = [
  { ch: "G", band: 0 },
  { ch: "O", band: 1 },
  { ch: "D", band: 2 },
  { ch: "R", band: 0 },
  { ch: "I", band: 1 },
  { ch: "C", band: 2 },
  { ch: "H", band: 1 },
];

export default function TextBounce({
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#17141a",
}: TextBounceProps) {
  const [live, setLive] = useState(demo);
  const [playing, setPlaying] = useState(false);
  const [bands, setBands] = useState<number[]>([0, 0, 0]);
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
    analyser.smoothingTimeConstant = 0.6;
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
    // 대역 세 개의 에너지를 0~1 로 만들어 글자의 --j 로 넣는다(중·고음 게인 보정은 vanilla 주석 참조).
    const GAIN = [1, 1.5, 2.2];
    const next = [0, 0, 0];
    for (let k = 1; k <= 10; k++) {
      const b = k <= 2 ? 0 : k <= 5 ? 1 : 2;
      next[b] += freq[k] / 255 / (b === 0 ? 2 : b === 1 ? 3 : 5);
    }
    for (let j = 0; j < 3; j++) {
      next[j] = Math.min(1, next[j] * GAIN[j]);
    }
    setBands(next);
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
  const top = bands.indexOf(Math.max(bands[0], bands[1], bands[2]));
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
        <h2 className={styles.title} aria-label="GODRICH">
          {LETTERS.map((l, i) => {
            const letterVars: LetterVars = { "--j": bands[l.band].toFixed(3) };
            return (
              <b className={styles.l} key={i} style={letterVars}>
                {l.ch}
              </b>
            );
          })}
        </h2>
        <ul className={styles.legend} aria-hidden="true">
          <li className={styles.bandLow}>저음</li>
          <li className={styles.bandMid}>중음</li>
          <li className={styles.bandHigh}>고음</li>
        </ul>
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
                {BAND_NAMES[top]}
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
