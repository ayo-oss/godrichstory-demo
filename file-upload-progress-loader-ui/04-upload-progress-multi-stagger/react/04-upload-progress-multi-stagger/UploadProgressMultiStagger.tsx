// UploadProgressMultiStagger — vanilla 판(run/329/demo/04-upload-progress-multi-stagger/index.html) 의 React 포트.
// 파일마다 개별 XHR 을 병렬로 열되(여기선 시드 난수로 흉내낸다), 목록 행은 Array.prototype.map 으로 한 번에 만들고
// 등록 순서의 인덱스만큼 animation-delay 를 곱해 나타나므로, 다섯 개를 한꺼번에 끌어다 놔도 한 줄씩 정돈되어 쌓인다.
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UploadProgressMultiStagger.module.scss";

export type UploadProgressMultiStaggerProps = {
  duration?: string;
  easing?: string;
  color?: string;
  staggerMs?: number; // 행마다 밀리는 등장 지연
  seed?: number;      // mulberry32 시드
  stepBase?: number;  // 매 프레임 기본 증가분
  stepJitter?: number; // 매 프레임 랜덤 증가분 상한
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const TITLE = "파일 4개 업로드 중";
const META = "Array.prototype.map · animation-delay";
const FILES = [
  { name: "cover.jpg", target: 100 },
  { name: "notes.pdf", target: 72 },
  { name: "sheet.csv", target: 45 },
  { name: "demo.mp4", target: 18 }
];
const STAGGER_MS = 80;
const SEED = 0x7c31af;

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

export default function UploadProgressMultiStagger({
  duration = "2s",
  easing = "ease-out",
  color = "#0a4fe8",
  staggerMs = STAGGER_MS,
  seed = SEED,
  stepBase = 2,
  stepJitter = 6
}: UploadProgressMultiStaggerProps) {
  const [demo, setDemo] = useState(true);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]) as Box<(HTMLSpanElement | null)[]>;
  const rafRef = useRef(0) as Box<number>;
  const randRef = useRef<(() => number) | null>(null);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function live(): void {
    if (!demo) return;
    setDemo(false);
    randRef.current = mulberry32(seed);
    const rows = FILES.map((f) => ({ fill: null as HTMLSpanElement | null, value: 0, target: f.target }));
    fillRefs.current.forEach((el, i) => {
      rows[i].fill = el;
      if (el) el.style.transform = "scaleX(0)";
    });
    function step(): void {
      const rand = randRef.current!;
      let done = true;
      rows.forEach((r) => {
        if (r.value < r.target) {
          r.value = Math.min(r.target, r.value + stepBase + rand() * stepJitter);
          if (r.fill) r.fill.style.transform = "scaleX(" + (r.value / 100) + ")";
          done = false;
        }
      });
      if (!done) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
  }

  const rootCls = demo ? `${styles.ms} ${styles.isDemo}` : styles.ms;

  return (
    <main className={styles.stage}>
      <div
        className={rootCls}
        style={vars}
        role="list"
        aria-label="파일별 업로드 진행률 목록"
        tabIndex={0}
        onPointerDown={live}
        onFocus={live}
      >
        <p className={styles.title}>{TITLE}</p>
        <ul className={styles.list}>
          {FILES.map((f, i) => (
            <li
              key={f.name}
              className={styles.row}
              role="listitem"
              style={{ animationDelay: (i * staggerMs) + "ms" }}
            >
              <span className={styles.name}>{f.name}</span>
              <span className={styles.track}>
                <span
                  className={styles.fill}
                  data-target={f.target}
                  ref={(el: HTMLSpanElement | null) => { fillRefs.current[i] = el; }}
                ></span>
              </span>
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
