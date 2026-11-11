// MicInput — vanilla 판(run/291/demo/08-audio-viz-mic-input/index.html) 의 React 포트.
// getUserMedia 로 권한을 물어 허락되면 목소리가, 거절되면 합성음이 같은 고리를 움직인다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MicInput.module.scss";

export type MicInputProps = {
  /** 격자 미리보기용 2초 자동 루프. 마이크를 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type BarVars = CSSProperties & { "--i"?: string; "--h"?: string };
/** ambient 타입에 useRef<T> 의 null 합집합이 없어 로컬로 좁힌다 */
type Box<T> = { current: T };

const BAR_COUNT = 24;

export default function MicInput({
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: MicInputProps) {
  const [live, setLive] = useState(demo);
  const [running, setRunning] = useState(false);
  const [heights, setHeights] = useState<number[]>([]);
  const [status, setStatus] = useState("버튼을 누르면 마이크 권한을 물어봅니다");
  const [micLabel, setMicLabel] = useState("마이크 켜기");
  const ctxBox = useRef(null) as Box<AudioContext | null>;
  const nodeBox = useRef(null) as Box<AnalyserNode | null>;
  const frameBox = useRef(0) as Box<number>;
  const micOnBox = useRef(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameBox.current);
      if (ctxBox.current) {
        ctxBox.current.close();
      }
    };
  }, []);

  function ensureCtx() {
    if (ctxBox.current) {
      return;
    }
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256; // 256 → 빈 간격 187.5Hz — 폴백 사인파(220Hz)와 목소리 기본주파수가 맵핑된 빈에 들어온다
    analyser.smoothingTimeConstant = 0.7;
    analyser.connect(ctx.destination);
    ctxBox.current = ctx;
    nodeBox.current = analyser;
  }

  function fallbackTone() {
    const ctx = ctxBox.current;
    const analyser = nodeBox.current;
    if (!ctx || !analyser) {
      return;
    }
    // 거절 폴백 — 낮은 사인파 하나. "합성음으로 돌아갔다"가 한눈에 보인다.
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 220;
    amp.gain.value = 0;
    for (let beat = 0; beat < 128; beat++) {
      const at = ctx.currentTime + beat * 0.5;
      amp.gain.setValueAtTime(0.5, at);
      amp.gain.exponentialRampToValueAtTime(0.02, at + 0.4);
    }
    osc.connect(amp);
    amp.connect(analyser);
    osc.start();
  }

  function draw() {
    const analyser = nodeBox.current;
    if (!analyser) {
      return;
    }
    const freq = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freq);
    const next: number[] = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const band = Math.abs((i % 16) - 8);
      next.push(0.1 + (freq[band + 1] / 255) * 0.9);
    }
    setHeights(next);
    frameBox.current = requestAnimationFrame(draw);
  }

  function toggle() {
    setLive(false);
    if (running) {
      stopAll();
      return;
    }
    ensureCtx();
    const ctx = ctxBox.current;
    if (!ctx) {
      return;
    }
    // 자동재생 정책: AudioContext 는 사용자 제스처 안에서 resume() 해야 한다.
    ctx.resume();
    setRunning(true);
    setMicLabel("끄기");
    setStatus("마이크 권한을 기다립니다");
    micOnBox.current = false;
    const p =
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia
        ? navigator.mediaDevices.getUserMedia({ audio: true })
        : Promise.reject(new Error("no mediaDevices"));
    p.then((stream) => {
      micOnBox.current = true;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(nodeBox.current as AnalyserNode); // 스피커로 돌려주지 않는다 — 하울링이 일어난다
      setStatus("마이크 입력 중 — 말해 보세요");
      frameBox.current = requestAnimationFrame(draw);
    }).catch(() => {
      // 거절은 정상 경로다 — 화면이 비지 않게 합성음이 같은 고리를 잇는다.
      micOnBox.current = false;
      fallbackTone();
      setStatus("권한 거부 — 합성음으로 대체했습니다");
      frameBox.current = requestAnimationFrame(draw);
    });
  }

  function stopAll() {
    cancelAnimationFrame(frameBox.current);
    if (ctxBox.current) {
      ctxBox.current.suspend();
    }
    setRunning(false);
    setMicLabel("마이크 켜기");
    setStatus(micOnBox.current ? "마이크를 멈췄습니다" : "합성음을 멈췄습니다");
  }

  const cls = [styles.root, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-microphone" viewBox="0 0 256 256" fill="currentColor">
            <path d="M168 64v64a40 40 0 0 1-40 40a40 40 0 0 1-40-40V64a40 40 0 0 1 40-40a40 40 0 0 1 40 40" opacity=".2" />
            <path d="M128 176a48.05 48.05 0 0 0 48-48V64a48 48 0 0 0-96 0v64a48.05 48.05 0 0 0 48 48M96 64a32 32 0 0 1 64 0v64a32 32 0 0 1-64 0Zm40 143.6V240a8 8 0 0 1-16 0v-32.4A80.11 80.11 0 0 1 48 128a8 8 0 0 1 16 0a64 64 0 0 0 128 0a8 8 0 0 1 16 0a80.11 80.11 0 0 1-72 79.6" />
          </symbol>
        </defs>
      </svg>
      <div className={cls}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true">
            <use href="#ico-microphone" />
          </svg>
          <span>마이크는 물어보고 씁니다 — 거절해도 화면은 삽니다</span>
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
        </div>
        <button className={styles.btn} type="button" aria-pressed={running} onClick={toggle}>
          <svg className={styles.btnIco} aria-hidden="true">
            <use href="#ico-microphone" />
          </svg>
          <span>{micLabel}</span>
        </button>
        <p className={styles.status} aria-live="polite">
          <span>{status}</span>
          <span className={styles.statusLoop} aria-hidden="true">
            <i>마이크 권한을 기다립니다</i>
            <i>마이크 입력 중 — 말해 보세요</i>
            <i>권한 거부 — 합성음으로 대체했습니다</i>
          </span>
        </p>
      </div>
    </main>
  );
}
