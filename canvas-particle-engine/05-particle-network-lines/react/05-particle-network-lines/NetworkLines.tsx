// NetworkLines — vanilla 판(run/012/demo/05-particle-network-lines/index.html) 의 React 포트.
// 매 프레임 모든 쌍을 견주되 반경 안쪽만 선으로 그려 인접 그래프를 만든다 — 점이 64개라 쌍은 2,016개.
// 값·색·수치는 vanilla 와 같다. 포인터를 올리면 그 점이 노드 하나로 끼어들어 노란 실로 이어진다.
// 움직임은 전부 캔버스 rAF 루프 — CSS 애니메이션이 0개면 렌더러는 실시간으로 24장을 찍는다.
// reduce 에서는 루프를 돌리지 않고 점이 골고루 퍼진 한 장만 그린다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./NetworkLines.module.scss";

export type NetworkLinesProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type InputEvt = { target: { value: string } };
// 점 한 개 — 느리게 떠다니는 속도와 크기만 가진다
type NetNode = { x: number; y: number; vx: number; vy: number; r: number };

const COUNT = 64;                 // 점 64개 — 전체 쌍은 64*63/2 = 2,016쌍
const FIELD_LABEL = "연결선 네트워크 실험판";

export default function NetworkLines({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#5b8cf8",
}: NetworkLinesProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const linksRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 }) as Box<{ w: number; h: number; dpr: number }>;
  const nodesRef = useRef<NetNode[]>([]) as Box<NetNode[]>;
  const pointerRef = useRef({ x: 0, y: 0, on: false }) as Box<{ x: number; y: number; on: boolean }>;
  const linkRRef = useRef(90) as Box<number>;   // 이 거리 안쪽일 때만 실이 나타난다(px 단위)
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [radius, setRadius] = useState(90);
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
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const size = sizeRef.current;
    const r = field.getBoundingClientRect();
    size.dpr = window.devicePixelRatio || 1;
    size.w = r.width;
    size.h = r.height;
    cv.width = Math.round(r.width * size.dpr);
    cv.height = Math.round(r.height * size.dpr);
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctxRef.current = ctx;
  }

  function seedNode(n: NetNode): NetNode {
    const size = sizeRef.current;
    n.x = Math.random() * size.w;
    n.y = Math.random() * size.h;
    const ang = Math.random() * Math.PI * 2;
    const sp = 7 + Math.random() * 13;
    n.vx = Math.cos(ang) * sp;
    n.vy = Math.sin(ang) * sp;
    n.r = 1.8 + Math.random() * 1.5;
    return n;
  }

  function draw(): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const size = sizeRef.current;
    const nodes = nodesRef.current;
    const pointer = pointerRef.current;
    const linkR = linkRRef.current;
    ctx.clearRect(0, 0, size.w, size.h);
    let links = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#fff7e6";          // 실은 낮은 알파의 크림 — 알파는 globalAlpha 로 준다
    // 점과 점 — 매 프레임 모든 쌍을 견주고 반경 안쪽만 선으로 남긴다
    for (let i = 0; i < COUNT; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < COUNT; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= linkR * linkR) continue;
        const fade = 1 - Math.sqrt(d2) / linkR;
        ctx.globalAlpha = fade * fade * 0.5;   // 가까울수록 짙어지는 실
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        links++;
      }
    }
    // 포인터도 노드 하나 — 가까운 점과는 노란 실로 이어진다
    if (pointer.on) {
      ctx.strokeStyle = "#ffd23f";
      for (let k = 0; k < COUNT; k++) {
        const nd = nodes[k];
        const pdx = nd.x - pointer.x, pdy = nd.y - pointer.y;
        const pd2 = pdx * pdx + pdy * pdy;
        if (pd2 >= linkR * linkR) continue;
        const pf = 1 - Math.sqrt(pd2) / linkR;
        ctx.globalAlpha = pf * pf * 0.7;
        ctx.beginPath();
        ctx.moveTo(pointer.x, pointer.y);
        ctx.lineTo(nd.x, nd.y);
        ctx.stroke();
        links++;
      }
    }
    ctx.globalAlpha = 1;
    // 점 — 크림을 기본으로 노랑과 밝은 파랑을 섞는다
    for (let m = 0; m < COUNT; m++) {
      const p = nodes[m];
      ctx.fillStyle = m % 9 === 0 ? "#ffd23f" : (m % 9 === 5 ? "#5b8cf8" : "#fff7e6");
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (pointer.on) {
      ctx.strokeStyle = "#ffd23f";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    const out = linksRef.current;
    if (out) out.textContent = String(links);
  }

  function step(dt: number): void {
    const size = sizeRef.current;
    const nodes = nodesRef.current;
    for (let i = 0; i < COUNT; i++) {
      const n = nodes[i];
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      if (n.x < n.r) { n.x = n.r; n.vx = Math.abs(n.vx); }
      if (n.x > size.w - n.r) { n.x = size.w - n.r; n.vx = -Math.abs(n.vx); }
      if (n.y < n.r) { n.y = n.r; n.vy = Math.abs(n.vy); }
      if (n.y > size.h - n.r) { n.y = size.h - n.r; n.vy = -Math.abs(n.vy); }
    }
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    step(dt);
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  function scatter(): void {
    const nodes = nodesRef.current;
    for (let i = 0; i < COUNT; i++) seedNode(nodes[i]);
    draw();
  }

  useEffect(() => {
    fit();
    const nodes = nodesRef.current;
    for (let i0 = 0; i0 < COUNT; i0++) nodes.push(seedNode({ x: 0, y: 0, vx: 0, vy: 0, r: 0 }));
    function onResize(): void {
      fit();
      const size = sizeRef.current;
      for (let i = 0; i < COUNT; i++) {
        if (nodes[i].x > size.w) nodes[i].x = Math.random() * size.w;
        if (nodes[i].y > size.h) nodes[i].y = Math.random() * size.h;
      }
      draw();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 아예 돌리지 않고 점이 골고루 퍼진 한 장만 그린다
      setStill(true);
      draw();
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function onRadius(e: InputEvt): void {
    const v = Number(e.target.value);
    linkRRef.current = v;
    setRadius(v);
  }

  function onKeyDown(e: KeyEvt): void {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      scatter();
    }
  }

  function onPointerMove(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const pointer = pointerRef.current;
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.on = true;
  }

  function onPointerLeave(): void {
    pointerRef.current.on = false;
  }

  const rootCls = still ? styles.root + " " + styles.isStill : styles.root;
  return (
    <main className={styles.stage}>
      <div className={rootCls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M164 128a36 36 0 1 1-36-36a36 36 0 0 1 36 36" opacity=".2"/><path d="M128 84a44 44 0 1 0 44 44a44.05 44.05 0 0 0-44-44m0 72a28 28 0 1 1 28-28a28 28 0 0 1-28 28m0-128a100 100 0 1 0 100 100A100.11 100.11 0 0 0 128 28m0 184a84 84 0 1 1 84-84a84.09 84.09 0 0 1-84 84"/></g></svg>
          <span>판 위에 포인터를 올리면 그 점이 노드 하나로 끼어들어 주변과 이어집니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onClick={scatter}
          onKeyDown={onKeyDown}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.live} aria-hidden="true"><span className={styles.liveNum} ref={linksRef}>0</span><span className={styles.liveUnit}>개 연결</span></b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>반경
            <input
              type="range" min="50" max="130" step="10" value={radius} aria-label="연결 반경"
              onChange={onRadius}
            />
            <b className={styles.val}>{radius}px</b>
          </label>
          <button className={styles.reset} type="button" onClick={scatter}>
            <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104" opacity=".2"/><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z"/></g></svg>
            <span>다시 흩뿌리기</span>
          </button>
        </div>
      </div>
    </main>
  );
}
