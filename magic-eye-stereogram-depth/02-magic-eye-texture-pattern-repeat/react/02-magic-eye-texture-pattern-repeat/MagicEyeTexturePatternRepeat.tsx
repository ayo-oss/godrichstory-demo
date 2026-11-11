// MagicEyeTexturePatternRepeat — vanilla 판(run/325/demo/02-magic-eye-texture-pattern-repeat/index.html) 의 React 포트.
// 노이즈 대신 폭 TILE=100px 짜리 타일 무늬(사다리꼴 스트라이프)를 깐다.
// 무늬가 주기적이면 시프트가 주기의 배수일 때 이음매가 딱 맞고, 그렇지 않으면 어긋나 도드라진다 —
// 깊이를 4단 계단으로 두면 단마다 어긋남의 크기가 달라 "몇 픽셀 밀었는지"가 무늬로 읽힌다.
// 계단이 좌우로 주사하며 한 단씩 올라오므로 어긋남의 띠가 화면을 흐른다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MagicEyeTexturePatternRepeat.module.scss";

export type MagicEyeTexturePatternRepeatProps = {
  duration?: string;
  easing?: string;
  color?: string;
  tile?: number;    // 타일 폭(px) — 140으로 넓히면 눈을 더 멀리 늦춰야 한다(변형 2)
  cycle?: number;   // 주사 주기(초)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const TILE  = 100;              // 타일 폭(px)
const STEPS = [4, 8, 12, 16];   // 계단 깊이(px)
const CYCLE = 2.0;              // 주사 주기(초) — 설정 초(2s)와 같다
const FLOW  = 28;               // 패턴 순환 속도(px/초)

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "타일 정밀 판";
const META_LEFT = "타일 폭 100px · 계단 4단(4·8·12·16px) · 패턴 흐름 28px/초";
const META_RIGHT = "이산 시차 · 계단 주사";
const HINT_TITLE = "패턴 타일";
const HINT_DESC = "타일 무늬를 일정 폭으로 반복하면 이음매가 어긋나는 지점이 정확히 보입니다";

export default function MagicEyeTexturePatternRepeat({
  duration = "2s",
  easing = "ease-out",
  color = "#3a3050",
  tile = TILE,
  cycle = CYCLE
}: MagicEyeTexturePatternRepeatProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const c0Ref = useRef<RGB | null>(null);
  const c1Ref = useRef<RGB | null>(null);
  const c2Ref = useRef<RGB | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    const ctx = ctxRef.current;
    if (!field || !cv || !ctx) return;
    const r = field.getBoundingClientRect();
    wRef.current = Math.round(r.width);
    hRef.current = Math.round(r.height);
    cv.width = wRef.current;
    cv.height = hRef.current;
    imgRef.current = ctx.createImageData(wRef.current, hRef.current);
  }

  // 타일 무늬 — 캔버스 좌표(반복 주기 좌표)를 받아 색을 결정한다.
  // 사선 스트라이프 + 링: 같은 타일이 반복되는지 바로 보이는 무늬.
  function tileColor(px: number, py: number): RGB {
    const C0 = c0Ref.current, C1 = c1Ref.current, C2 = c2Ref.current;
    if (!C0 || !C1 || !C2) return C0 || [0, 0, 0];
    const tx = ((px % tile) + tile) % tile, ty = ((py % tile) + tile) % tile;
    const diag = (tx + ty) % tile;                       // 사선 좌표
    if (diag < 14 || diag > tile - 14) return C2;        // 굵은 사선 띠
    const dx = tx - tile * 0.5, dy = ty - tile * 0.5;
    const rr = Math.sqrt(dx * dx + dy * dy);
    if (rr < 9) return C2;                               // 중앙 점
    if (rr < 15) return C0;                              // 점 테두리
    return (diag % 50 < 4) ? C1 : C0;                    // 바탕 + 가는 보조선
  }

  // 깊이 — 가로 4단 계단. 주사 위상에 따라 어떤 단이 화면에 들어와 있는지 달라진다.
  function depthAt(x: number, y: number, t: number): number {
    const W = wRef.current;
    const band = Math.floor(y * 4 + Math.floor(x / (W / 4)));   // 대각 계단 인덱스
    const scan = (t / cycle) % 1;                               // 0..1 주사 위상
    const appear = (((band % 8) + 8) % 8) / 8;                  // 단마다 등장 시각을 엇갈리게
    const lift = Math.max(0, Math.sin((scan - appear) * Math.PI * 2 - Math.PI / 2) * .5 + .5);
    return lift * lift;
  }

  function shiftFor(x: number, y: number, t: number): number {
    const W = wRef.current;
    const band = Math.floor(x / (W / 4)) % 4;
    return Math.round(STEPS[band] * depthAt(x, y, t));
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const img = imgRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !img) return;
    const d = img.data;
    const flowY = Math.floor(t * FLOW);   // 패턴 순환 — 타일이 천천히 아래로 흐른다(정수 픽셀)
    for (let y = 0; y < H; y++) {
      const rowY = y + flowY;
      for (let x = 0; x < W; x++) {
        const s = shiftFor(x, rowY, t);
        const src = x - s;
        // 타일 좌표계는 무한히 반복되므로 음수도 그냥 넘겨면 tileColor 가 되감는다
        const c = tileColor(src, rowY);
        const di = (y * W + x) * 4;
        d[di] = c[0]; d[di + 1] = c[1]; d[di + 2] = c[2]; d[di + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    draw((now - t0) / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    c0Ref.current = tokRGB(root, "--me-c0");   // 타일 바탕 — 크림
    c1Ref.current = tokRGB(root, "--me-c1");   // 보조선 — 파스텔 청회
    c2Ref.current = tokRGB(root, "--me-c2");   // 사선 띠 — 진보라 잉크
    ctxRef.current = cv.getContext("2d");
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(0.25);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0.25);                                 // reduce — 한 단이 뜬 계단 한 장만 고정
      setStill(true);
    } else {
      t0 = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tile, cycle]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>{HINT_TITLE}</span>
          <span className={styles.desc}>{HINT_DESC}</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
