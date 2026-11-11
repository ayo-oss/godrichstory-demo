// SeedAvatarBackground — vanilla 판(run/293/demo/09-generative-seed-avatar-bg/index.html) 의 React 포트.
// 시드가 숫자가 아니라 글자열이다. FNV-1a 로 접어 얻은 32비트 정수를 그대로 난수 시드로 쓰면
// 같은 이름은 언제나 같은 무늬로 돌아온다. 격자 수·칸 크기·이름 목록은 vanilla 와 같은 값이다.
import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SeedAvatarBackground.module.scss";

export type SeedAvatarBackgroundProps = {
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
  seedText?: string;
  regenerateText?: string;
  copyText?: string;
  copiedText?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

// 조각 하나 — 모양(1 네모 · 2 원 · 그 밖 삼각형)·왼쪽 위 좌표·색 계열·대각선 차례
type Bit = { kind: number; x: number; y: number; tone: string; order: number };

const COLS = 12;
const ROWS = 8;
const CELL = 20;
const HALF = 6;
const NAMES: string[] = ["godrich", "aurora", "bluebird", "studio", "maker"];
const TONES: string[] = ["a", "b", "c"];

// mulberry32 — 32비트 정수 시드 하나로 언제나 같은 난수열을 돌려준다. 재현 가능한 생성의 뿌리
function mulberry32(a: number): () => number {
  return function (): number {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// FNV-1a: 글자 하나씩 섞어 32비트 정수 하나로 접는다. 같은 글자열은 언제나 같은 숫자가 된다
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

// 반쪽(HALF 열)만 뽑고 오른쪽은 거울처럼 되비춘다 — 좌우 대칭이라야 얼굴처럼 읽힌다.
// 건너뛰는 칸에서도 난수를 세 번 다 뽑는다 (vanilla 와 같은 순서라야 같은 이름에 같은 무늬가 나온다)
function build(name: string): Bit[] {
  const rand = mulberry32(hash(name));
  const parts: Bit[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < HALF; col++) {
      const draw = rand();
      const kind = 1 + Math.floor(rand() * 3);
      const tone = TONES[Math.floor(rand() * 3)];
      if (draw < 0.38) { continue; }
      const order = col + row;
      parts.push({ kind: kind, x: col * CELL, y: row * CELL - 8, tone: tone, order: order });
      parts.push({ kind: kind, x: (COLS - 1 - col) * CELL, y: row * CELL - 8, tone: tone, order: order });
    }
  }
  return parts;
}

// 색 계열은 문자열 하나지만 CSS 모듈 클래스는 객체 속성이라 이렇게 갈라 준다 (동적 색인 금지)
function toneClass(tone: string): string {
  if (tone === "a") { return styles.bitA; }
  if (tone === "b") { return styles.bitB; }
  return styles.bitC;
}

function renderBit(b: Bit, key: string) {
  const cls = `${styles.bit} ${toneClass(b.tone)}`;
  const vars = { "--i": b.order } as CSSProperties;
  if (b.kind === 1) {
    return <rect key={key} className={cls} style={vars} x={b.x + 3} y={b.y + 3} width={14} height={14} rx={4} />;
  }
  if (b.kind === 2) {
    return <circle key={key} className={cls} style={vars} cx={b.x + 10} cy={b.y + 10} r={7.5} />;
  }
  const points = `${b.x + 10},${b.y + 2} ${b.x + 18},${b.y + 18} ${b.x + 2},${b.y + 18}`;
  return <polygon key={key} className={cls} style={vars} points={points} />;
}

export default function SeedAvatarBackground({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
  label = "A left-right symmetric background folded out of a name, seed {n}",
  seedText = "Seed",
  regenerateText = "Regenerate",
  copyText = "Copy SVG",
  copiedText = "Copied",
}: SeedAvatarBackgroundProps) {
  const artRef = useRef<SVGSVGElement | null>(null);
  const timerRef = useRef<number>(0) as Box<number>;
  const [nameIndex, setNameIndex] = useState(0);
  const [mode, setMode] = useState("demo");
  const [copyLabel, setCopyLabel] = useState(copyText);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const name = NAMES[nameIndex];
  // 이름이 바뀔 때만 다시 계산한다 — 같은 이름이면 언제나 같은 무늬가 나온다
  const bits = useMemo(() => build(NAMES[nameIndex]), [nameIndex]);

  function regenerate(): void {
    setNameIndex((prev: number) => (prev + 1) % NAMES.length);
    setMode("draw");
  }

  function copySvg(): void {
    const art = artRef.current;
    if (!art) { return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(art.outerHTML).catch(function () {});
    }
    setCopyLabel(copiedText);
    clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopyLabel(copyText), 1200);
  }

  const rootClass = `${styles.sa} ${mode === "demo" ? styles.isDemo : styles.isDraw}`;

  return (
    <div className={rootClass} style={vars}>
      <svg
        ref={artRef}
        className={styles.art}
        viewBox="0 0 240 144"
        role="img"
        aria-label={label.replace("{n}", name)}
      >
        {bits.map((b: Bit, i: number) => renderBit(b, String(i)))}
      </svg>
      <div className={styles.bar}>
        <p className={styles.seed}>{seedText} <b>{name}</b></p>
        <button className={styles.btn} type="button" onClick={regenerate}>{regenerateText}</button>
        <button className={styles.btn} type="button" onClick={copySvg}>{copyLabel}</button>
      </div>
    </div>
  );
}
