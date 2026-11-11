// UploadProgressErrorShakeRetry — vanilla 판(run/329/demo/07-upload-progress-error-shake-retry/index.html) 의 React 포트.
// error 이벤트가 오면 그 시점의 loaded 값을 남긴 채 바가 흔들리고, 재시도는 AbortController 로
// 이전 시도를 끊은 뒤 처음부터가 아니라 남은 바이트만 이어 보낸다(scaleX 를 0 으로 되돌리지 않는다).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UploadProgressErrorShakeRetry.module.scss";

export type UploadProgressErrorShakeRetryProps = {
  duration?: string;
  easing?: string;
  color?: string;
  seed?: number;     // mulberry32 시드
  failAt?: number;   // 이 loaded 값(%) 에서 한 번 실패한다
  stepBase?: number; // 매 틱 기본 증가분(퍼센트 포인트)
  stepJitter?: number; // 매 틱 랜덤 증가분 상한
  tickMs?: number;   // 진행 틱 주기(ms)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const LABEL_RUN = "전송 중";
const LABEL_ERR = "전송 실패";
const RETRY_LABEL = "업로드 재시도";
const META = "ProgressEvent · AbortController";
const SEED = 0x44c1e0;
const FAIL_AT = 58;

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

export default function UploadProgressErrorShakeRetry({
  duration = "2s",
  easing = "ease-out",
  color = "#17141a",
  seed = SEED,
  failAt = FAIL_AT,
  stepBase = 4,
  stepJitter = 8,
  tickMs = 220
}: UploadProgressErrorShakeRetryProps) {
  const [demo, setDemo] = useState(true);
  const [isError, setIsError] = useState(false);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const randRef = useRef<(() => number) | null>(null);
  const loadedRef = useRef(0) as Box<number>;
  const failedOnceRef = useRef(false) as Box<boolean>;
  const timerRef = useRef(0) as Box<number>;
  const controllerRef = useRef<AbortController | null>(null);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  function paint(loaded: number): void {
    if (fillRef.current) fillRef.current.style.transform = "scaleX(" + (loaded / 100) + ")";
  }

  function run(startAt: number): void {
    loadedRef.current = startAt;
    const controller = new AbortController();
    controllerRef.current = controller;
    const rand = randRef.current!;
    timerRef.current = window.setInterval(() => {
      if (controller.signal.aborted) return;
      loadedRef.current = Math.min(100, loadedRef.current + stepBase + rand() * stepJitter);
      if (!failedOnceRef.current && loadedRef.current >= failAt) {
        failedOnceRef.current = true;
        window.clearInterval(timerRef.current);
        setIsError(true);
        return;
      }
      paint(loadedRef.current);
      if (loadedRef.current >= 100) window.clearInterval(timerRef.current);
    }, tickMs);
  }

  function onRetry(): void {
    if (controllerRef.current) controllerRef.current.abort();
    setIsError(false);
    run(loadedRef.current);
  }

  function live(): void {
    if (!demo) return;
    setDemo(false);
    randRef.current = mulberry32(seed);
    failedOnceRef.current = false;
    run(0);
  }

  const rootCls = [styles.es, demo ? styles.isDemo : "", isError ? styles.isError : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <div
        className={rootCls}
        style={vars}
        role="group"
        tabIndex={0}
        aria-label="파일 업로드 전송 실패와 재시도"
        onPointerDown={live}
        onFocus={live}
      >
        <div className={styles.row}>
          <span className={styles.label}>
            <b className={styles.labelRun}>{LABEL_RUN}</b>
            <b className={styles.labelErr}>{LABEL_ERR}</b>
          </span>
          <span className={styles.warn} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="14" height="14"><g fill="currentColor"><path d="M236 128a108 108 0 1 1-108-108a108 108 0 0 1 108 108" opacity=".2"/><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m-8-80V80a8 8 0 0 1 16 0v56a8 8 0 0 1-16 0m20 36a12 12 0 1 1-12-12a12 12 0 0 1 12 12"/></g></svg>
          </span>
          <button
            className={styles.retry}
            type="button"
            aria-label={RETRY_LABEL}
            onClick={onRetry}
          >
            <svg viewBox="0 0 256 256" width="14" height="14"><g fill="currentColor"><path d="M197.67 186.37a94.06 94.06 0 0 1-66.79 27.66a93 93 0 0 1-11-.65a94.19 94.19 0 0 1-82.14-71.71a8 8 0 0 1 15.53-3.8a78.19 78.19 0 0 0 68.17 59.63a78 78 0 0 0 64.16-26.4a8 8 0 0 1 12.07 10.5Zm38.24-66.14a8 8 0 0 0-9.6 6.06a78 78 0 0 1-27.68 41.72a8 8 0 1 0 9.66 12.76a94.06 94.06 0 0 0 33.31-50.24a94.19 94.19 0 0 0-52.71-98.86a8 8 0 0 0-6.9 14.44a78 78 0 0 1 44 66.6a94.6 94.6 0 0 0-9 7.52Z" opacity=".2"/><path d="M136 24a103.8 103.8 0 0 0-73 30a8 8 0 0 0 11.3 11.32A88 88 0 1 1 63.06 190a8 8 0 0 0-12.12 10.44A104 104 0 1 0 136 24m59.32 55.72a8 8 0 0 0-11.32 11.32L192 99H160a8 8 0 0 0 0 16h48a8 8 0 0 0 8-8V59a8 8 0 0 0-16 0v10.34Z"/></g></svg>
          </button>
        </div>
        <div className={styles.track}>
          <span className={styles.fill} ref={fillRef}></span>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META}</span>
        </div>
      </div>
    </main>
  );
}
