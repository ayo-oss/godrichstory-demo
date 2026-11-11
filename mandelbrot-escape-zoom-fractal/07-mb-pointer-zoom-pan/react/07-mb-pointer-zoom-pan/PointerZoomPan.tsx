// PointerZoomPan — vanilla 판(run/323/demo/07-mb-pointer-zoom-pan/index.html) 의 React 포트.
// 탐험 사이트의 조작 레이어.
// 줌의 핵심 불변식: 휠 이벤트가 일어난 화면 좌표가 나타내는 복소평면 점이 줌 뒤에도
// 같은 화면 좌표에 남아야 한다(포인터 아래가 팽창한다). scale 갱신과 center 갱신을
// 한 식으로 묶는다: center = point - (point - center) * (oldScale / newScale).
// 드래그 팬은 center 를 이동 델타만큼 평행이동. 최대 반복은 log(배율)에 비례해 올라간다.
// 미리보기(데모 기본 상태)는 이 조작을 시뮬레이션한다 — 실제 wheel·pointer 이벤트를
// 디스패치하는 게 아니라 같은 공개 함수(zoomAt·panBy)를 시나리오 순서로 부른다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as RPointerEvent } from "react";
import styles from "./PointerZoomPan.module.scss";

// 로컬 wheel 이벤트 타입 — react 스텁 ambient 가 WheelEvent 제네릭을 주지 않는다(237 실측 계열)
type RWheelEvent<T> = {
  currentTarget: T; clientX: number; clientY: number; deltaY: number;
  preventDefault(): void; [k: string]: unknown;
};

export type PointerZoomPanProps = {
  duration?: string;
  easing?: string;
  color?: string;
  maxit1?: number;   // 심층 최대 반복 — 변형 "심층 반복"이 400 → 800
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const MAXIT0 = 96;   // 배율 1 최대 반복
const IRES = 240;    // 내부 계산 해상도(가로 픽셀)
const START_SCALE = 2.9;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type View = { cx: number; cy: number; scale: number };

const FIELD_LABEL = "포인터 줌 팬 탐험판";
const META_LEFT = "휠 줌 · 드래그 팬 · 최대 반복 96 → 400";
const META_RIGHT = "canvas · pointerdown · wheel";
const HINT = "휠은 클릭한 점으로 빨려 들어가고, 드래그는 패닝입니다 — 미리보기는 사람의 손을 대신해 두 동작을 번갈아 보여줍니다";
const ZOOM_INIT = "x1";

export default function PointerZoomPan({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
  maxit1 = 400
}: PointerZoomPanProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ovRef = useRef<HTMLCanvasElement | null>(null);
  const octxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const setRef = useRef<RGB | null>(null);
  const maxit1Ref = useRef(maxit1) as Box<number>;
  // 뷰 상태 — 줌·팬이 이 셋을 바꾼다
  const viewRef = useRef<View>({ cx: -0.75, cy: 0, scale: START_SCALE }) as Box<View>;
  const dragRef = useRef(null) as Box<{ x0: number; y0: number; cx0: number; cy0: number } | null>;
  const userTouchedRef = useRef(false) as Box<boolean>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [zoom, setZoom] = useState(ZOOM_INIT);
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
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const W = Math.round(r.width), H = Math.round(r.height);
    wRef.current = W; hRef.current = H;
    cv.width = W; cv.height = H;
    ctxRef.current = cv.getContext("2d");
    const ov = document.createElement("canvas");
    ov.width = IRES;
    ov.height = Math.max(2, Math.round(IRES * H / W));
    ovRef.current = ov;
    octxRef.current = ov.getContext("2d");
  }

  function maxIter(): number {
    const k = START_SCALE / viewRef.current.scale;
    return Math.round(MAXIT0 + (maxit1Ref.current - MAXIT0) * Math.min(1, Math.log(k) / Math.log(150)));
  }

  // 화면 좌표 → 복소평면
  function toPlane(x: number, y: number): { x: number; y: number } {
    const view = viewRef.current;
    const dx = view.scale / wRef.current;
    return {
      x: view.cx - view.scale / 2 + x * dx,
      y: view.cy - (hRef.current * dx) / 2 + y * dx
    };
  }

  function render(): void {
    const octx = octxRef.current;
    const ov = ovRef.current;
    const ctx = ctxRef.current;
    const PAL = palRef.current;
    const C_SET = setRef.current;
    const view = viewRef.current;
    const W = wRef.current, H = hRef.current;
    if (!octx || !ov || !ctx || !PAL || !C_SET) return;
    const iw = ov.width, ih = ov.height;
    const maxit = maxIter();
    const img = octx.createImageData(iw, ih);
    const px = img.data;
    const dx = view.scale / iw, dy = view.scale / iw;
    const oy0 = view.cy - (ih * dy) / 2;
    let k = 0;
    for (let j = 0; j < ih; j++) {
      const ci = oy0 + j * dy;
      for (let i = 0; i < iw; i++) {
        const cr = view.cx - view.scale / 2 + i * dx;
        let zr = 0, zi = 0, n = 0;
        while (n < maxit && zr * zr + zi * zi <= 4) {
          const t = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = t; n++;
        }
        let r: number, g: number, b: number;
        if (n >= maxit) {
          r = C_SET[0]; g = C_SET[1]; b = C_SET[2];
        } else {
          const u = (n / maxit) * 4;
          const seg = u - Math.floor(u / 4) * 4;
          const a = PAL[Math.floor(seg) % 4], bb = PAL[(Math.floor(seg) + 1) % 4];
          const f = seg - Math.floor(seg);
          r = a[0] + (bb[0] - a[0]) * f;
          g = a[1] + (bb[1] - a[1]) * f;
          b = a[2] + (bb[2] - a[2]) * f;
        }
        px[k++] = r; px[k++] = g; px[k++] = b; px[k++] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.drawImage(ov, 0, 0, W, H);
    const kk = Math.round(START_SCALE / view.scale);
    setZoom(kk >= 1000 ? "x" + Math.round(kk / 100) / 10 + "k" : "x" + kk);
  }

  // ── 공개 조작 — 사람 이벤트와 미리보기 시나리오가 같은 길을 쓴다 ──
  function zoomAt(px_: number, py_: number, factor: number): void {
    // (px_, py_) 화면 좌표의 복소평면 점이 줌 뒤에도 그 자리에 남게 center 보정
    const p = toPlane(px_, py_);
    const view = viewRef.current;
    view.scale /= factor;
    view.cx = p.x + (view.cx - p.x) / factor;
    view.cy = p.y + (view.cy - p.y) / factor;
  }
  function panBy(dxPx: number, dyPx: number): void {
    const view = viewRef.current;
    const dx = view.scale / wRef.current;
    view.cx -= dxPx * dx;
    view.cy += dyPx * dx;
  }

  // 사람 조작 — 휠(포인터 아래 줌)·드래그(팬). 사람이 조작하면 미리보기 시나리오를 끈다
  function onWheel(e: RWheelEvent<HTMLDivElement>): void {
    e.preventDefault();
    const cv = cvRef.current;
    if (!cv) return;
    userTouchedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    const r = cv.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.18 : 1 / 1.18);
    render();
  }
  function onPointerDown(e: RPointerEvent<HTMLDivElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    const view = viewRef.current;
    dragRef.current = { x0: e.clientX, y0: e.clientY, cx0: view.cx, cy0: view.cy };
  }
  function onPointerMove(e: RPointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (!drag) return;
    userTouchedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    const view = viewRef.current;
    view.cx = drag.cx0; view.cy = drag.cy0;
    panBy(e.clientX - drag.x0, e.clientY - drag.y0);
    render();
  }
  function onPointerUp(): void {
    dragRef.current = null;
  }

  // ── 미리보기 시나리오 — 사람의 손을 대신하는 시각화 루프 ──
  // 2초를 4막으로: ① 명치 오른쪽 전구로 줌인(0~0.5) ② 위쪽으로 팬(0.5~0.7)
  // ③ 다시 줌인(0.7~0.85) ④ 줌 아웃으로 복귀(0.85~1). 매 스텝마다 render.
  function previewState(t: number): View {
    // 기본 뷰에서 시작해 시나리오를 t 에 맞춰 처음부터 재생한다(결정론)
    const v: View = { cx: -0.75, cy: 0, scale: START_SCALE };
    const k1 = Math.pow(9, Math.min(1, t / 0.5));         // 막1 — x9 까지
    v.scale = START_SCALE / k1;
    const p = { x: -0.16, y: -0.84 };                      // 전구 아래 안테나 근처 목표
    v.cx = -0.75 + (p.x + 0.75) * Math.min(1, t / 0.5) * 0.42;
    v.cy = p.y * Math.min(1, t / 0.5) * 0.42;
    if (t > 0.5) {                                         // 막2 — 팬 위로
      const up = Math.min(1, (t - 0.5) / 0.2);
      v.cy += -0.34 * up * v.scale * 0.5;
      v.cx += 0.10 * up * v.scale * 0.5;
    }
    if (t > 0.7) {                                         // 막3 — 더 줌
      const k2 = Math.pow(4, Math.min(1, (t - 0.7) / 0.15));
      v.scale /= k2;
    }
    if (t > 0.85) {                                        // 막4 — 원경 복귀
      const back = (t - 0.85) / 0.15;
      const ks = Math.pow(START_SCALE / v.scale, back);
      v.scale *= ks;
      v.cx = v.cx * (1 - back) + (-0.75) * back;
      v.cy = v.cy * (1 - back) + 0 * back;
    }
    return v;
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 2.0;
    const v = previewState(loop / 2.0);
    viewRef.current.cx = v.cx; viewRef.current.cy = v.cy; viewRef.current.scale = v.scale;
    render();
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    maxit1Ref.current = maxit1;
    palRef.current = ["--mb-c0", "--mb-c1", "--mb-c2", "--mb-c3", "--mb-c4"].map((nm) => tokRGB(root, nm));
    setRef.current = tokRGB(root, "--mb-set");
    fit();
    function onResize(): void {
      fit(); render();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      viewRef.current = { cx: -0.24, cy: -0.62, scale: 0.9 };   // reduce — 전구 클로즈업 한 장 고정
      render();
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
  }, [maxit1]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>{HINT}</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <span className={styles.zoom}>{zoom}</span>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
