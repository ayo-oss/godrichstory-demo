// StringBezierPinsControl — vanilla 판(run/326/demo/04-string-bezier-pins-control/index.html) 의 React 포트.
// 컨트롤 핀이 실 부채꼴의 뼈대가 되는 드 카스텔료 구성. 양끝 고정핀 A·B 와 그 사이
// 컨트롤 핀 3개(C1·C2·C3)를 사슬로 잇고, 사슬의 같은 비율 점끼리 실을 건다 —
// 실의 포락선이 베지어 곡선을 따라간다. 컨트롤 핀을 끌면(pointermove) 그 자리에서
// 전체 실배치가 다시 감기고, 놔두면 1.5초마다 핀이 스스로 다음 자리로 옮겨가며 재계산한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StringBezierPinsControl.module.scss";

export type StringBezierPinsControlProps = {
  duration?: string;
  easing?: string;
  color?: string;
  recompute?: number;  // 실 배치 재계산 주기(초)
  fan?: number;        // 바깥 부채꼴 실 수 (A→C1 · C3→B 사이)
  fan2?: number;       // 안쪽 부채꼴 실 수 (C1→C2 · C2→C3 사이)
  fan3?: number;       // 옆 부채꼴 실 수 (사슬 앞쪽·뒤쪽 각 1개)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const NCTRL     = 3;    // 컨트롤 핀 개수
const RECOMPUTE = 1.5;  // 실 배치 재계산 주기(초)
const FAN       = 128;  // 바깥 부채꼴 실 수
const FAN2      = 96;   // 안쪽 부채꼴 실 수
const FAN3      = 84;   // 옆 부채꼴 실 수

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type XY = [number, number];
type UV = [number, number];   // 비율 좌표

const BOARD_LABEL = "베지어 실험판";
const META_LEFT = "컨트롤 핀 3개 · 실 곡선 1·5초마다 재계산";
const META_RIGHT = "pointermove · lineTo";
const HINT_TITLE = "베지어 감기";
const HINT_DESC = "컨트롤 핀을 끌면 실 배치가 실시간으로 다시 감긴다";

// 양끝 고정핀(비율 좌표) — 컨트롤 핀만 움직인다
const A: UV = [0.05, 0.50], B: UV = [0.95, 0.50];
// 컨트롤 핀 목표 자리 후보 — 재계산 주기마다 다음 후보로 글라이드(무대 전체 폭을 쓴다)
const PRESETS: UV[][] = [
  [[0.30, 0.22], [0.50, 0.82], [0.70, 0.24]],
  [[0.26, 0.78], [0.54, 0.16], [0.76, 0.70]],
  [[0.36, 0.14], [0.66, 0.86], [0.80, 0.26]],
  [[0.22, 0.46], [0.50, 0.90], [0.72, 0.42]],
  [[0.38, 0.84], [0.60, 0.14], [0.82, 0.74]],
  [[0.28, 0.28], [0.70, 0.40], [0.78, 0.82]]
];

export default function StringBezierPinsControl({
  duration = "2s",
  easing = "ease-out",
  color = "#6f7fae",
  recompute = RECOMPUTE,
  fan = FAN,
  fan2 = FAN2,
  fan3 = FAN3
}: StringBezierPinsControlProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ thrd: RGB; pin: RGB; hot: RGB; guide: RGB; panel: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const curRef = useRef<UV[]>(PRESETS[0].map((p): UV => [p[0], p[1]]));
  const tgtRef = useRef<UV[]>(PRESETS[0].map((p): UV => [p[0], p[1]]));
  const dragRef = useRef(-1) as Box<number>;
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

  function px(p: UV): XY {
    return [p[0] * wRef.current, p[1] * hRef.current];
  }
  function lerp(p: UV, q: UV, u: number): UV {
    return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
  }

  function fit(): void {
    const root = rootRef.current;
    const cv = cvRef.current;
    const ctx = ctxRef.current;
    if (!root || !cv || !ctx) return;
    const r = root.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    wRef.current = Math.round(r.width);
    hRef.current = Math.round(r.height);
    cv.width = Math.round(wRef.current * dpr);
    cv.height = Math.round(hRef.current * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(t: number, progress: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const W = wRef.current, H = hRef.current;
    const cur = curRef.current;
    const drag = dragRef.current;
    if (!ctx || !col || !cur) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);

    const C1 = cur[0], C2 = cur[1], C3 = cur[2];

    // 사슬 가이드 — 실이 어느 뼈대에 걸리는지 보여주는 점선
    ctx.strokeStyle = "rgba(" + col.guide.join(",") + ",0.55)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    const a0 = px(A);
    ctx.moveTo(a0[0], a0[1]);
    const c1p = px(C1), c2p = px(C2), c3p = px(C3), bp = px(B);
    ctx.lineTo(c1p[0], c1p[1]);
    ctx.lineTo(c2p[0], c2p[1]);
    ctx.lineTo(c3p[0], c3p[1]);
    ctx.lineTo(bp[0], bp[1]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 실 — 두 부채꼴. 방금 감은 올일수록 밝고 굵다(recency)
    ctx.lineCap = "round";
    ctx.shadowBlur = 6;
    ctx.shadowColor = "rgba(" + col.thrd.join(",") + ",0.35)";
    let i: number, u: number, recency: number, a: XY, b: XY, alpha: number;
    for (i = 0; i < fan; i++) {
      u = i / (fan - 1);
      if (u > progress) continue;
      a = px(lerp(A, C1, u)); b = px(lerp(C3, B, u));
      recency = Math.max(0, 1 - (progress - u));
      alpha = 0.44 + 0.5 * Math.pow(recency, 1.1);
      ctx.strokeStyle = "rgba(" + col.thrd.join(",") + "," + Math.min(0.95, alpha).toFixed(3) + ")";
      ctx.lineWidth = 2.4 + recency * 1.8;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    for (i = 0; i < fan2; i++) {
      u = i / (fan2 - 1);
      if (u > progress) continue;
      a = px(lerp(C1, C2, u)); b = px(lerp(C2, C3, u));
      recency = Math.max(0, 1 - (progress - u));
      alpha = (0.38 + 0.5 * Math.pow(recency, 1.1)) * 0.9;
      ctx.strokeStyle = "rgba(" + col.thrd.join(",") + "," + Math.min(0.9, alpha).toFixed(3) + ")";
      ctx.lineWidth = 2.1 + recency * 1.5;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    // 옆 부채꼴 2개 — 사슬 앞쪽(A·C1·C2)과 뒤쪽(C2·C3·B)을 각자 부채로 펼친다
    for (i = 0; i < fan3; i++) {
      u = i / (fan3 - 1);
      if (u > progress) continue;
      a = px(lerp(A, C1, u)); b = px(lerp(C1, C2, u));
      recency = Math.max(0, 1 - (progress - u));
      alpha = 0.36 + 0.48 * Math.pow(recency, 1.1);
      ctx.strokeStyle = "rgba(" + col.thrd.join(",") + "," + Math.min(0.9, alpha).toFixed(3) + ")";
      ctx.lineWidth = 2.2 + recency * 1.5;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    for (i = 0; i < fan3; i++) {
      u = i / (fan3 - 1);
      if (u > progress) continue;
      a = px(lerp(C2, C3, u)); b = px(lerp(C3, B, u));
      recency = Math.max(0, 1 - (progress - u));
      alpha = 0.36 + 0.48 * Math.pow(recency, 1.1);
      ctx.strokeStyle = "rgba(" + col.thrd.join(",") + "," + Math.min(0.9, alpha).toFixed(3) + ")";
      ctx.lineWidth = 2.2 + recency * 1.5;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 고정핀 — 마름모
    const anchors: XY[] = [px(A), px(B)];
    for (i = 0; i < 2; i++) {
      const an = anchors[i];
      ctx.fillStyle = "rgb(" + col.pin.join(",") + ")";
      ctx.beginPath();
      ctx.moveTo(an[0], an[1] - 5); ctx.lineTo(an[0] + 5, an[1]);
      ctx.lineTo(an[0], an[1] + 5); ctx.lineTo(an[0] - 5, an[1]);
      ctx.closePath(); ctx.fill();
    }

    // 컨트롤 핀 — 실색 채운 원 + 광택 고리(끌고 있는 핀은 더 밝게 맥동)
    const dragBoost = 0.5 + 0.5 * Math.sin(t * 6);
    for (i = 0; i < NCTRL; i++) {
      const c = px(cur[i]);
      ctx.strokeStyle = "rgba(" + col.hot.join(",") + "," + (0.55 + (drag === i ? 0.45 * dragBoost : 0)).toFixed(3) + ")";
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(c[0], c[1], drag === i ? 10 : 8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgb(" + col.thrd.join(",") + ")";
      ctx.beginPath(); ctx.arc(c[0], c[1], 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgb(" + col.pin.join(",") + ")";
      ctx.beginPath(); ctx.arc(c[0], c[1], 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    const cur = curRef.current, tgt = tgtRef.current;
    if (cur && tgt) {
      // 재계산 주기마다 다음 자리로 목표 갱신 — 컨트롤 핀이 스스로 움직여 재계산을 보여준다
      const pi = Math.floor(t / recompute) % PRESETS.length;
      for (let k = 0; k < NCTRL; k++) {
        if (dragRef.current !== k) tgt[k] = PRESETS[pi][k];
        cur[k][0] += (tgt[k][0] - cur[k][0]) * 0.09;
        cur[k][1] += (tgt[k][1] - cur[k][1]) * 0.09;
      }
    }

    // 주기 안 앞 85% 에 걸쳐 다시 감고, 나머지 구간은 핀 글라이드가 계속 움직인다
    const progress = Math.min(1, (t % recompute) / recompute / 0.85);
    draw(t, progress);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      thrd: tokRGB(root, "--sd-thread"),
      pin: tokRGB(root, "--sd-pin"),
      hot: tokRGB(root, "--sd-hot"),
      guide: tokRGB(root, "--sd-guide"),
      panel: tokRGB(root, "--sd-panel")
    };
    ctxRef.current = cv.getContext("2d");
    fit();
    curRef.current = PRESETS[0].map((p): UV => [p[0], p[1]]);
    tgtRef.current = PRESETS[0].map((p): UV => [p[0], p[1]]);

    // ── 포인터 — 컨트롤 핀 끌기(pointermove 로 실시간 재감기) ──
    const cvs: HTMLCanvasElement = cv;   // 클로저 안 null narrowing 보존(325 해법 — 지역 별칭)
    function evPos(ev: PointerEvent): XY {
      const r = cvs.getBoundingClientRect();
      return [ev.clientX - r.left, ev.clientY - r.top];
    }
    function hit(x: number, y: number): number {
      const cur = curRef.current;
      if (!cur) return -1;
      for (let k = 0; k < NCTRL; k++) {
        const c = px(cur[k]);
        const dx = x - c[0], dy = y - c[1];
        if (dx * dx + dy * dy < 18 * 18) return k;
      }
      return -1;
    }
    function onPointerDown(ev: PointerEvent): void {
      const p = evPos(ev);
      dragRef.current = hit(p[0], p[1]);
      if (dragRef.current >= 0) {
        try { cvs.setPointerCapture(ev.pointerId); } catch { /* 캡처 실패해도 드래그는 유지 */ }
        ev.preventDefault();
      }
    }
    function onPointerMove(ev: PointerEvent): void {
      const drag = dragRef.current;
      const cur = curRef.current, tgt = tgtRef.current;
      if (drag < 0 || !cur || !tgt) return;
      const p = evPos(ev);
      const rx = Math.max(0.06, Math.min(0.94, p[0] / wRef.current));
      const ry = Math.max(0.10, Math.min(0.90, p[1] / hRef.current));
      cur[drag] = [rx, ry]; tgt[drag] = [rx, ry];
      ev.preventDefault();
    }
    function drop(): void { dragRef.current = -1; }
    cvs.addEventListener("pointerdown", onPointerDown);
    cvs.addEventListener("pointermove", onPointerMove);
    cvs.addEventListener("pointerup", drop);
    cvs.addEventListener("pointercancel", drop);

    function onResize(): void {
      fit();
      if (reduced()) draw(0, 1);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0, 1);                                // reduce — 다 감긴 부채꼴 한 장만 고정
      setStill(true);
    } else {
      t0 = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      cvs.removeEventListener("pointerdown", onPointerDown);
      cvs.removeEventListener("pointermove", onPointerMove);
      cvs.removeEventListener("pointerup", drop);
      cvs.removeEventListener("pointercancel", drop);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recompute, fan, fan2, fan3]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div
        className={rootCls}
        ref={rootRef}
        style={vars}
        role="application"
        aria-label={BOARD_LABEL}
        tabIndex={0}
      >
        <canvas className={styles.cv} ref={cvRef}></canvas>
        <p className={styles.hint}>
          <span className={styles.title}>{HINT_TITLE}</span>
          <span className={styles.desc}>{HINT_DESC}</span>
        </p>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
