// LiquidFillWaveBookmark — vanilla 판(run/416/demo/05-bookmark-btn-liquid-fill-wave/index.html) 의 React 포트.
// 값 하나: 물 높이(level) + 시간 위상(phase) → 매 프레임 다시 계산한 사인 물결 SVG path + 배경 톤.
import { useEffect, useRef, useState } from "react";
import styles from "./LiquidFillWaveBookmark.module.scss";

type Box<T> = { current: T };

const WAVE_AMPLITUDE = 1.15;
const WAVE_FREQUENCY = 0.85;
const WAVE_SPEED = 2.6;
const LEVEL_LERP = 0.16;
const CYCLE_S = 2;

function waveD(lv: number, phase: number): string {
  const baseY = 24 * (1 - lv);
  let d = "M0," + (baseY + WAVE_AMPLITUDE * Math.sin(phase)).toFixed(2) + " ";
  for (let x = 0; x <= 24; x += 2) {
    const y = baseY + WAVE_AMPLITUDE * Math.sin(x * WAVE_FREQUENCY * 0.26 + phase);
    d += "L" + x + "," + y.toFixed(2) + " ";
  }
  d += "L24,24 L0,24 Z";
  return d;
}

export default function LiquidFillWaveBookmark() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const waveRef = useRef<SVGPathElement | null>(null);
  const levelRef = useRef<number>(0) as Box<number>;
  const targetRef = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [saved, setSaved] = useState(false);
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    let start = 0;
    let prevT = 0;
    let toggledA = false;
    let toggledB = false;
    let phase = 0;
    function loop(now: number): void {
      if (start === 0) start = now;
      const t = ((now - start) / 1000) % CYCLE_S;
      if (t < prevT) { toggledA = false; toggledB = false; }
      prevT = t;
      if (!reduce && demo) {
        if (!toggledA && t > 0.25) { toggledA = true; setSaved(true); targetRef.current = 1; }
        if (!toggledB && t > 1.25) { toggledB = true; setSaved(false); targetRef.current = 0; }
      }
      if (reduce) {
        // 정지: 물 높이는 목표값으로 즉시 고정, 위상은 갱신하지 않아 물결이 멈춘 채로 표시된다.
        levelRef.current = targetRef.current;
      } else {
        levelRef.current += (targetRef.current - levelRef.current) * LEVEL_LERP;
        phase = ((now - start) / 1000) * WAVE_SPEED;
      }
      const wave = waveRef.current;
      const scene = sceneRef.current;
      if (wave) wave.setAttribute("d", waveD(levelRef.current, phase));
      if (scene) scene.style.setProperty("--level", levelRef.current.toFixed(3));
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce, demo]);

  function onClick(): void {
    setDemo(false);
    const v = !saved;
    setSaved(v);
    targetRef.current = v ? 1 : 0;
  }

  return (
    <main className={styles.stage}>
      <div className={styles.lq}>
        <p className={styles.caption}>액체가 차오르며 채워지는 북마크 버튼</p>
        <div className={styles.scene} ref={sceneRef}>
          <button className={styles.btn} type="button" aria-pressed={saved} onClick={onClick}>
            <svg className={styles.icon} viewBox="0 0 24 24" width={60} height={60} aria-hidden="true" focusable="false">
              <defs>
                <clipPath id="lqClip">
                  <path d="M6.5 3A1.5 1.5 0 0 1 8 1.5h8A1.5 1.5 0 0 1 17.5 3v18.2a.9.9 0 0 1-1.38.76L12 19.1l-4.12 2.86A.9.9 0 0 1 6.5 21.2Z" />
                </clipPath>
              </defs>
              <path className={styles.outline} d="M6.5 3A1.5 1.5 0 0 1 8 1.5h8A1.5 1.5 0 0 1 17.5 3v18.2a.9.9 0 0 1-1.38.76L12 19.1l-4.12 2.86A.9.9 0 0 1 6.5 21.2Z" />
              <path className={styles.wave} ref={waveRef} clipPath="url(#lqClip)" d="M0,24 L24,24 L24,24 L0,24 Z" />
            </svg>
          </button>
        </div>
        <p className={styles.status} aria-live="polite">{saved ? "저장됨" : "저장 전"}</p>
      </div>
    </main>
  );
}
