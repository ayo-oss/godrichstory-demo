// UploadProgressChunkPauseResume — vanilla 판(run/329/demo/08-upload-progress-chunk-pause-resume/index.html) 의 React 포트.
// 파일을 Blob.slice 로 고정 크기 조각으로 나눠 순서대로 fetch 로 보낸다. 일시정지는 AbortController 로
// 진행 중인 요청만 끊고 마지막으로 확인된 조각 번호를 저장하며, 재개는 그 번호부터 다시 시작해 이어붙인다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UploadProgressChunkPauseResume.module.scss";

export type UploadProgressChunkPauseResumeProps = {
  duration?: string;
  easing?: string;
  color?: string;
  seed?: number;        // mulberry32 시드
  chunkBytes?: number;  // 조각 하나의 크기(바이트)
  totalChunks?: number; // 총 조각 수
  delayBase?: number;   // 조각당 기본 지연(ms)
  delayJitter?: number; // 조각당 랜덤 지연 상한(ms)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const LABEL_PREFIX = "6개 조각 중 ";
const LABEL_SUFFIX = "개 전송";
const TOGGLE_LABEL = "업로드 일시정지";
const META = "Blob.slice · fetch · AbortController";
const SEED = 0x2f81dd;
const CHUNK_BYTES = 256 * 1024;
const TOTAL_CHUNKS = 6;

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => { setTimeout(res, ms); });
}

export default function UploadProgressChunkPauseResume({
  duration = "2s",
  easing = "linear",
  color = "#38b48b",
  seed = SEED,
  chunkBytes = CHUNK_BYTES,
  totalChunks = TOTAL_CHUNKS,
  delayBase = 160,
  delayJitter = 140
}: UploadProgressChunkPauseResumeProps) {
  const [demo, setDemo] = useState(true);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(0);
  const randRef = useRef<(() => number) | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const lastConfirmedRef = useRef(0) as Box<number>;
  const pausedRef = useRef(false) as Box<boolean>;
  const runningRef = useRef(false) as Box<boolean>;
  const controllerRef = useRef<AbortController | null>(null);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  useEffect(() => {
    blobRef.current = new Blob([new Uint8Array(chunkBytes * totalChunks)]);
    return () => {
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [chunkBytes, totalChunks]);

  async function sendFrom(startIdx: number): Promise<void> {
    runningRef.current = true;
    const controller = new AbortController();
    controllerRef.current = controller;
    const rand = randRef.current!;
    const blob = blobRef.current!;
    for (let i = startIdx; i < totalChunks; i++) {
      if (pausedRef.current) { runningRef.current = false; return; }
      const chunk = blob.slice(i * chunkBytes, (i + 1) * chunkBytes);
      void chunk;
      try {
        await fetch(location.href, { method: "HEAD", signal: controller.signal });
      } catch (err) {
        // 이 데모엔 실제 업로드 서버가 없다 — 실패해도 다음 조각으로 진행한다.
      }
      if (pausedRef.current) { runningRef.current = false; return; }
      lastConfirmedRef.current = i + 1;
      setDone(lastConfirmedRef.current);
      await delay(delayBase + rand() * delayJitter);
    }
    runningRef.current = false;
  }

  function onToggle(): void {
    if (demo) setDemo(false);
    if (runningRef.current) {
      pausedRef.current = true;
      setPaused(true);
      if (controllerRef.current) controllerRef.current.abort();
    } else {
      pausedRef.current = false;
      setPaused(false);
      if (!randRef.current) randRef.current = mulberry32(seed);
      void sendFrom(lastConfirmedRef.current);
    }
  }

  function live(): void {
    if (!demo) return;
    setDemo(false);
    randRef.current = mulberry32(seed);
    void sendFrom(0);
  }

  const rootCls = [styles.cp, demo ? styles.isDemo : "", paused ? styles.isPaused : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <div
        className={rootCls}
        style={vars}
        role="group"
        tabIndex={0}
        aria-label="파일 업로드 조각 일시정지와 재개"
        onPointerDown={live}
        onFocus={live}
      >
        <div className={styles.row}>
          <span className={styles.label}>
            {LABEL_PREFIX}
            <b className={styles.done}>{done}</b>
            {LABEL_SUFFIX}
          </span>
          <button className={styles.toggle} type="button" aria-label={TOGGLE_LABEL} onClick={onToggle}>
            <svg className={styles.iconPause} viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><g fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></g></svg>
            <svg className={styles.iconPlay} viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"></path></svg>
          </button>
        </div>
        <ul className={styles.segs} aria-hidden="true">
          {Array.from({ length: totalChunks }, (_, i) => (
            <li key={i} className={done > i ? `${styles.seg} is-filled` : styles.seg}>
              <span className={styles.segfill}></span>
            </li>
          ))}
        </ul>
        <div className={styles.bar}>
          <span className={styles.meta}>{META}</span>
        </div>
      </div>
    </main>
  );
}
