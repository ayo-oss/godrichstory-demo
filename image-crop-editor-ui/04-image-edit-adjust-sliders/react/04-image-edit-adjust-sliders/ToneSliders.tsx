// ToneSliders — vanilla 판(run/295/demo/04-image-edit-adjust-sliders/index.html) 의 React 포트.
// 밝기·대비·채도 세 값이 filter 문자열 하나로 합쳐져 canvas 에 걸리고, 비교 버튼은 filter 를 none 으로
// 돌려 원본을 보여준다. 가짜 사진은 paintPhoto 가 그려 넣고, 그 toDataURL 을 --photo 로 내려
// 미리보기 유령 판 두 장이 같은 그림을 쓴다. 값·수치·키프레임은 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./ToneSliders.module.scss";

export type ToneSlidersProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--photo"?: string;
};
type ToneKey = "b" | "c" | "s";
type Tone = { b: number; c: number; s: number };
// react 앰비언트에 KeyboardEvent 가 없다 — 키 핸들러가 실제로 쓰는 것만 지역 타입으로 선언한다
type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };

const VOICE = "%v배";
const TAG_EDIT = "보정 후";
const TAG_ORIG = "원본";
const SLIDERS: { key: ToneKey; label: string; labelId: string; thumb: string }[] = [
  { key: "b", label: "밝기", labelId: "labB", thumb: styles.thumbB },
  { key: "c", label: "대비", labelId: "labC", thumb: styles.thumbC },
  { key: "s", label: "채도", labelId: "labS", thumb: styles.thumbS },
];

// 가짜 사진 — 외부 파일 없이 그라디언트와 도형으로 합성한다. 필터·히스토그램이 보이도록 대비를 세게 준다
function paintPhoto(c: CanvasRenderingContext2D, w: number, h: number): void {
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#2f6df6"); sky.addColorStop(0.55, "#ff9ebb"); sky.addColorStop(1, "#ffd23f");
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  c.fillStyle = "#fff7e6";
  c.beginPath(); c.arc(w * 0.74, h * 0.28, h * 0.13, 0, Math.PI * 2); c.fill();
  // 곧은 수평선 하나 — 기울기 보정이 눈에 보이려면 비교할 직선이 있어야 한다
  c.fillStyle = "rgba(23, 20, 26, 0.5)"; c.fillRect(0, Math.round(h * 0.66), w, 2);
  c.fillStyle = "#17141a";
  c.beginPath(); c.moveTo(0, h); c.lineTo(w * 0.34, h * 0.36); c.lineTo(w * 0.62, h); c.closePath(); c.fill();
  c.fillStyle = "#c2361a";
  c.beginPath(); c.moveTo(w * 0.46, h); c.lineTo(w * 0.78, h * 0.52); c.lineTo(w, h); c.closePath(); c.fill();
  for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? "#fff7e6" : "#17141a"; c.fillRect(w * (0.08 + i * 0.07), h * (0.14 + (i % 3) * 0.06), 7, 7); }
}

export default function ToneSliders({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: ToneSlidersProps) {
  const viewRef = useRef<HTMLCanvasElement | null>(null);
  const [tone, setTone] = useState<Tone>({ b: 1, c: 1, s: 1 });
  const [showOriginal, setShowOriginal] = useState(false);
  const [demo, setDemo] = useState(true);
  const [photo, setPhoto] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  if (photo) vars["--photo"] = `url(${photo})`;

  useEffect(() => {
    const canvas = viewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintPhoto(ctx, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL());
  }, []);

  // 슬라이더 셋이 filter 문자열 하나로 합쳐진다 — 순서가 곧 적용 순서다
  const chain = `brightness(${tone.b.toFixed(2)}) contrast(${tone.c.toFixed(2)}) saturate(${tone.s.toFixed(2)})`;

  function setValue(key: ToneKey, nextRaw: number): void {
    const v = Math.max(0.5, Math.min(1.5, Math.round(nextRaw * 100) / 100));
    setTone((prev) => {
      const next: Tone = { b: prev.b, c: prev.c, s: prev.s };
      next[key] = v;
      return next;
    });
    setDemo(false);
  }

  function fromPointer(key: ToneKey, event: ReactPointerEvent<HTMLDivElement>): void {
    const r = event.currentTarget.getBoundingClientRect();
    setValue(key, (event.clientX - r.left) / r.width + 0.5);
  }

  function onPointerDown(key: ToneKey, event: ReactPointerEvent<HTMLDivElement>): void {
    event.currentTarget.setPointerCapture(event.pointerId);
    fromPointer(key, event);
  }

  function onPointerMove(key: ToneKey, event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.buttons) { fromPointer(key, event); }
  }

  // 화살표 0.02, Shift 와 함께면 0.1 — 눈으로 맞추기 어려운 미세 보정은 키보드가 낫다
  function onKeyDown(key: ToneKey, event: KeyEvt): void {
    const step = event.shiftKey ? 0.1 : 0.02;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); setValue(key, tone[key] - step); }
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); setValue(key, tone[key] + step); }
  }

  function onReset(): void {
    setTone({ b: 1, c: 1, s: 1 });
    setShowOriginal(false);
    setDemo(false);
  }

  function onCompare(): void {
    setShowOriginal(!showOriginal);
    setDemo(false);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.frame}>
          <canvas className={styles.view} ref={viewRef} width={320} height={200} role="img" aria-label="샘플 사진" style={{ filter: showOriginal ? "none" : chain }}></canvas>
          <span className={styles.ghost} aria-hidden="true"></span>
          <span className={styles.orig} aria-hidden="true"></span>
          <span className={styles.tag}>
            <span className={styles.real}>{showOriginal ? TAG_ORIG : TAG_EDIT}</span>
            <span className={`${styles.tagDemo} ${styles.tagDemoEdit}`} aria-hidden="true">보정 후</span>
            <span className={`${styles.tagDemo} ${styles.tagDemoOrig}`} aria-hidden="true">원본</span>
          </span>
        </div>
        <div className={styles.ctl}>
          {SLIDERS.map((s) => (
            <div className={styles.slider} key={s.key}>
              <span className={styles.lab} id={s.labelId}>{s.label}</span>
              <div
                className={styles.track}
                role="slider"
                tabIndex={0}
                aria-labelledby={s.labelId}
                aria-valuemin={0.5}
                aria-valuemax={1.5}
                aria-valuenow={Number(tone[s.key].toFixed(2))}
                aria-valuetext={VOICE.replace("%v", tone[s.key].toFixed(2))}
                onPointerDown={(e: ReactPointerEvent<HTMLDivElement>) => onPointerDown(s.key, e)}
                onPointerMove={(e: ReactPointerEvent<HTMLDivElement>) => onPointerMove(s.key, e)}
                onKeyDown={(e: KeyEvt) => onKeyDown(s.key, e)}
              >
                <span className={`${styles.thumb} ${s.thumb}`} style={{ left: `${(tone[s.key] - 0.5) * 100}%` }}></span>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.foot}>
          <button type="button" className={styles.btn} onClick={onReset}>초기화</button>
          <button type="button" className={`${styles.btn} ${styles.btnAb}`} aria-pressed={showOriginal} onClick={onCompare}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={styles.ico} aria-hidden="true"><g fill="currentColor"><path d="M80 136a24 24 0 1 1-24-24a24 24 0 0 1 24 24m48-72a24 24 0 1 0 24 24a24 24 0 0 0-24-24m72 80a24 24 0 1 0 24 24a24 24 0 0 0-24-24" opacity=".2"/><path d="M64 105V40a8 8 0 0 0-16 0v65a32 32 0 0 0 0 62v49a8 8 0 0 0 16 0v-49a32 32 0 0 0 0-62m-8 47a16 16 0 1 1 16-16a16 16 0 0 1-16 16m80-95V40a8 8 0 0 0-16 0v17a32 32 0 0 0 0 62v97a8 8 0 0 0 16 0v-97a32 32 0 0 0 0-62m-8 47a16 16 0 1 1 16-16a16 16 0 0 1-16 16m104 64a32.06 32.06 0 0 0-24-31V40a8 8 0 0 0-16 0v97a32 32 0 0 0 0 62v17a8 8 0 0 0 16 0v-17a32.06 32.06 0 0 0 24-31m-32 16a16 16 0 1 1 16-16a16 16 0 0 1-16 16"/></g></svg><span>비교</span></button>
          <span className={styles.codes}>
            <code className={styles.realCode}>{chain}</code>
            <code className={`${styles.demoCode} ${styles.demoCodeA}`} aria-hidden="true">brightness(1.00) contrast(1.00) saturate(1.00)</code>
            <code className={`${styles.demoCode} ${styles.demoCodeB}`} aria-hidden="true">brightness(1.18) contrast(1.22) saturate(1.30)</code>
          </span>
        </div>
      </div>
    </main>
  );
}
