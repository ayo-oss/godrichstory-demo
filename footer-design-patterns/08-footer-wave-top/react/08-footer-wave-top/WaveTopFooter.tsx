import { useCallback, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./WaveTopFooter.module.scss";

export type WaveTopFooterProps = {
  /** 앞물결이 한 벌(480px = 타일 4장)을 지나는 시간(ms) */
  duration?: number;
  /** 흐르는 물결은 등속이어야 이음매가 안 보인다 */
  easing?: string;
  /** 푸터 바닥 색 — 앞물결과 같은 색이라 경계가 이어진다 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function WaveTopFooter({
  duration = 2000,
  easing = "linear",
  color = "#1b1a20",
}: WaveTopFooterProps): ReactNode {
  const [paused, setPaused] = useState(false);
  // button 이라 클릭·터치·Enter·Space 가 모두 onClick 으로 온다
  const toggleWave = useCallback((): void => setPaused((p) => !p), []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <footer className={`${styles.wv} ${paused ? styles.isPaused : ""}`} style={vars}>
      <div className={styles.body}>
        <p className={styles.lead}>본문은 여기서 끝납니다</p>
      </div>

      {/* 경계 — 물결 두 겹. 모양은 SVG path 를 data URI 로 깐 배경이고, 타일 폭은 120px 이다 */}
      <div className={styles.edge} aria-hidden="true">
        <span className={`${styles.wave} ${styles.waveBack}`} />
        <span className={`${styles.wave} ${styles.waveFront}`} />
      </div>

      <div className={styles.foot}>
        <div className={styles.row}>
          <nav className={styles.nav} aria-label="푸터 링크">
            <a className={styles.link} href="#">소개</a>
            <a className={styles.link} href="#">글 목록</a>
            <a className={styles.link} href="#">문의</a>
          </nav>
          <button className={styles.toggle} type="button" aria-pressed={paused} onClick={toggleWave}>
            {paused ? "물결 재생" : "물결 멈춤"}
          </button>
        </div>
        <p className={styles.copy}>© 2026 예시 사이트</p>
      </div>
    </footer>
  );
}
