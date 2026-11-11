import { useEffect, useRef, useState } from "react";
import styles from "./DualChoiceCta.module.scss";

// 이벤트·ref 타입은 이 파일 안에서 최소한으로 선언한다
type ChangeEvt = { target: { value: string } };
type KeyEvt = { key: string };
type Box<T> = { current: T | null };

export type DualChoiceCtaProps = { duration?: number; easing?: string; color?: string };
type Vars = { "--duration": string; "--easing": string; "--color": string };

export default function DualChoiceCta({
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: DualChoiceCtaProps) {
  const [demo, setDemo] = useState(true);
  const [choice, setChoice] = useState("free");
  const [armed, setArmed] = useState(false);
  const [went, setWent] = useState(false);
  const pvRef: Box<HTMLButtonElement> = useRef<HTMLButtonElement>(null);
  const vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as Vars;
  const isFree = choice === "free";

  useEffect(() => {
    const off = () => setDemo(false);
    window.addEventListener("pointerdown", off, { once: true });
    window.addEventListener("keydown", off, { once: true });
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", off);
    };
  }, []);

  function onChange(e: ChangeEvt) {
    setChoice(e.target.value);
    setArmed(false);
    setWent(false);
  }
  function onKeyDown(e: KeyEvt) {
    if (e.key !== "Enter") return;
    setArmed(true);
    if (pvRef.current) pvRef.current.focus({ preventScroll: true });
  }

  return (
    <main className={`${styles.stage} ${demo ? styles.demo : ""}`} style={vars}>
      <div className={styles.dc}>
        <p className={styles.title}>어떻게 시작할까요?</p>

        <div
          className={styles.cards}
          role="radiogroup"
          aria-label="시작 방법"
          onKeyDown={onKeyDown}
          onDoubleClick={() => setArmed(true)}
        >
          <div className={styles.cell}>
            <input
              className={styles.radio}
              type="radio"
              id="dc-a-r"
              name="dc271r"
              value="free"
              checked={isFree}
              aria-checked={isFree}
              onChange={onChange}
            />
            <label className={styles.label} htmlFor="dc-a-r">
              <span className={styles.ring} aria-hidden="true" />
              <span className={styles.ic} aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="22" height="22"><g fill="currentColor"><path d="M184 120v61.65a8 8 0 0 1-2.34 5.65l-34.35 34.35a8 8 0 0 1-13.57-4.53L128 176Zm-48-48H74.35a8 8 0 0 0-5.65 2.34l-34.35 34.35a8 8 0 0 0 4.53 13.57L80 128ZM40 216c37.65 0 50.69-19.69 54.56-28.18l-26.38-26.38C59.69 165.31 40 178.35 40 216" opacity=".2" /><path d="M223.85 47.12a16 16 0 0 0-15-15c-12.58-.75-44.73.4-71.41 27.07L132.69 64H74.36A15.9 15.9 0 0 0 63 68.68L28.7 103a16 16 0 0 0 9.07 27.16l38.47 5.37l44.21 44.21l5.37 38.49a15.94 15.94 0 0 0 10.78 12.92a16.1 16.1 0 0 0 5.1.83a15.9 15.9 0 0 0 11.3-4.68l34.32-34.3a15.9 15.9 0 0 0 4.68-11.36v-58.33l4.77-4.77c26.68-26.68 27.83-58.83 27.08-71.42M74.36 80h42.33l-39.53 39.52L40 114.34Zm74.41-9.45a76.65 76.65 0 0 1 59.11-22.47a76.46 76.46 0 0 1-22.42 59.16L128 164.68L91.32 128ZM176 181.64L141.67 216l-5.19-37.17L176 139.31Zm-74.16 9.5C97.34 201 82.29 224 40 224a8 8 0 0 1-8-8c0-42.29 23-57.34 32.86-61.85a8 8 0 0 1 6.64 14.56c-6.43 2.93-20.62 12.36-23.12 38.91c26.55-2.5 36-16.69 38.91-23.12a8 8 0 1 1 14.56 6.64Z" /></g></svg>
              </span>
              <span className={styles.name}>무료로 시작하기</span>
              <span className={styles.sub}>가입 없이 30초</span>
              <span className={styles.arrow} aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="14" height="14"><g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2" /><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z" /></g></svg>
              </span>
            </label>
          </div>

          <div className={styles.cell}>
            <input
              className={styles.radio}
              type="radio"
              id="dc-b-r"
              name="dc271r"
              value="demo"
              checked={!isFree}
              aria-checked={!isFree}
              onChange={onChange}
            />
            <label className={styles.label} htmlFor="dc-b-r">
              <span className={styles.ring} aria-hidden="true" />
              <span className={styles.ic} aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="22" height="22"><g fill="currentColor"><path d="M80 144v40a16 16 0 0 1-16 16H48a16 16 0 0 1-16-16v-56h32a16 16 0 0 1 16 16m112-16a16 16 0 0 0-16 16v40a16 16 0 0 0 16 16h32v-72Z" opacity=".2" /><path d="M201.89 54.66A104.08 104.08 0 0 0 24 128v56a24 24 0 0 0 24 24h16a24 24 0 0 0 24-24v-40a24 24 0 0 0-24-24H40.36a88.12 88.12 0 0 1 150.18-54.07A87.4 87.4 0 0 1 215.65 120H192a24 24 0 0 0-24 24v40a24 24 0 0 0 24 24h24a24 24 0 0 1-24 24h-56a8 8 0 0 0 0 16h56a40 40 0 0 0 40-40v-80a103.4 103.4 0 0 0-30.11-73.34M64 136a8 8 0 0 1 8 8v40a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8v-48Zm128 56a8 8 0 0 1-8-8v-40a8 8 0 0 1 8-8h24v56Z" /></g></svg>
              </span>
              <span className={styles.name}>데모 상담 잡기</span>
              <span className={styles.sub}>20분 화상 미팅</span>
              <span className={styles.arrow} aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="14" height="14"><g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2" /><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z" /></g></svg>
              </span>
            </label>
          </div>
        </div>

        <button
          type="button"
          className={`${styles.pv} ${isFree ? "" : styles.isB} ${armed ? styles.isArmed : ""}`}
          ref={pvRef}
          onClick={() => setWent(true)}
        >
          <span className={`${styles.pvT} ${styles.pvA}`} aria-hidden={armed || !isFree}>다음: 템플릿 골라 첫 화면 만들기</span>
          <span className={`${styles.pvT} ${styles.pvB}`} aria-hidden={armed || isFree}>다음: 편한 시간 골라 20분 잡기</span>
          <span className={`${styles.pvT} ${styles.pvGo}`} aria-hidden={!armed}>시작하기 »</span>
        </button>
        <p className={`${styles.msg} ${isFree ? "" : styles.isB}`} role="status">
          <span className={`${styles.msgT} ${styles.msgA}`} aria-hidden={!isFree}>{went ? "무료 시작으로 넘어갑니다" : "무료 시작을 골랐어요"}</span>
          <span className={`${styles.msgT} ${styles.msgB}`} aria-hidden={isFree}>{went ? "상담 예약으로 넘어갑니다" : "상담 예약을 골랐어요"}</span>
        </p>
      </div>
    </main>
  );
}
