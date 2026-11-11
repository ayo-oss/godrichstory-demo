// RagdollJoint — vanilla 판(run/306/demo/05-ragdoll-joint-chain/index.html) 의 React 포트.
// 머리-목-가슴-골반-허벅지-정강이·상박-하박(좌우) 관절 사슬을 길이 제약(min≤d≤len, 접힘 허용)과
// 부모 세그먼트 방향 기준 각도 제한(±θ)으로 엮는다. 위치 기반 Verlet 적분(속도 변수 없음).
// 값·주석 의미는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./RagdollJoint.module.scss";

export type RagdollJointProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다 (292 선례)
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };
type Pt = { x: number; y: number; px: number; py: number };
type Link = { a: number; b: number; len: number; min: number };
type Limit = { a: number; b: number; c: number; min: number; max: number };

const GRAV = 1500;     // 중력(px/s^2)
const DAMP = 0.99;     // 속도 보존률(관절 마찰)
const LOOP = 3;        // 자동 시연 한 바퀴(초)
const FIELD_LABEL = "래그돌 관절 실험판";

export default function RagdollJoint({
  duration = 3000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ff9ebb",
}: RagdollJointProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const stValRef = useRef<HTMLSpanElement | null>(null);
  const stInRef = useRef<HTMLInputElement | null>(null);
  const ptsRef = useRef<Pt[]>([]) as Box<Pt[]>;
  const linksRef = useRef<Link[]>([]) as Box<Link[]>;
  const limitsRef = useRef<Limit[]>([]) as Box<Limit[]>;
  const sizeRef = useRef({ W: 0, H: 0 }) as Box<{ W: number; H: number }>;
  const dragRef = useRef(-1) as Box<number>;
  const dragPtRef = useRef({ x: 0, y: 0 }) as Box<{ x: number; y: number }>;
  const stretchedRef = useRef(0) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(0) as Box<number>;
  const frameRef = useRef(0) as Box<number>;
  const [stiff, setStiff] = useState(6);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function ctx2d(): CanvasRenderingContext2D | null {
    const cv = cvRef.current;
    if (!cv) return null;
    return cv.getContext("2d");
  }

  function build(): void {
    const { W } = sizeRef.current;
    const pts: Pt[] = [];
    const links: Link[] = [];
    // 좌표는 판 크기에 맞춘 비율 — 관절 이름은 해부학 순서
    const S = Math.min(sizeRef.current.W, sizeRef.current.H) / 208;   // 축척(208px 기준 설계)
    const P = (x: number, y: number): number => {
      pts.push({ x: W * 0.5 + x * S, y: 34 + y * S, px: W * 0.5 + x * S, py: 34 + y * S });
      return pts.length - 1;
    };
    const head = P(0, 0);
    const neck = P(0, 16);
    const chest = P(0, 30);
    const pelv = P(0, 54);
    const hipL = P(-3, 57), kneeL = P(-4, 78), footL = P(-5, 100);
    const hipR = P(3, 57), kneeR = P(4, 78), footR = P(5, 100);
    const shL = P(-10, 33), elbL = P(-16, 48), handL = P(-18, 66);
    const shR = P(10, 33), elbR = P(16, 48), handR = P(18, 66);
    const L = (a: number, b: number, shrink?: number): void => {
      const len = Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y);
      links.push({ a, b, len, min: len * (shrink === undefined ? 1 : shrink) });
    };
    L(head, neck, 0.9); L(neck, chest, 0.95); L(chest, pelv, 0.97);
    L(pelv, hipL); L(hipL, kneeL, 0.55); L(kneeL, footL, 0.55);
    L(pelv, hipR); L(hipR, kneeR, 0.55); L(kneeR, footR, 0.55);
    L(chest, shL); L(shL, elbL, 0.6); L(elbL, handL, 0.6);
    L(chest, shR); L(shR, elbR, 0.6); L(elbR, handR, 0.6);
    // 보강 — 어깨 좌우·골반 좌우를 묶어 몸통이 좌우로 찢어지지 않게
    L(shL, shR, 0.9); L(hipL, hipR, 0.9); L(shL, pelv, 0.9); L(shR, pelv, 0.9);
    // 각도 제한 — 무릎은 뒤로만, 팔꿈치는 앞으로만, 목·허리는 ±0.9 라디안
    limitsRef.current = [
      { a: chest, b: neck, c: head, min: -0.9, max: 0.9 },
      { a: neck, b: chest, c: pelv, min: -0.35, max: 0.35 },
      { a: hipL, b: kneeL, c: footL, min: 0.1, max: 2.4 },
      { a: hipR, b: kneeR, c: footR, min: 0.1, max: 2.4 },
      { a: pelv, b: hipL, c: kneeL, min: -2.2, max: 0.3 },
      { a: pelv, b: hipR, c: kneeR, min: -0.3, max: 2.2 },
      { a: shL, b: elbL, c: handL, min: -2.3, max: 0.1 },
      { a: shR, b: elbR, c: handR, min: -0.1, max: 2.3 }
    ];
    ptsRef.current = pts;
    linksRef.current = links;
    dragRef.current = -1;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    const ctx = ctx2d();
    if (!field || !cv || !ctx) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current.W = r.width;
    sizeRef.current.H = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  // 거리 제약 한 번 — 목표 구간 [min, len] 안으로 못 박는다. min < len 이면 접힘이 허용된다
  function solveLink(lk: Link, strength: number): void {
    const pts = ptsRef.current;
    const a = pts[lk.a], b = pts[lk.b];
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    let target = d;
    if (d > lk.len) target = lk.len;
    else if (d < lk.min) target = lk.min;
    else return;                               // 구간 안 — 그대로
    const off = ((d - target) / d) * 0.5 * strength;
    const ox = dx * off, oy = dy * off;
    const aFree = lk.a !== dragRef.current, bFree = lk.b !== dragRef.current;
    if (aFree && bFree) { a.x += ox; a.y += oy; b.x -= ox; b.y -= oy; }
    else if (aFree) { a.x += ox * 2; a.y += oy * 2; }
    else if (bFree) { b.x -= ox * 2; b.y -= oy * 2; }
  }

  // 각도 제한 — 부모 세그먼트(b→a) 방향 대비 자식(b→c) 각도를 [min, max]로 되돌린다
  function solveLimit(lm: Limit): void {
    if (lm.b === dragRef.current) return;
    const pts = ptsRef.current;
    const a = pts[lm.a], b = pts[lm.b], c = pts[lm.c];
    const pbx = a.x - b.x, pby = a.y - b.y;      // 부모 방향
    const cbx = c.x - b.x, cby = c.y - b.y;      // 자식 방향
    const cl = Math.hypot(cbx, cby) || 0.0001;
    const base = Math.atan2(pby, pbx);
    let ang = Math.atan2(cby, cbx) - base;
    // -π..π 로 정규화
    while (ang > Math.PI) ang -= Math.PI * 2;
    while (ang < -Math.PI) ang += Math.PI * 2;
    const clamped = Math.max(lm.min, Math.min(lm.max, ang));
    if (clamped === ang) return;
    const target = base + clamped;
    // 자식을 관절(b) 주위로 회전 — b 도 아주 조금 반대로 돌려 부드럽게
    const nx = b.x + Math.cos(target) * cl, ny = b.y + Math.sin(target) * cl;
    const mx = (nx - c.x) * 0.6, my = (ny - c.y) * 0.6;
    c.x += mx; c.y += my;
    b.x -= mx * 0.12; b.y -= my * 0.12;
  }

  function step(now: number): void {
    const { W, H } = sizeRef.current;
    const pts = ptsRef.current;
    const links = linksRef.current;
    const limits = limitsRef.current;
    const dt = Math.min((now - t0Ref.current) / 1000, 0.033);
    t0Ref.current = now;
    const iters = stInRef.current ? Number(stInRef.current.value) : 6;

    // (1) 관성 + 중력
    for (let i = 0; i < pts.length; i++) {
      if (i === dragRef.current) continue;
      const p = pts[i];
      const vx = (p.x - p.px) * DAMP;
      const vy = (p.y - p.py) * DAMP;
      p.px = p.x; p.py = p.y;
      p.x += vx;
      p.y += vy + GRAV * dt * dt;
    }
    // (2) 제약 반복 — 거리 → 각도 순서로 iters 번. 반복이 곧 관절 강성이다
    for (let k = 0; k < iters; k++) {
      for (let l = 0; l < links.length; l++) solveLink(links[l], 1);
      for (let m = 0; m < limits.length; m++) solveLimit(limits[m]);
      // 바닥·벽 — 관절이 판 밖으로 못 나간다
      for (let v = 0; v < pts.length; v++) {
        const q = pts[v];
        if (q.y > H - 4) { q.y = H - 4; q.py = q.y + (q.y - q.py) * 0.3; }
        if (q.x < 4) { q.x = 4; }
        if (q.x > W - 4) { q.x = W - 4; }
      }
    }
    if (dragRef.current >= 0) {
      const p = pts[dragRef.current];
      p.x = dragPtRef.current.x; p.y = dragPtRef.current.y;
    }
    // 배지 — 목표보다 늘어난 제약 수
    let stretched = 0;
    for (let s = 0; s < links.length; s++) {
      const lk = links[s];
      const d = Math.hypot(pts[lk.b].x - pts[lk.a].x, pts[lk.b].y - pts[lk.a].y);
      if (d > lk.len + 0.75) stretched++;
    }
    stretchedRef.current = stretched;
  }

  function seg(a: number, b: number, w: number, col: string): void {
    const ctx = ctx2d();
    if (!ctx) return;
    const pts = ptsRef.current;
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pts[a].x, pts[a].y);
    ctx.lineTo(pts[b].x, pts[b].y);
    ctx.stroke();
  }

  function draw(ink: string, skin: string, limb: string, grip: string): void {
    const ctx = ctx2d();
    if (!ctx) return;
    const { W, H } = sizeRef.current;
    const pts = ptsRef.current;
    const S = Math.min(W, H) / 208;
    // 관절 번호: 0머리 1목 2가슴 3골반 4~6왼다리 7~9오른다리 10~12왼팔 13~15오른팔
    ctx.clearRect(0, 0, W, H);
    seg(4, 5, 7 * S * 0.9, limb); seg(5, 6, 6 * S * 0.9, limb);      // 왼다리
    seg(7, 8, 7 * S * 0.9, limb); seg(8, 9, 6 * S * 0.9, limb);      // 오른다리
    seg(1, 2, 10 * S, ink); seg(2, 3, 11 * S, ink);                   // 목+몸통
    seg(10, 11, 5.5 * S, limb); seg(11, 12, 4.5 * S, limb);           // 왼팔
    seg(13, 14, 5.5 * S, limb); seg(14, 15, 4.5 * S, limb);           // 오른팔
    seg(10, 13, 4 * S, ink);                                          // 어깨끈
    seg(4, 7, 4 * S, ink);                                            // 골반끈
    // 머리 — 목 위 동그라미
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y - 7 * S, 9.5 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ink;
    ctx.stroke();
    // 관절 점 — 잡을 곳을 알려준다
    for (let m2 = 1; m2 < pts.length; m2++) {
      if (m2 === 2) continue;          // 가슴은 몸통에 파묻힌다
      ctx.fillStyle = grip;
      ctx.beginPath();
      ctx.arc(pts[m2].x, pts[m2].y, 2.6 * S + 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    // 잡은 관절 표시
    if (dragRef.current >= 0) {
      ctx.strokeStyle = grip;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pts[dragRef.current].x, pts[dragRef.current].y, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 사람이 안 만졌을 때 도는 자동 시연 — 가상 손이 머리를 8자로 끌고 다닌다(사인파, 난수 없음)
  function demoTarget(now: number): { x: number; y: number; hold: boolean } {
    const { W, H } = sizeRef.current;
    const ph = ((now / 1000) / LOOP) * Math.PI * 2;
    return {
      x: W * 0.5 + Math.sin(ph) * W * 0.3,
      y: 40 + Math.abs(Math.sin(ph * 2)) * H * 0.24,
      hold: Math.sin(ph * 2) > -0.55        // 대부분 잡고 있고 잠깐 놓는다
    };
  }

  useEffect(() => {
    fit();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    // 캔버스가 쓰는 색은 module.scss 의 커스텀 프로퍼티에서 읽는다 — 값은 스타일 한 곳에만 둔다
    const css = getComputedStyle(rootRef.current as Element);
    const ink = css.getPropertyValue("--ink").trim() || "#17141a";
    const skin = css.getPropertyValue("--skin").trim() || "#ff9ebb";
    const limb = css.getPropertyValue("--limb").trim() || "#b9a0ff";
    const grip = css.getPropertyValue("--grip").trim() || "#4cd4a6";
    t0Ref.current = performance.now();

    function frame(now: number): void {
      if (!manualRef.current) {
        const t = demoTarget(now);
        if (t.hold) { dragRef.current = 0; dragPtRef.current.x = t.x; dragPtRef.current.y = t.y; }
        else dragRef.current = -1;
      }
      step(now);
      draw(ink, skin, limb, grip);
      frameRef.current++;
      if (frameRef.current % 12 === 0 && stValRef.current) {
        stValRef.current.textContent = String(stretchedRef.current);
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    if (!reduce.matches) rafRef.current = requestAnimationFrame(frame);
    else { step(performance.now()); draw(ink, skin, limb, grip); }

    function onResize(): void { fit(); }
    function onReduceChange(): void {
      if (reduce.matches) {
        manualRef.current = true;
        dragRef.current = -1;
        cancelAnimationFrame(rafRef.current);
      } else if (!manualRef.current) {
        t0Ref.current = performance.now();
        rafRef.current = requestAnimationFrame(frame);
      }
    }
    window.addEventListener("resize", onResize);
    reduce.addEventListener("change", onReduceChange);
    return () => {
      window.removeEventListener("resize", onResize);
      reduce.removeEventListener("change", onReduceChange);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // 조작 — 아무 관절을 잡아 끈다. 머리 원 안쪽도 머리로 잡는다
  function pick(x: number, y: number): number {
    const pts = ptsRef.current;
    let best = -1, bd = 20;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.hypot(pts[i].x - x, pts[i].y - y);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) {
      const S = Math.min(sizeRef.current.W, sizeRef.current.H) / 208;
      if (Math.hypot(pts[0].x - x, pts[0].y - 7 * S - y) < 11 * S) best = 0;
    }
    return best;
  }
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const x = event.clientX - r.left, y = event.clientY - r.top;
    const idx = pick(x, y);
    if (idx < 0) return;
    manualRef.current = true;
    dragRef.current = idx;
    dragPtRef.current.x = x; dragPtRef.current.y = y;
    field.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (dragRef.current < 0) return;
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    dragPtRef.current.x = Math.max(4, Math.min(sizeRef.current.W - 4, event.clientX - r.left));
    dragPtRef.current.y = Math.max(4, Math.min(sizeRef.current.H - 4, event.clientY - r.top));
    // 줄인 모드 — 잡은 관절만 옮기고 제약이 즉시 따라오게 한다
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const p = ptsRef.current[dragRef.current];
      p.x = dragPtRef.current.x; p.y = dragPtRef.current.y;
      p.px = p.x; p.py = p.y;
      for (let k = 0; k < 12; k++) {
        for (let l = 0; l < linksRef.current.length; l++) solveLink(linksRef.current[l], 1);
        for (let m = 0; m < limitsRef.current.length; m++) solveLimit(limitsRef.current[m]);
      }
    }
  }
  function onPointerUp(): void {
    dragRef.current = -1;
  }
  function onReset(): void {
    manualRef.current = false;
    build();
    if (stValRef.current) stValRef.current.textContent = "0";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;   // 줄인 모드에서는 정지 장면만 둔다
    t0Ref.current = performance.now();
    cancelAnimationFrame(rafRef.current);
    const css = getComputedStyle(rootRef.current as Element);
    const ink = css.getPropertyValue("--ink").trim() || "#17141a";
    const skin = css.getPropertyValue("--skin").trim() || "#ff9ebb";
    const limb = css.getPropertyValue("--limb").trim() || "#b9a0ff";
    const grip = css.getPropertyValue("--grip").trim() || "#4cd4a6";
    rafRef.current = requestAnimationFrame(function loop(now: number): void {
      if (!manualRef.current) {
        const t = demoTarget(now);
        if (t.hold) { dragRef.current = 0; dragPtRef.current.x = t.x; dragPtRef.current.y = t.y; }
        else dragRef.current = -1;
      }
      step(now);
      draw(ink, skin, limb, grip);
      frameRef.current++;
      if (frameRef.current % 12 === 0 && stValRef.current) {
        stValRef.current.textContent = String(stretchedRef.current);
      }
      rafRef.current = requestAnimationFrame(loop);
    });
  }

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224,128a96,96,0,0,1-96,96c-11.4,0-20-8.6-20-20s8.9-20,20-20a56,56,0,0,0,0-112c-11.1,0-20-8.9-20-20s8.6-20,20-20A96,96,0,0,1,224,128Z" opacity=".2"/><path d="M128,24A104,104,0,0,0,128,232c-15.8,0-28-12.3-28-28s12.4-28,28-28a48,48,0,0,0,0-96c-15.6,0-28-12.4-28-28S112.2,24,128,24Zm0,16c-6.9,0-12,5.2-12,12s5.3,12,12,12a64,64,0,0,1,0,128c-6.7,0-12,5.4-12,12s5.1,12,12,12a88,88,0,0,0,0-176Z"/></g></svg>
          <span>아무 관절이나 잡아 끌면 길이 제약이 연쇄로 풀리며 인형 전체가 접히고 늘어집니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={stValRef}>0</span><span className={styles.badgeUnit}>늘어난 제약</span></b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>관절 강성
            <input
              ref={stInRef}
              type="range" min={2} max={10} step={1} value={stiff} aria-label="제약 반복 수"
              onChange={(event: InputEvt) => setStiff(Number(event.target.value))}
            />
          </label>
          <button className={styles.reset} type="button" onClick={onReset}>처음으로</button>
        </div>
      </div>
    </main>
  );
}
