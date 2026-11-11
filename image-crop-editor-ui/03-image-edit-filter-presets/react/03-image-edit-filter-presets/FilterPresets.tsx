// FilterPresets — vanilla 판(run/295/demo/03-image-edit-filter-presets/index.html) 의 React 포트.
// 프리셋 여섯 개의 값은 PRESETS 배열 하나뿐이다 — 사진에 거는 CSS filter 와 아래 칸에 찍는 글자가 같은 문자열이다.
// 누른 칸은 aria-pressed 로 알리고, 테두리는 인덱스 × 100% 만큼 옆으로 민다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FilterPresets.module.scss";

export type FilterPresetsProps = {
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
type Preset = { name: string; chain: string; sw: string };

const VIEW_LABEL = "미리보기 사진, 필터 %n";
// 첫 화면의 대체텍스트는 통째로 사전에 든 문자열이다 — 「없음」만 따로 떼면 언어팩이 그 조각을 못 바꾼다
const VIEW_LABEL_NONE = "미리보기 사진, 필터 없음";
const VIEW_W = 320;
const VIEW_H = 200;

const PRESETS: Preset[] = [
  { name: "원본", chain: "none", sw: "swA" },
  { name: "흑백", chain: "grayscale(1) contrast(1.08)", sw: "swB" },
  { name: "세피아", chain: "sepia(0.75) saturate(1.2)", sw: "swC" },
  { name: "선명", chain: "contrast(1.3) saturate(1.35)", sw: "swD" },
  { name: "차분", chain: "saturate(0.55) brightness(1.08)", sw: "swE" },
  { name: "빈티지", chain: "sepia(0.4) contrast(0.9) hue-rotate(-14deg)", sw: "swF" },
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

export default function FilterPresets({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: FilterPresetsProps) {
  const viewRef = useRef<HTMLCanvasElement | null>(null);
  const [picked, setPicked] = useState(-1);
  const [demo, setDemo] = useState(true);
  const [photo, setPhoto] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  if (photo) vars["--photo"] = `url(${photo})`;

  // 아직 아무것도 안 누른 첫 화면은 원본 그대로다 — 그때의 대체텍스트만 「필터 없음」이다
  const index = picked < 0 ? 0 : picked;
  const chain = PRESETS[index].chain;
  const label = picked < 0 ? VIEW_LABEL_NONE : VIEW_LABEL.replace("%n", PRESETS[index].name);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const ctx = view.getContext("2d");
    if (!ctx) return;
    paintPhoto(ctx, view.width, view.height);
    setPhoto(view.toDataURL());
  }, []);

  // 사진에는 CSS filter 를 그대로 걸고, 같은 문자열을 아래 칸에 글자로 내보낸다
  function pick(next: number): void {
    setDemo(false);
    setPicked(next);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.frame}>
          <canvas className={styles.view} ref={viewRef} width={VIEW_W} height={VIEW_H} role="img" aria-label={label} style={{ filter: chain }}></canvas>
          <span className={styles.ghost} aria-hidden="true"></span>
        </div>
        <div className={styles.row}>
          <span className={styles.ring} style={{ transform: `translateX(${index * 100}%)` }} aria-hidden="true"></span>
          {PRESETS.map((preset, i) => (
            <button
              key={preset.name}
              type="button"
              className={styles.preset}
              aria-pressed={picked < 0 ? i === 0 : i === picked}
              onClick={() => pick(i)}
            >
              <span className={[styles.sw, styles[preset.sw]].filter(Boolean).join(" ")} aria-hidden="true"></span>
              <span className={styles.name}>{preset.name}</span>
            </button>
          ))}
        </div>
        <p className={styles.code}>
          <code className={styles.real}>{`filter: ${chain};`}</code>
          <code className={`${styles.codeDemo} ${styles.codeA}`} aria-hidden="true">filter: none;</code>
          <code className={`${styles.codeDemo} ${styles.codeB}`} aria-hidden="true">filter: grayscale(1) contrast(1.08);</code>
          <code className={`${styles.codeDemo} ${styles.codeC}`} aria-hidden="true">filter: sepia(0.75) saturate(1.2);</code>
          <code className={`${styles.codeDemo} ${styles.codeD}`} aria-hidden="true">filter: contrast(1.3) saturate(1.35);</code>
          <code className={`${styles.codeDemo} ${styles.codeE}`} aria-hidden="true">filter: saturate(0.55) brightness(1.08);</code>
          <code className={`${styles.codeDemo} ${styles.codeF}`} aria-hidden="true">filter: sepia(0.4) contrast(0.9) hue-rotate(-14deg);</code>
        </p>
      </div>
    </main>
  );
}
