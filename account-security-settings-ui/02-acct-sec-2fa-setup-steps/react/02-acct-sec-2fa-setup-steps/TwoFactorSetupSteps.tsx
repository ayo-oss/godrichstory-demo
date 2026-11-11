import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./TwoFactorSetupSteps.module.scss";

export type TwoFactorSetupStepsProps = {
  title?: string;
  stepLabels?: [string, string, string];
  scanText?: string;
  nextLabel?: string;
  codeLabel?: string;
  okLabel?: string;
  doneText?: string;
  backupCodes?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault(): void };
type ChangeEvt = { target: { value: string } };

const QR: ReactNode = (
  <g fill="currentColor">
    <path d="M112 56v48a8 8 0 0 1-8 8H56a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8m-8 88H56a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8h48a8 8 0 0 0 8-8v-48a8 8 0 0 0-8-8m96-96h-48a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8h48a8 8 0 0 0 8-8V56a8 8 0 0 0-8-8" opacity=".2" />
    <path d="M104 40H56a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m0 64H56V56h48zm0 32H56a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16v-48a16 16 0 0 0-16-16m0 64H56v-48h48zm96-160h-48a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m0 64h-48V56h48zm-64 72v-32a8 8 0 0 1 16 0v32a8 8 0 0 1-16 0m80-16a8 8 0 0 1-8 8h-24v40a8 8 0 0 1-8 8h-32a8 8 0 0 1 0-16h24v-56a8 8 0 0 1 16 0v8h24a8 8 0 0 1 8 8m0 32v16a8 8 0 0 1-16 0v-16a8 8 0 0 1 16 0" />
  </g>
);

const LOCK: ReactNode = (
  <g fill="currentColor">
    <path d="M208 88H48a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8V96a8 8 0 0 0-8-8m-80 72a20 20 0 1 1 20-20a20 20 0 0 1-20 20" opacity=".2" />
    <path d="M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16M96 56a32 32 0 0 1 64 0v24H96Zm112 152H48V96h160zm-80-96a28 28 0 0 0-8 54.83V184a8 8 0 0 0 16 0v-17.17a28 28 0 0 0-8-54.83m0 40a12 12 0 1 1 12-12a12 12 0 0 1-12 12" />
  </g>
);

const SHIELD: ReactNode = (
  <g fill="currentColor">
    <path d="M216 56v56c0 96-88 120-88 120s-88-24-88-120V56a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
    <path d="M208 40H48a16 16 0 0 0-16 16v56c0 52.72 25.52 84.67 46.93 102.19c23.06 18.86 46 25.26 47 25.53a8 8 0 0 0 4.2 0c1-.27 23.91-6.67 47-25.53C198.48 196.67 224 164.72 224 112V56a16 16 0 0 0-16-16m0 72c0 37.07-13.66 67.16-40.6 89.42a129.3 129.3 0 0 1-39.4 22.2a128.3 128.3 0 0 1-38.92-21.81C61.82 179.51 48 149.3 48 112V56h160ZM82.34 141.66a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32l-56 56a8 8 0 0 1-11.32 0Z" />
  </g>
);

export default function TwoFactorSetupSteps({
  title = "2단계 인증 켜기",
  stepLabels = ["앱 연결", "코드 확인", "백업 코드"],
  scanText = "인증 앱으로 스캔",
  nextLabel = "다음",
  codeLabel = "앱에 뜬 6자리 코드",
  okLabel = "확인",
  doneText = "2단계 인증이 켜졌습니다",
  backupCodes = ["7K4M", "B3XR", "9PL5", "Z6HD", "M2VK", "Q8TN"],
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: TwoFactorSetupStepsProps) {
  const [demo, setDemo] = useState(true);
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("482173");
  const input = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 걸음이 바뀌면 눈금의 aria-current 도 함께 옮긴다 (렌더에서 step 으로 계산)
  function go(n: number) {
    setDemo(false); // 사람이 만졌으니 자동 루프를 끈다
    setStep(n);
    if (n === 2 && input.current !== null) input.current.focus({ preventScroll: true });
  }

  return (
    <section className={`${styles.tf} ${demo ? styles.isDemo : ""}`} style={vars} data-step={String(step)}>
      <h2 className={styles.title}>{title}</h2>
      <ol className={styles.bar}>
        {stepLabels.map((label: string, i: number) => (
          <li
            key={label}
            className={styles.notch}
            data-notch={String(i + 1)}
            aria-current={step === i + 1 ? "step" : undefined}
          >
            <span className={styles.step}>{label}</span>
            <span className={styles.track}>
              <span className={styles.fill} data-fill={String(i + 1)} />
            </span>
          </li>
        ))}
      </ol>

      <div className={styles.body}>
        <div className={styles.panel} data-panel="1">
          <span className={styles.qr} aria-hidden="true">
            <span className={styles.qrdot}>
              <svg viewBox="0 0 256 256" width="22" height="22">{QR}</svg>
            </span>
          </span>
          <div className={styles.side}>
            <p className={styles.lead}>
              <span className={styles.ic} aria-hidden="true">
                <svg viewBox="0 0 256 256" width="18" height="18">{LOCK}</svg>
              </span>
              {scanText}
            </p>
            <button className={styles.go} type="button" onClick={() => go(2)}>{nextLabel}</button>
          </div>
        </div>

        <div className={styles.panel} data-panel="2">
          <label className={styles.label} htmlFor="tf-code">{codeLabel}</label>
          <input
            ref={input}
            className={styles.input}
            id="tf-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e: ChangeEvt) => setCode(e.target.value)}
            onKeyDown={(e: KeyEvt) => {
              if (e.key === "Enter") { e.preventDefault(); go(3); }
            }}
          />
          <button className={`${styles.go} ${styles.goWide}`} type="button" onClick={() => go(3)}>{okLabel}</button>
        </div>

        <div className={styles.panel} data-panel="3">
          <span className={styles.shield} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="30" height="30">{SHIELD}</svg>
          </span>
          <p className={styles.done}>{doneText}</p>
          <ul className={styles.codes}>
            {backupCodes.map((c: string) => <li key={c} className={styles.chip}>{c}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
