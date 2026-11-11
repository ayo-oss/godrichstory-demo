// SpinWheelHeroScene — vanilla 판(run/332/demo/09-spin-wheel-hero-scene/index.html) 의 React 포트.
// 마찰·틱(스프링)·가중치·탈락을 한 화면에 얹은 히어로다. 정지 판정 직후 파티클 폭죽(42알, 중력
// + 감쇠)이 터지고 당첨명 리본이 허브 아래에서 올라온다(winShow 0→1). 파티클은 시드 고정
// mulberry32(90210) 로 뽑는다 — 데모 재현성. 저장 버튼은 판을 toDataURL 로 내보낸다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, MouseEvent } from "react";
import styles from "./SpinWheelHeroScene.module.scss";

// demo.py 의 ambient react 스텁은 KeyboardEvent 를 export 하지 않는다 — 최소 자체 타입으로 대체
type KeyEvt = { key: string; preventDefault(): void };

export type SpinWheelHeroSceneProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type Particle = {
  x: number; y: number; vx: number; vy: number;
  rot: number; vr: number; s: number; col: string; life: number;
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;
// 가중치 — 큰 상품은 칸이 넓다
const PRIZES = [
  { name: "꽝", w: 3 },
  { name: "쿠키", w: 3 },
  { name: "아메리카노", w: 2 },
  { name: "커피 기프티콘", w: 1 },
  { name: "삼각김밥", w: 2 },
  { name: "벌칙", w: 2 },
  { name: "초콜릿", w: 3 },
  { name: "1000원", w: 2 }
];
const TOT = PRIZES.reduce((s, p) => s + p.w, 0);
function computeBounds(): number[] {
  const bounds: number[] = [];
  let acc = 0;
  for (let q = 0; q < PRIZES.length; q++) { bounds.push(acc / TOT); acc += PRIZES[q].w; }
  bounds.push(1);
  return bounds;
}
const BOUNDS = computeBounds();

const FRICTION = 0.20, STOP = 0.4;      // 낮은 마찰 — 히어로는 길게 돈다
const PK = 340, PC = 14;
const FLICKS = [16, -13, 18];
const PAL = ["#a6b4d3", "#d9c48f", "#a6d3b1", "#d8a3b4", "#9fc6c2", "#c2a8d1", "#e0c6a2", "#a9c4b0"];
const INK = "#17141a";
const CREAM = "#fff7e6";
const HINT = "정지 판정 직후 폭죽이 터지고 결과를 올립니다 — 저장 버튼은 판을 toDataURL 로 내보냅니다";
const ARIA_FIELD = "룰렛 히어로";
const UNIT = "정지하면 결과가 크게 오릅니다";
const SAVE_LABEL = "판 저장하기";
const META_ALL = "마찰·틱·가중치·탈락을 한 화면에";
const READY = "READY";

export default function SpinWheelHeroScene({
  duration = "2s",
  easing = "ease-spring",
  color = "#6ec8ff"
}: SpinWheelHeroSceneProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const winRef = useRef<HTMLSpanElement | null>(null);
  const saveRef = useRef<HTMLAnchorElement | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rndRef = useRef(mulberry32(90210)) as Box<() => number>;
  const stRef = useRef({
    ang: 0, vel: 0, pX: 0, pV: 0, lastQ: 0,
    settle: -1, pulse: -1, dpr: 1,
    burst: [] as Particle[], winShow: 0, winner: -1,
    fi: 1, idle: 0,
    drag: { on: false, lastA: 0, lastT: 0, v: 0 }
  }) as Box<{
    ang: number; vel: number; pX: number; pV: number; lastQ: number;
    settle: number; pulse: number; dpr: number;
    burst: Particle[]; winShow: number; winner: number;
    fi: number; idle: number;
    drag: { on: boolean; lastA: number; lastT: number; v: number };
  }>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const st = stRef.current;
    const field = fieldRef.current, cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(field.clientWidth * st.dpr);
    cv.height = Math.round(field.clientHeight * st.dpr);
    ctxRef.current = ctx;
  }

  function norm(a: number): number {
    const r = a % TAU;
    return r < 0 ? r + TAU : r;
  }
  function idxAt(a: number): number {
    const u = norm(-Math.PI / 2 - a);
    for (let k = 0; k < PRIZES.length; k++) if (u >= BOUNDS[k] && u < BOUNDS[k + 1]) return k;
    return PRIZES.length - 1;
  }

  function spawnBurst(cx: number, cy: number): void {
    const st = stRef.current;
    const rnd = rndRef.current;
    for (let i = 0; i < 42; i++) {
      const a = rnd() * TAU, sp = 60 + rnd() * 170;
      st.burst.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        rot: rnd() * TAU, vr: (rnd() - 0.5) * 10,
        s: 3 + rnd() * 4,
        col: PAL[Math.floor(rnd() * PAL.length)],
        life: 1
      });
    }
  }

  function draw(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const w = cvRef.current!.width / st.dpr, h = cvRef.current!.height / st.dpr;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 12;
    // 외곽 후프 — 히어로 판의 테두리
    ctx.beginPath(); ctx.arc(cx, cy, R + 7, 0, TAU);
    ctx.strokeStyle = "rgba(255,247,230,.25)"; ctx.lineWidth = 5; ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(st.ang);
    for (let k = 0; k < PRIZES.length; k++) {
      const a0 = BOUNDS[k] * TAU, a1 = BOUNDS[k + 1] * TAU;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a1); ctx.closePath();
      ctx.fillStyle = PAL[k]; ctx.fill();
      ctx.strokeStyle = "rgba(23,20,26,.22)"; ctx.lineWidth = 1; ctx.stroke();
      const mid = (a0 + a1) / 2;
      const arcLen = R * (a1 - a0);
      ctx.save(); ctx.rotate(mid);
      ctx.fillStyle = INK;
      let fs = 9;
      ctx.font = "700 " + fs + "px sans-serif";
      while (ctx.measureText(PRIZES[k].name).width > arcLen * 0.82 && fs > 5) {
        fs -= 1; ctx.font = "700 " + fs + "px sans-serif";
      }
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(PRIZES[k].name, R - 11, 0);
      ctx.restore();
    }
    for (let p = 0; p < PRIZES.length; p++) {
      const pa = BOUNDS[p] * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(pa) * (R - 3), Math.sin(pa) * (R - 3), 2.4, 0, TAU);
      ctx.fillStyle = CREAM; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU);
    ctx.fillStyle = CREAM; ctx.fill(); ctx.strokeStyle = "rgba(23,20,26,.4)"; ctx.stroke();
    if (st.pulse >= 0) {
      ctx.beginPath(); ctx.arc(0, 0, 14 + st.pulse * 26, 0, TAU);
      ctx.strokeStyle = "rgba(255,247,230," + (1 - st.pulse) * 0.8 + ")";
      ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    // 12시 포인터 — 스프링 변위
    const tipY = cy - R + 7;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - R - 9); ctx.lineTo(cx + 7, cy - R - 9); ctx.lineTo(cx + st.pX, tipY);
    ctx.closePath();
    ctx.fillStyle = CREAM; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    // 폭죽 파티클
    for (let b = st.burst.length - 1; b >= 0; b--) {
      const P = st.burst[b];
      if (P.life <= 0) { st.burst.splice(b, 1); continue; }
      ctx.save();
      ctx.translate(P.x, P.y);
      ctx.rotate(P.rot);
      ctx.globalAlpha = Math.max(0, P.life);
      ctx.fillStyle = P.col;
      ctx.fillRect(-P.s / 2, -P.s / 4, P.s, P.s / 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // 결과 리본 — 허브 아래에서 올라온다 (winShow 0→1)
    if (st.winShow > 0 && st.winner >= 0) {
      const lift = (1 - st.winShow) * 18;
      ctx.save();
      ctx.translate(cx, Math.min(h - 12, cy + R * 0.62) + lift);
      ctx.globalAlpha = Math.min(1, st.winShow * 1.4);
      const label = st.winner + 1 + "번 " + PRIZES[st.winner].name;
      ctx.font = "800 15px sans-serif";
      const tw = ctx.measureText(label).width;
      ctx.beginPath();
      ctx.roundRect(-tw / 2 - 10, -12, tw + 20, 24, 8);
      ctx.fillStyle = CREAM; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = INK;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function tickCheck(): void {
    const st = stRef.current;
    const q2 = Math.floor(st.ang / (TAU / PRIZES.length));
    if (q2 !== st.lastQ) {
      const d = q2 - st.lastQ;
      st.pV += (d > 0 ? 1 : -1) * Math.abs(st.vel) * 22;
      st.lastQ = q2;
    }
  }

  function judge(): void {
    const st = stRef.current;
    st.winner = idxAt(st.ang);
    const win = winRef.current, live = liveRef.current;
    if (win) win.textContent = PRIZES[st.winner].name;
    if (live) live.textContent = "당첨 " + PRIZES[st.winner].name;
    const w = cvRef.current!.width / st.dpr, h = cvRef.current!.height / st.dpr;
    spawnBurst(w / 2, h / 2);
    st.winShow = 0.001;
  }

  function angleAt(e: PointerEvent<HTMLDivElement>): number {
    const b = e.currentTarget.getBoundingClientRect();
    return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2));
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    st.drag.on = true; st.drag.lastA = angleAt(e); st.drag.lastT = performance.now(); st.drag.v = 0;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 캡처 실패는 회전에 영향 없다 */ }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    if (!st.drag.on) return;
    const a = angleAt(e), now = performance.now();
    let dA = a - st.drag.lastA;
    if (dA > Math.PI) dA -= TAU;
    if (dA < -Math.PI) dA += TAU;
    st.ang += dA;
    const dt = Math.max(1, now - st.drag.lastT) / 1000;
    st.drag.v = 0.65 * st.drag.v + 0.35 * (dA / dt);
    st.drag.lastA = a; st.drag.lastT = now;
    tickCheck();
    st.idle = 0;
  }
  function endDrag(): void {
    const st = stRef.current;
    if (!st.drag.on) return;
    st.drag.on = false;
    st.vel = Math.max(-26, Math.min(26, st.drag.v));
    if (Math.abs(st.vel) < 1.5) st.vel = FLICKS[0];
    st.settle = -1; st.pulse = -1; st.winShow = 0;
  }
  function onKeyDown(e: KeyEvt): void {
    const st = stRef.current;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      st.vel = FLICKS[st.fi++ % FLICKS.length];
      st.settle = -1; st.pulse = -1; st.winShow = 0; st.idle = 0;
    }
  }
  function onSaveClick(e: MouseEvent<HTMLAnchorElement>): void {
    e.preventDefault();
    const cv = cvRef.current, save = saveRef.current;
    if (!cv || !save) return;
    try { save.href = cv.toDataURL("image/png"); } catch { /* 데이터 URL 실패 시 기본 링크 유지 */ }
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    // 포인터 스프링 적분
    const acc = -PK * st.pX - PC * st.pV;
    st.pV += acc * dt; st.pX += st.pV * dt;
    if (Math.abs(st.pX) < 0.02 && Math.abs(st.pV) < 1) { st.pX = 0; st.pV = 0; }
    // 파티클 물리 — 중력 + 감쇠
    for (let i = 0; i < st.burst.length; i++) {
      const P = st.burst[i];
      P.vy += 220 * dt;
      P.x += P.vx * dt; P.y += P.vy * dt;
      P.rot += P.vr * dt;
      P.life -= dt * 0.75;
    }
    if (st.winShow > 0 && st.winShow < 1) st.winShow = Math.min(1, st.winShow + dt * 3.2);
    if (!st.drag.on) {
      if (st.vel !== 0) {
        st.ang += st.vel * dt;
        st.vel *= Math.pow(FRICTION, dt);
        tickCheck();
        if (Math.abs(st.vel) < STOP) { st.vel = 0; st.settle = 0; st.pulse = 0; judge(); }
      } else if (st.idle > 0) { st.idle -= dt; }
      else if (st.settle >= 0) {
        st.settle += dt; st.pulse = Math.min(1, st.settle / 0.3);
        if (st.settle > 1.3) {
          st.vel = FLICKS[st.fi++ % FLICKS.length];
          st.settle = -1; st.pulse = -1; st.winShow = 0;
        }
      }
    }
    draw();
    rafRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    fit();
    function onResize(): void { fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 판정·폭죽이 끝난 상태로 고정하고 루프는 돌지 않는다
      const st = stRef.current;
      const rnd = rndRef.current;
      st.ang = -Math.PI / 2 - 1.32;
      st.winner = idxAt(st.ang);
      const win = winRef.current, live = liveRef.current;
      if (win) win.textContent = PRIZES[st.winner].name;
      if (live) live.textContent = "당첨 " + PRIZES[st.winner].name;
      st.winShow = 1;
      // 파티클은 정지 위치에 흩어진 한 장으로 미리 계산
      for (let r2 = 0; r2 < 26; r2++) {
        const a2 = rnd() * TAU, dd = 20 + rnd() * 34;
        st.burst.push({
          x: cvRef.current!.width / st.dpr / 2 + Math.cos(a2) * dd,
          y: cvRef.current!.height / st.dpr / 2 + Math.sin(a2) * dd - 10,
          vx: 0, vy: 0, rot: rnd() * TAU, vr: 0, s: 3 + rnd() * 4,
          col: PAL[Math.floor(rnd() * PAL.length)], life: 1
        });
      }
      st.pulse = 0.35;
      draw();
      setStill(true);
    } else {
      stRef.current.vel = FLICKS[0];
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.hr + " " + styles.isStill : styles.hr;
  return (
    <main className={styles.stage}>
      <div className={rootCls} style={{ "--duration": duration, "--easing": easing, "--color": color } as Vars}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.row}>
          <div
            className={styles.field}
            ref={fieldRef}
            role="application"
            aria-label={ARIA_FIELD}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <canvas className={styles.cv} ref={cvRef}></canvas>
          </div>
          <div className={styles.side}>
            <b className={styles.win} ref={winRef}>{READY}</b>
            <span className={styles.unit}>{UNIT}</span>
            <a className={styles.save} ref={saveRef} href="#" download="roulette.png" onClick={onSaveClick}>
              {SAVE_LABEL}
            </a>
            <p className={styles.meta}>{META_ALL}</p>
            <div className={styles.sr} ref={liveRef} aria-live="polite"></div>
          </div>
        </div>
      </div>
    </main>
  );
}
