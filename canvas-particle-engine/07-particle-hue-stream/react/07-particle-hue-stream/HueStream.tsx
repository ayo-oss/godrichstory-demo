// HueStream — vanilla 판(run/012/demo/07-particle-hue-stream/index.html) 의 React 포트.
// 세 겹의 사인 띠 위 알갱이가 위치로 hsl 색상을 물려받는다. 색을 다시 계산하지 않고
// 색상에 매초 더하는 값(drift) 하나로 줄무늬 전체가 옆으로 흐른다. 값·수치는 vanilla 와 같다.
// 포인터가 가까운 띠는 부풀고 포인터 근처 알갱이도 몰리며, 흐름 속도 슬라이더가 drift 속도에 곱해진다.
import { useEffect, useRef, useState } from "react";
import styles from "./HueStream.module.scss";

export type HueStreamProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type PointerEvt = { clientX: number; clientY: number; preventDefault(): void; key?: string };
type InputEvt = { target: { value: string } };
type Dot = { band: number; x: number; r: number; wob: number; sp: number };

const BANDS = 3;
const PER = 46;                          // 띠 3겹 × 알갱이 46개 = 138개
const HINT = "띠에 포인터를 대면 그 자리가 살짝 부풉니다";
const FIELD_LABEL = "흐르는 색 팔레트 실험판";

// 알갱이 한 개 — 어느 띠의 어느 지점에서 몇 픽셀씩 흐르는지만 가진다
function seedDot(d: Dot, i: number, w: number): Dot {
  d.band = Math.floor(i / PER);
  d.x = Math.random() * w;
  d.r = 1.6 + Math.random() * 1.8;
  d.wob = Math.random() * Math.PI * 2;   // 띠 위에서 좌우로 흔들리는 위상
  d.sp = (26 + d.band * 9) * (0.8 + Math.random() * 0.4);
  return d;
}

export default function HueStream({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: HueStreamProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const driftOutRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 }) as Box<{ w: number; h: number; dpr: number }>;
  const dotsRef = useRef<Dot[]>([]) as Box<Dot[]>;
  const ptrRef = useRef({ x: 0, y: 0, on: false }) as Box<{ x: number; y: number; on: boolean }>;
  const bulgeRef = useRef([0, 0, 0]) as Box<number[]>; // 띠마다 부푼 정도 — 포인터가 가까우면 1 을 향해 오른다
  const driftRef = useRef(0) as Box<number>;           // 색상에 더하는 값(도) — 이 숫자만 커지면 색이 흐른다
  const clockRef = useRef(0) as Box<number>;
  const speedRef = useRef(1) as Box<number>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [speed, setSpeed] = useState(1);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const size = sizeRef.current;
    size.dpr = window.devicePixelRatio || 1;
    size.w = r.width;
    size.h = r.height;
    cv.width = Math.round(size.w * size.dpr);
    cv.height = Math.round(size.h * size.dpr);
    const ctx = ctxRef.current;
    if (ctx) ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  }

  // 띠의 중심선 — 사인 두 겹을 겹쳐 흐름의 굽이를 만든다. 포인터 근처에서만 살짝 부풀린다.
  function bandY(b: number, x: number): number {
    const size = sizeRef.current;
    const ptr = ptrRef.current;
    const cx = size.h * (0.30 + b * 0.20);
    const amp = 9 + b * 2.5;
    let grow = 1;
    if (ptr.on) {
      const dx = x - ptr.x;
      grow = 1 + bulgeRef.current[b] * Math.exp(-(dx * dx) / 2600);
    }
    return cx + Math.sin(x * 0.02 + clockRef.current * (0.7 + b * 0.25) + b * 2.1) * amp * grow
              + Math.sin(x * 0.006 - clockRef.current * 0.4 + b) * 4 * grow;
  }

  function draw(): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const size = sizeRef.current;
    const dots = dotsRef.current;
    const ptr = ptrRef.current;
    ctx.clearRect(0, 0, size.w, size.h);
    // 띠 길 — 얇은 잉크 실로 흐름의 중심선을 먼저 그려 둔다
    ctx.strokeStyle = "rgba(23, 20, 26, .2)";
    ctx.lineWidth = 1;
    for (let b = 0; b < BANDS; b++) {
      ctx.beginPath();
      for (let x = 0; x <= size.w; x += 10) {
        const gy = bandY(b, x);
        if (x === 0) ctx.moveTo(x, gy); else ctx.lineTo(x, gy);
      }
      ctx.stroke();
    }
    // 알갱이 — 위치가 곧 색상이다. 주황 무대 위라 채도와 명도 대역(34~54%)으로 대비를 잡는다.
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const y = bandY(d.band, d.x) + Math.sin(clockRef.current * 2 + d.wob) * 3;
      const hue = (d.x * 0.85 + driftRef.current + d.band * 24) % 360;
      const sat = 72 + (i * 37) % 24;
      const lig = 34 + (i * 53) % 21;
      let near = 0;
      if (ptr.on) {
        const ndx = d.x - ptr.x, ndy = y - ptr.y;
        near = Math.exp(-(ndx * ndx + ndy * ndy) / 2600); // 포인터에 가까울수록 몰린다
      }
      const r = d.r * (1 + bulgeRef.current[d.band] * 0.25 + near * 0.8);
      // 어두운 밑칠 — 어떤 색상이든 주황 바탕에서 떨어져 보이게 한다
      ctx.fillStyle = "rgba(23, 20, 26, .3)";
      ctx.beginPath();
      ctx.arc(d.x, y, r * 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "hsl(" + Math.round(hue) + ", " + sat + "%, " + lig + "%)";
      ctx.beginPath();
      ctx.arc(d.x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const out = driftOutRef.current;
    if (out) out.textContent = "+" + Math.round(driftRef.current) + "°";
  }

  function step(dt: number): void {
    clockRef.current += dt;
    driftRef.current = (driftRef.current + dt * 16 * speedRef.current) % 360;
    const size = sizeRef.current;
    const ptr = ptrRef.current;
    for (let b = 0; b < BANDS; b++) {
      let target = 0;
      if (ptr.on) {
        const dist = Math.abs(ptr.y - size.h * (0.30 + b * 0.20));
        target = Math.max(0, 1 - dist / 56);
      }
      bulgeRef.current[b] += (target - bulgeRef.current[b]) * Math.min(1, dt * 5);
    }
    const dots = dotsRef.current;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      d.x += d.sp * speedRef.current * dt;
      if (d.x > size.w + 8) d.x = -8;
    }
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    step(dt);
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  function reseed(): void {
    const dots = dotsRef.current;
    for (let i = 0; i < dots.length; i++) seedDot(dots[i], i, sizeRef.current.w);
    driftRef.current = 0;
    draw();
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;
    fit();
    const dots = dotsRef.current;
    for (let i = 0; i < BANDS * PER; i++) dots.push(seedDot({ band: 0, x: 0, r: 0, wob: 0, sp: 0 }, i, sizeRef.current.w));
    function onResize(): void { fit(); draw(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 아예 돌리지 않고 색상이 물려받은 한 장만 그린다
      setStill(true);
      draw();
    } else {
      lastRef.current = 0;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function onSpeed(event: InputEvt): void {
    const v = Number(event.target.value);
    speedRef.current = v;
    setSpeed(v);
  }

  function onPointerMove(event: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const ptr = ptrRef.current;
    ptr.x = event.clientX - r.left;
    ptr.y = event.clientY - r.top;
    ptr.on = true;
  }

  function onPointerLeave(): void {
    ptrRef.current.on = false;
  }

  function onKeyDown(event: PointerEvt): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      reseed();
    }
  }

  const cls = [styles.root, still ? styles.isStill : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M164 128a36 36 0 1 1-36-36a36 36 0 0 1 36 36" opacity=".2"/><path d="M128 84a44 44 0 1 0 44 44a44.05 44.05 0 0 0-44-44m0 72a28 28 0 1 1 28-28a28 28 0 0 1-28 28m0-128a100 100 0 1 0 100 100A100.11 100.11 0 0 0 128 28m0 184a84 84 0 1 1 84-84a84.09 84.09 0 0 1-84 84"/></g></svg>
          <span>{HINT}</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onClick={reseed}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.live} aria-hidden="true"><span className={styles.liveLabel}>색상</span><span className={styles.liveNum} ref={driftOutRef}>+0°</span></b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>흐름
            <input
              type="range" min="0.5" max="2" step="0.25" value={speed} aria-label="흐름 속도"
              onChange={onSpeed}
            />
            <b className={styles.val}>{speed.toFixed(1)}배</b>
          </label>
          <button className={styles.reset} type="button" onClick={reseed}>
            <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104" opacity=".2"/><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z"/></g></svg>
            <span>다시 뿌리기</span>
          </button>
        </div>
      </div>
    </main>
  );
}
