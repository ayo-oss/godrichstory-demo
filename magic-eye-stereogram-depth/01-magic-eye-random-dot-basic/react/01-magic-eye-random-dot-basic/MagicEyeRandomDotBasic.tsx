// MagicEyeRandomDotBasic — vanilla 판(run/325/demo/01-magic-eye-random-dot-basic/index.html) 의 React 포트.
// 1) 시간이 지나도 같은 난수 노이즈를 깐다(밑칠 baseIdx — 씨앗은 좌표만 받는다).
// 2) 깊이 지도 depth(x,y) 를 계산해 0..1 로 정규화한다(여기선 숨쉬는 반구 원판).
// 3) 각 행을 왼쪽에서 오른쪽으로 훑며, 깊이가 0인 칸은 밑칠 그대로 두고
//    깊이가 있는 칸은 col[x] = col[x - round(depth*MAXSHIFT)] 로 왼쪽에서 복사한다.
//    같은 낱알이 두 눈에 시차를 두고 들어와 입체로 읽히는 autostereogram 계산의 전부다.
// 원판이 주기 안에 부풀었다 가라앉으면 복사 거리가 바뀌어 원판 영역의 낱알이 다시 엮인다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MagicEyeRandomDotBasic.module.scss";

export type MagicEyeRandomDotBasicProps = {
  duration?: string;
  easing?: string;
  color?: string;
  maxshift?: number;   // 돌출 깊이(px) — 22로 올리면 공이 코앞까지 나온다(변형 1)
  cycle?: number;      // 숨쉬기 주기(초)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const MAXSHIFT = 10;   // 돌출 깊이(px)
const CYCLE    = 2.0;  // 숨쉬기 주기(초) — 설정 초(2s)와 같아 한 주기가 한 루프

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "랜덤닷 실험판";
const META_LEFT = "돌출 깊이 10px · 낱알 1px · 주기 2초";
const META_RIGHT = "ImageData · 행별 시프트";
const HINT_TITLE = "랜덤닷 기본";
const HINT_DESC = "노이즈를 깔고 원판의 픽셀을 줄 안에서 몇 칸 밀면 눈을 늦추는 순간 원이 공으로 떠오릅니다";

export default function MagicEyeRandomDotBasic({
  duration = "2s",
  easing = "ease-out",
  color = "#cfd8f2",
  maxshift = MAXSHIFT,
  cycle = CYCLE
}: MagicEyeRandomDotBasicProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
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

  // ── 밑칠 노이즈 — 좌표만 받는 결정적 해시. 시간을 안 받으므로 프레임 사이에 같다(눈이 패턴을 기억한다) ──
  function baseIdx(x: number, y: number): number {
    const pal = palRef.current;
    if (!pal) return 0;
    let h = (Math.imul(x + 11, 374761393) + Math.imul(y + 7, 668265263)) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 1274126177) >>> 0;
    h ^= h >>> 16;
    return ((h % pal.length) + pal.length) % pal.length;   // ^ 는 ToInt32 로 음수가 될 수 있어 접는다
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

  // 깊이 지도 — 중앙 반구가 부풀었다 가라앉으며 살짝 위아래로도 흐른다. 0(배경) .. 1(최대 돌출)
  function depthAt(x: number, y: number, t: number): number {
    const W = wRef.current, H = hRef.current;
    const ph = t / cycle * Math.PI * 2;
    const cx = W * 0.5, cy = H * 0.5 + Math.sin(ph) * H * 0.07;
    const rad = Math.min(W, H) * 0.74;
    const dx = (x - cx) / rad, dy = (y - cy) / rad;
    const d2 = dx * dx + dy * dy;
    if (d2 >= 1) return 0;
    const bulge = 0.16 + 0.84 * (Math.sin(ph - Math.PI / 2) * .5 + .5);
    return Math.sqrt(1 - d2) * bulge;   // 반구 단면 × 숨쉬기
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const img = imgRef.current;
    const pal = palRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !img || !pal) return;
    const d = img.data;
    const col = new Int32Array(W);   // 이 행의 낱알 팔레트 인덱스
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const s = Math.round(depthAt(x, y, t) * maxshift);
        if (s <= 0) {
          col[x] = baseIdx(x, y);                    // 배경 — 밑칠 낱알 그대로
        } else {
          const from = x - s;
          col[x] = from >= 0 ? col[from] : baseIdx(from + W, y);  // 왼쪽에서 복사(화면 밖은 되감아)
        }
      }
      for (let x = 0; x < W; x++) {
        const c = pal[col[x]];
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
    const pal: RGB[] = [];
    for (let i = 0; i < 5; i++) pal.push(tokRGB(root, "--me-p" + i));
    palRef.current = pal;
    ctxRef.current = cv.getContext("2d");
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(0.5);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0.5);                                  // reduce — 부풀은 원판 한 장만 고정
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
  }, [maxshift, cycle]);

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
