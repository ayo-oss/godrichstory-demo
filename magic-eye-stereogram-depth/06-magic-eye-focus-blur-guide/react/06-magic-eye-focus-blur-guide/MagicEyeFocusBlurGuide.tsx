// MagicEyeFocusBlurGuide — vanilla 판(run/325/demo/06-magic-eye-focus-blur-guide/index.html) 의 React 포트.
// 안 되는 사람을 10초 안에 보게 만드는 접근성 항목.
// ① 단서 두 점: 판 위에 스테레오 시차(100px)만큼 벌어진 같은 점을 띄운다 —
//    두 점이 하나로 겹치는 순간 눈이 평행이 되고, 그 상태로 판을 보면 도넛이 떠오른다.
//    격자 미리보기(isDemo)에서 점이 천천히 벌어졌다 모이며 그 각을 연습시킨다.
// ② 풀이 지도: 같은 깊이 지도를 회색 농담으로 캔버스에 겹쳐 그린다 — 노이즈로는 안 보이는
//    사람에게 "무엇이 어디에" 있는지 확정해 주고, 다시 숨기면 노이즈가 이해된다.
// 모든 움직임(점 벌림·지도 점등)을 rAF 캔버스로 그린다 — CSS 애니메이션은 캡처 시계와 어긋난다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MagicEyeFocusBlurGuide.module.scss";

export type MagicEyeFocusBlurGuideProps = {
  duration?: string;
  easing?: string;
  color?: string;
  sep?: number;       // 단서 두 점 벌림(px) — 눈이 늦춰야 할 시차
  maxshift?: number;  // 도넛 깊이(px)
  cycle?: number;     // 단서 벌림 주기(초)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const SEP      = 100;   // 단서 두 점 벌림(px)
const MAXSHIFT = 10;    // 도넛 깊이(px)
const CYCLE    = 2.0;   // 단서 벌림 주기(초) — 설정 초(2s)와 같다

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "보는법 연습판";
const META = "단서 두 점 벌림 100px · 풀이 지도 1초 점등";
const HINT_TITLE = "보는법 가이드";
const HINT_DESC = "위의 두 점이 하나로 겹칠 때까지 눈을 늦추면 아래 판의 원반이 떠오릅니다";
const BTN_SHOW = "풀이 지도 보기";
const BTN_HIDE = "풀이 지도 숨기기";

export default function MagicEyeFocusBlurGuide({
  duration = "2s",
  easing = "ease-out",
  color = "#5d74c0",
  sep = SEP,
  maxshift = MAXSHIFT,
  cycle = CYCLE
}: MagicEyeFocusBlurGuideProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const dotRef = useRef<RGB | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const demoRef = useRef(true) as Box<boolean>;
  const mapRef = useRef(false) as Box<boolean>;
  const [still, setStill] = useState(false);
  const [showMap, setShowMap] = useState(false);
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

  function baseIdx(x: number, y: number): number {
    const pal = palRef.current;
    if (!pal) return 0;
    let h = (Math.imul(x + 11, 374761393) + Math.imul(y + 7, 668265263)) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 1274126177) >>> 0;
    h ^= h >>> 16;
    return ((h % pal.length) + pal.length) % pal.length;
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

  // 깊이 — 중앙 도넛(안쪽 구멍이 낮다). 풀이 지도와 같은 식을 공유한다.
  // 도넛은 천천히 떠오랐다 가라앉으며(bob) 깊이도 맥동한다 — 노이즈 판이 쉬지 않고 재엮긴다.
  function depthAt(x: number, y: number, t: number): number {
    const W = wRef.current, H = hRef.current;
    const ph = t / cycle * Math.PI * 2;
    const cy = H * 0.54 + Math.sin(ph) * H * 0.08;              // 수직 bob
    const cx = W * 0.5;
    const rad = Math.min(W, H) * 0.36;
    const dx = (x - cx) / rad, dy = (y - cy) / rad;
    const d2 = dx * dx + dy * dy;
    if (d2 >= 1) return 0;
    const ring = Math.sqrt(d2);
    const hole = ring < 0.36 ? 0.22 : 1;   // 안쪽 구멍은 낮게 — 입체로 읽으면 도넛
    const pulse = 0.55 + 0.45 * (Math.sin(ph - Math.PI / 2) * .5 + .5);   // 깊이 맥동
    return Math.sqrt(1 - d2 * 0.25) * 0.92 * hole * pulse;
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const img = imgRef.current;
    const pal = palRef.current;
    const DOT = dotRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !img || !pal || !DOT) return;
    const ph = t / cycle * Math.PI * 2;
    const d = img.data;
    const col = new Int32Array(W);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const s = Math.round(depthAt(x, y, t) * maxshift);
        if (s <= 0) {
          col[x] = baseIdx(x, y);
        } else {
          const from = x - s;
          col[x] = from >= 0 ? col[from] : baseIdx(from + W, y);
        }
      }
      for (let x = 0; x < W; x++) {
        const c = pal[col[x]];
        const di = (y * W + x) * 4;
        d[di] = c[0]; d[di + 1] = c[1]; d[di + 2] = c[2]; d[di + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // ── 격자 미리보기 연출(demoRef 가 참일 때만) ──
    if (demoRef.current) {
      // 단서 두 점 — 천천히 벌어졌다 모인다
      const open = Math.max(0, Math.sin(ph - Math.PI / 2) * .5 + .5);
      const px = open * sep / 2;
      ctx.fillStyle = "rgba(" + DOT[0] + "," + DOT[1] + "," + DOT[2] + ",0.92)";
      ctx.beginPath(); ctx.arc(W / 2 - px, 14, 3.5, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(W / 2 + px, 14, 3.5, 0, 6.2832); ctx.fill();

      // 풀이 지도 — 주기 뒤 절반(1초) 동안 농담으로 겹쳐 그렸다 지운다
      const litPhase = ph % (Math.PI * 2);
      if (litPhase > Math.PI) {
        const a = Math.min(1, (litPhase - Math.PI) / (Math.PI * 0.15));
        const fade = Math.max(0, (Math.PI * 1.92 - litPhase) / (Math.PI * 0.08));
        const alpha = Math.min(a, fade) * 0.9;
        ctx.fillStyle = "rgba(24, 20, 30, " + alpha.toFixed(3) + ")";
        ctx.fillRect(0, 0, W, H);
        // 도넛을 밝은 농담으로 — 깊이를 그대로 밝기로 보여준다
        for (let gy = 0; gy < H; gy += 2) {
          for (let gx = 0; gx < W; gx += 2) {
            const dp = depthAt(gx, gy, t);
            if (dp <= 0) continue;
            const v = Math.round(dp * 255 * alpha);
            ctx.fillStyle = "rgba(" + v + "," + v + "," + v + "," + (0.9 * alpha).toFixed(3) + ")";
            ctx.fillRect(gx, gy, 2, 2);
          }
        }
      }
    } else if (mapRef.current) {
      // 사람 토글 상태 — 지도를 계속 띄운다
      ctx.fillStyle = "rgba(24, 20, 30, 0.9)";
      ctx.fillRect(0, 0, W, H);
      for (let gy = 0; gy < H; gy += 2) {
        for (let gx = 0; gx < W; gx += 2) {
          const dp = depthAt(gx, gy, t);
          if (dp <= 0) continue;
          const v = Math.round(dp * 255);
          ctx.fillStyle = "rgba(" + v + "," + v + "," + v + ",0.9)";
          ctx.fillRect(gx, gy, 2, 2);
        }
      }
    }
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    draw((now - t0) / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  function toggleMap(): void {
    const next = !mapRef.current;
    mapRef.current = next;
    demoRef.current = false;   // 격자 연출을 물린다
    setShowMap(next);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    const pal: RGB[] = [];
    for (let i = 0; i < 5; i++) pal.push(tokRGB(root, "--me-p" + i));
    palRef.current = pal;
    dotRef.current = tokRGB(root, "--me-dot");
    ctxRef.current = cv.getContext("2d");
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(cycle / 2);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(cycle / 2);   // reduce — 완전히 벌어진 단서와 판 한 장만 고정
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
  }, [sep, maxshift, cycle]);

  const rootCls = still
    ? `${styles.root} ${styles.isStill}`
    : `${styles.root} ${styles.isDemo}`;

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
          <button className={styles.btn} type="button" onClick={toggleMap}>
            {showMap ? BTN_HIDE : BTN_SHOW}
          </button>
          <span className={styles.meta}>{META}</span>
        </div>
      </div>
    </main>
  );
}
