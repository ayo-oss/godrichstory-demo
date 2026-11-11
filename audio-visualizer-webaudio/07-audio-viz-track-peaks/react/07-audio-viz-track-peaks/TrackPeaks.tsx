// TrackPeaks — vanilla 판(run/291/demo/07-audio-viz-track-peaks/index.html) 의 React 포트.
// 트랙 전체의 피크를 OfflineAudioContext 로 미리 뽑아 산 모양으로 그리고, 재생 위치까지만 색을 채운다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TrackPeaks.module.scss";

export type TrackPeaksProps = {
  /** 격자 미리보기용 2초 자동 루프. 재생을 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
/** ambient 타입에 useRef<T> 의 null 합집합이 없어 로컬로 좁힌다 */
type Box<T> = { current: T };

const COLS = 40;
const TRACK_SEC = 4;

/** 파형 산 모양 — 페이지가 열릴 때 오프라인 렌더로 합성 버퍼에서 뽑는다. 난수가 아니다. */
async function renderPeaks(): Promise<number[]> {
  const offline = new OfflineAudioContext(1, 44100 * TRACK_SEC, 44100);
  const oOut = offline.createGain();
  oOut.gain.value = 0.5;
  oOut.connect(offline.destination);
  [196, 246.94, 293.66, 392].forEach((hz, n) => {
    const osc = offline.createOscillator();
    const amp = offline.createGain();
    osc.type = n === 3 ? "triangle" : "sawtooth";
    osc.frequency.value = hz;
    amp.gain.value = 0;
    for (let beat = 0; beat < TRACK_SEC * 2; beat++) {
      const at = beat * 0.5;
      amp.gain.setValueAtTime(beat % 4 === n % 4 ? 0.9 : 0.25, at);
      amp.gain.exponentialRampToValueAtTime(0.02, at + 0.45);
    }
    osc.connect(amp);
    amp.connect(oOut);
    osc.start(0);
  });
  const buf = await offline.startRendering();
  const data = buf.getChannelData(0);
  const slice = Math.floor(data.length / COLS);
  const peaks: number[] = [];
  for (let c = 0; c < COLS; c++) {
    let peak = 0;
    for (let k = c * slice; k < (c + 1) * slice; k++) {
      peak = Math.max(peak, Math.abs(data[k]));
    }
    peaks.push(Math.max(0.14, peak));
  }
  return peaks;
}

export default function TrackPeaks({
  demo = true,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: TrackPeaksProps) {
  const [live, setLive] = useState(demo);
  const [playing, setPlaying] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const ctxBox = useRef(null) as Box<AudioContext | null>;
  const frameBox = useRef(0) as Box<number>;
  const startedBox = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    renderPeaks().then(setPeaks);
    return () => {
      cancelAnimationFrame(frameBox.current);
      if (ctxBox.current) {
        ctxBox.current.close();
      }
    };
  }, []);

  function buildAudio() {
    const ctx = new AudioContext();
    const out = ctx.createGain();
    out.gain.value = 0.06;
    out.connect(ctx.destination);
    // 파형을 뽑은 것과 같은 진행을 실시간으로 합성해 재생한다.
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
  }

  function draw() {
    const ctx = ctxBox.current;
    if (!ctx) {
      return;
    }
    // 재생 위치 — 트랙 길이로 나눈 나머지라 4초마다 처음으로 돌아간다.
    const t = (ctx.currentTime - startedBox.current) % TRACK_SEC;
    setPos(t / TRACK_SEC);
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
      startedBox.current = ctx.currentTime;
      ctx.resume();
      frameBox.current = requestAnimationFrame(draw);
    } else {
      ctx.suspend();
      cancelAnimationFrame(frameBox.current);
    }
  }

  const cls = [styles.root, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  const pct = (pos * 100).toFixed(1) + "%";
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
          <span>트랙 전체의 산 모양이 진짜 소리에서 나왔습니다</span>
        </p>
        <div className={styles.card}>
          <p className={styles.label}>미리듣기 트랙</p>
          <div
            className={styles.wave}
            role="progressbar"
            aria-label="재생 위치"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos * 100)}
          >
            <div className={styles.rowBase} aria-hidden="true">
              {peaks.map((h, i) => (
                <i className={styles.bar} key={i} style={{ height: `calc(${h.toFixed(3)} * 100%)` }} />
              ))}
            </div>
            <div className={styles.lit} style={{ "--p": pct } as CSSProperties} aria-hidden="true">
              <div className={styles.rowLit}>
                {peaks.map((h, i) => (
                  <i className={styles.bar} key={i} style={{ height: `calc(${h.toFixed(3)} * 100%)` }} />
                ))}
              </div>
            </div>
            <i className={styles.head} style={{ "--x": pct } as CSSProperties} aria-hidden="true" />
          </div>
          <p className={styles.time}>
            <span className={styles.now}>0:0{Math.min(Math.floor(pos * TRACK_SEC), TRACK_SEC - 1)}</span>
            <span className={styles.sep}>/</span>
            <span>0:04</span>
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
