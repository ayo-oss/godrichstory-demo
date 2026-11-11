// UploadProgressSpeedLabel — vanilla 판(run/329/demo/03-upload-progress-speed-label/index.html) 의 React 포트.
// 실제 XHR 대신 ProgressEvent 를 직접 만들어 같은 파이프라인을 태운다. progress 가 올 때마다 이전 시점과의
// 바이트 차를 시간 차로 나눠 KB/s 를 다시 계산하고, 최근 5개 표본의 평균을 취해 순간 값이 튀어도
// 라벨이 덜컹이지 않게 만든다. 숫자는 counter() 트릭(--n 정수)으로, 바는 transform: scaleX 로만 움직인다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UploadProgressSpeedLabel.module.scss";

export type UploadProgressSpeedLabelProps = {
  duration?: string;
  easing?: string;
  color?: string;
  seed?: number;    // mulberry32 시드
  total?: number;   // 총 바이트
  chunkBase?: number; // 매 펌프 기본 바이트
  chunkJitter?: number; // 매 펌프 랜덤 바이트 상한
  pumpMs?: number;  // 펌프 주기(ms)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const LABEL = "전송 중";
const META = "performance.now · ProgressEvent";
const SEED = 0x51a3c9;
const TOTAL = 8_400_000;

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

export default function UploadProgressSpeedLabel({
  duration = "2s",
  easing = "linear(0.0, 0.051, 0.176, 0.341, 0.518, 0.685, 0.831, 0.947, 1.032, 1.087, 1.117, 1.126, 1.121, 1.105, 1.085, 1.062, 1.041, 1.022, 1.008, 0.997, 1)",
  color = "#17141a",
  seed = SEED,
  total = TOTAL,
  chunkBase = 60000,
  chunkJitter = 140000,
  pumpMs = 260
}: UploadProgressSpeedLabelProps) {
  const [demo, setDemo] = useState(true);
  const speedRef = useRef<HTMLSpanElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function live(): void {
    if (!demo) return;
    setDemo(false);
    const rand = mulberry32(seed);
    const bus = new EventTarget();
    let loaded = 0, lastLoaded = 0, lastT = performance.now();
    let samples: number[] = [];
    let shownKbps = 0;

    function tick(target: number): void {
      shownKbps += (target - shownKbps) * 0.3;
      if (speedRef.current) speedRef.current.style.setProperty("--n", String(Math.round(shownKbps)));
      if (Math.abs(target - shownKbps) > 0.5) {
        rafRef.current = requestAnimationFrame(() => tick(target));
      }
    }

    bus.addEventListener("progress", (e) => {
      const now = performance.now();
      const evt = e as ProgressEvent;
      const dt = (now - lastT) / 1000;
      const db = evt.loaded - lastLoaded;
      const kbps = dt > 0 ? (db / 1024) / dt : 0;
      samples.push(kbps);
      if (samples.length > 5) samples.shift();
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i];
      const target = sum / samples.length;
      lastT = now; lastLoaded = evt.loaded;
      if (fillRef.current) fillRef.current.style.transform = "scaleX(" + (evt.loaded / evt.total) + ")";
      cancelAnimationFrame(rafRef.current);
      tick(target);
    });

    function pump(): void {
      const chunk = chunkBase + rand() * chunkJitter;
      loaded = Math.min(total, loaded + chunk);
      bus.dispatchEvent(new ProgressEvent("progress", { lengthComputable: true, loaded: loaded, total: total }));
      if (loaded >= total) window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(pump, pumpMs);
  }

  const rootCls = demo ? `${styles.sl} ${styles.isDemo}` : styles.sl;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div
        className={rootCls}
        style={vars}
        role="group"
        tabIndex={0}
        aria-label="파일 업로드 전송 속도"
        onPointerDown={live}
        onFocus={live}
      >
        <div className={styles.row}>
          <span className={styles.speed} ref={speedRef} aria-hidden="true"><b className={styles.n}></b><i>KB/s</i></span>
          <span className={styles.label}>{LABEL}</span>
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
