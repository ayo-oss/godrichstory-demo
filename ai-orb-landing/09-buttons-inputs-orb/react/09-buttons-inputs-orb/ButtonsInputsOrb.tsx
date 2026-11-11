import { useState } from "react";
import styles from "./ButtonsInputsOrb.module.scss";

export type ButtonsInputsOrbProps = {
  /** 묻고 → 보내고 → 돌아오는 한 바퀴 */
  duration?: string;
  /** 빛 무리가 번지는 이징 */
  easing?: string;
  /** 빛 무리 색 — --ringColor 로 내려간다 */
  color?: string;
};

type Loop = {
  animationName: string;
  animationDuration: string;
  animationTimingFunction: string;
  animationIterationCount: string;
};

export default function ButtonsInputsOrb({
  duration = "2s",
  easing = "ease-out",
  color = "#b9a0ff",
}: ButtonsInputsOrbProps) {
  // 사람이 손을 대면 미리보기 루프를 끈다. 포커스를 코드로 강제하지 않는다 —
  // iframe 안에서 강제 포커스는 부모 페이지를 끌어당긴다 (BD18)
  const [preview, setPreview] = useState(true);
  const [text, setText] = useState("");
  const stopPreview = () => { setPreview(false); };

  const loop = (name: string, timing: string): Loop | undefined =>
    preview ? {
      animationName: name,
      animationDuration: duration,
      animationTimingFunction: timing,
      animationIterationCount: "infinite",
    } : undefined;

  return (
    <main className={styles.stage}>
      <div className={`${styles.ch} ${preview ? styles.isDemo : ""}`} style={{ "--ringColor": color }}>
        <div className={styles.field} style={loop("chRing", easing)}>
          <span className={styles.lead} aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128A96,96,0,0,1,79.93,211.11h0L42.54,223.58a8,8,0,0,1-10.12-10.12l12.47-37.39h0A96,96,0,1,1,224,128Z" opacity="0.2"/><path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-4-1.08,7.85,7.85,0,0,0-2.53.42L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Zm12-88a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,96,128Zm88,0a12,12,0,1,1-12-12A12,12,0,0,1,184,128Z"/></svg></span>
          <span className={styles.box}>
            <input
              className={styles.input}
              type="text"
              placeholder="무엇이든 물어보세요"
              aria-label="AI에게 물어볼 내용"
              value={text}
              onChange={(e: { target: { value: string } }) => { setText(e.target.value); }}
              onFocus={stopPreview}
              onPointerDown={stopPreview}
            />
            {/* 미리보기용 고스트 글자. 보일 때는 placeholder 가 투명해진다 */}
            <span className={styles.ghost} aria-hidden="true" style={loop("chGhost", "steps(1, end)")}>
              이 랜딩의 전환율을 올릴 방법은?
            </span>
          </span>
          <button
            type="button"
            className={styles.send}
            aria-label="보내기"
            style={loop("chPress", easing)}
            onPointerDown={stopPreview}
            onFocus={stopPreview}
          >
            <span className={styles.dot} aria-hidden="true" style={loop("chDot", easing)} />
            <span className={styles.ico} aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M223.69,42.18l-58.22,192a8,8,0,0,1-14.92,1.25L108,148,20.58,105.45a8,8,0,0,1,1.25-14.92l192-58.22A8,8,0,0,1,223.69,42.18Z" opacity="0.2"/><path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.49,29.8L102,154l41.3,84.87A15.86,15.86,0,0,0,157.74,248q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l58.2-191.94c0-.05,0-.1,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-.05.14,0-.07-40.06-82.3,48-48a8,8,0,0,0-11.31-11.31l-48,48L24.08,98.25l-.07,0,.14,0L216,40Z"/></svg></span>
          </button>
        </div>
        <div className={styles.row}>
          <button type="button" className={`${styles.btn} ${styles.btnSolid}`} onClick={stopPreview}>답변 받기</button>
          <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} onClick={stopPreview}>예시 프롬프트</button>
        </div>
        <p className={styles.hint}>답변은 보통 2초 안에 옵니다</p>
      </div>
    </main>
  );
}
