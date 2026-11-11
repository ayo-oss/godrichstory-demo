import { useEffect, useRef } from "react";
import styles from "./TypingVoiceWaveform.module.scss";

// 음성 입력 파형 — 미리 정한 진폭 값 배열을 순서대로 읽어 막대마다 높이를 다시 계산한다.
// 계산 겹: 진폭 배열 인덱스 순회 → scaleY 재계산(고정 배열, 오디오 API 미호출). 자동 재생만, 실사용자 리스너 없음.
const AMPLITUDE_TICK_MS = 80;
const AMPLITUDES = [.25, .55, .82, .38, .68, .92, .30, .60, .78, .42, .58, .88, .34, .64, .48, .70];
const BAR_COUNT = 12;

export default function TypingVoiceWaveform() {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let idx = 0;
    function tick() {
      barsRef.current!.forEach((bar, i) => {
        if (!bar) return;
        const v = AMPLITUDES[(idx + i) % AMPLITUDES.length];
        bar.style.transform = "scaleY(" + v.toFixed(2) + ")";
      });
      idx = (idx + 1) % AMPLITUDES.length;
    }

    tick();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(tick, AMPLITUDE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.panel}>
        <div className={styles.waveform} role="status" aria-live="polite" aria-label="음성 메시지 녹음 중">
          {Array.from({ length: BAR_COUNT }).map((_, i) => (
            <span
              key={i}
              ref={(el: HTMLSpanElement | null) => { barsRef.current![i] = el; }}
              className={styles.bar}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
