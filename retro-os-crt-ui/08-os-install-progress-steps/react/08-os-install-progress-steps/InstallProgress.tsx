// InstallProgress — vanilla 판(run/023/demo/08-os-install-progress-steps/index.html) 의 React 포트.
// 칸 도안은 linear-gradient 하나가 background-size 타일(20px)로 정의하고, 트랙색 덮개가
// transform: scaleX 를 steps(12, end) 만큼 줄여 칸을 하나씩 드러낸다. 문구와 남은 용량 숫자는
// 겹켜진 값 장을 음수 animation-delay 위상으로 컷 갈아 끼운다. 다시 설치 단추는 같은 루프를
// 한 바퀴 돌게 했다가 95% 지점에 뗀다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./InstallProgress.module.scss";

export type InstallProgressProps = {
  duration?: number;
  easing?: string;
  color?: string;
  titleText?: string;
  retryText?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef<number> 는 { current: number | null } 을 돌려준다 — ambient 타입에 맞춘 상자 타입
type Box<T> = { current: T | null };

const TITLE = "설치 마법사";
const RETRY = "다시 설치";
const PHRASES = ["파일 준비", "복사 중", "설정 저장", "마무리 중", "설치 완료"];
const REMAINS = ["812 MB", "744 MB", "663 MB", "581 MB", "502 MB", "421 MB", "340 MB", "262 MB", "183 MB", "102 MB", "47 MB", "0 MB"];
const REPLAY_MS = 1900;

export default function InstallProgress(props: InstallProgressProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
  const color = props.color ?? "#0a4fe8";
  const titleText = props.titleText ?? TITLE;
  const retryText = props.retryText ?? RETRY;
  const [preview, setPreview] = useState<boolean>(true);
  const timer = useRef<number>(null) as Box<number>;

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const leave = () => setPreview(false);

  const onRetry = () => {
    // 같은 2초 루프를 한 바퀴 돌게 했다가 95% 지점(막대가 다 찬 뒤)에 뗀다
    setPreview(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPreview(false), REPLAY_MS);
  };

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div
        className={styles.root + (preview ? " " + styles.isDemo : "")}
        style={vars}
        onPointerDown={leave}
      >
        <div className={styles.title}>
          <span className={styles.tico} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256">
              <g fill="currentColor">
                <path d="M216 152v48a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8v-48a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8m-8-104H48a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8V56a8 8 0 0 0-8-8" opacity=".2" />
                <path d="M208 136H48a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16v-48a16 16 0 0 0-16-16m0 64H48v-48h160zm0-160H48a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m0 64H48V56h160zm-16-24a12 12 0 1 1-12-12a12 12 0 0 1 12 12m0 96a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
              </g>
            </svg>
          </span>
          <span className={styles.tname}>{titleText}</span>
          <span className={styles.tbtns} aria-hidden="true">
            <span className={styles.gb + " " + styles.gbMin} />
            <span className={styles.gb} />
          </span>
        </div>
        <div className={styles.body}>
          <div className={styles.track}>
            <span className={styles.fill} aria-hidden="true" />
            <span className={styles.cover} aria-hidden="true" />
            <span className={styles.done} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256">
                <g fill="currentColor">
                  <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
                  <path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
                </g>
              </svg>
            </span>
          </div>
          <div className={styles.meta}>
            <span className={styles.phrases} aria-hidden="true">
              {PHRASES.map((text, i) => (
                <span key={i} className={styles.sv + " " + styles["sv" + (i + 1)]}>
                  {text}
                </span>
              ))}
            </span>
            <span className={styles.nums} aria-hidden="true">
              {REMAINS.map((text, i) => (
                <span key={i} className={styles.nm + " " + styles["nm" + (i + 1)]}>
                  {text}
                </span>
              ))}
            </span>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={onRetry}>
              {retryText}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
