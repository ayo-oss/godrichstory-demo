// SendTrailDragNoise - vanilla 판(04-send-btn-trail-drag-noise) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./SendTrailDragNoise.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function SendTrailDragNoise() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    const W = 480;
    const H = 300;
    const FIXED_DT = 16;
    // 파스텔 팔레트 — 캔버스와 스크립트가 칠하는 색은 여기서만 고른다 (scss 쪽 색은 demo-tokens)
    const INK: RGB = [38, 33, 52];
    const PAPER: RGB = [255, 252, 246];
    const CREAM: RGB = [255, 243, 224];
    const SKY: RGB = [158, 208, 255];
    const LILAC: RGB = [200, 184, 255];
    const MINT: RGB = [156, 228, 204];
    const PINK: RGB = [255, 182, 204];
    const PEACH: RGB = [255, 214, 184];
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
    function easeOut(x: number): number { const c = clamp(x, 0, 1); return 1 - Math.pow(1 - c, 3); }
    function easeInOut(x: number): number {
        const c = clamp(x, 0, 1);
        return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
    }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    function mix(a: RGB, b: RGB, t: number): RGB { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
    // 시드 고정 난수 — 같은 시드면 같은 값이 다시 나온다 (32비트 정수 섞기)
    function makeRng(seed: number): () => number {
        let s = seed >>> 0;
        return function (): number {
            s = (s + 0x6d2b79f5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const sceneEl = root.querySelector('[data-role="scene"]') as HTMLElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    if (!sceneEl || !statusEl) { return; }
    const scene: HTMLElement = sceneEl;
    const status: HTMLElement = statusEl;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const still = reduceQuery.matches;
    const resizeHooks: Array<() => void> = [];
    // 자동 시연 중인가 — 사람이 처음 만지는 순간 시연을 멈추고 처음 상태로 돌린 뒤 상태 줄을 읽어 주기 시작한다
    let demo = root.classList.contains('is-demo');
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
        status.setAttribute('aria-live', 'polite');
        resetIdle();
    }
    function say(text: string): void {
        if (status.textContent !== text) { status.textContent = text; }
    }
    // 장면 배율 — 480×300 좌표로 짠 판을 상자 폭에 맞춰 통째로 줄인다
    let k = 1;
    function fitScene(): void {
        const w = root.clientWidth;
        k = w > 0 ? w / W : 1;
        scene.style.transform = 'scale(' + k.toFixed(4) + ')';
    }
    // 화면 좌표(CSS px) → 장면 좌표(480×300). 줄인 배율 k 로 나눠야 판 안의 위치가 된다
    function toScene(clientX: number, clientY: number): [number, number] {
        const r = root.getBoundingClientRect();
        return [(clientX - r.left) / k, (clientY - r.top) / k];
    }
    // 캡처 단계에서 듣는다 — 버튼 자신의 pointerdown 보다 먼저 시연을 끝내야 사람의 첫 누름이 처음 상태에서 시작한다
    root.addEventListener('pointerdown', wake, true);
    root.addEventListener('keydown', wake, true);
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    let dprNow = 1;
    function fitCanvas(): void {
        // 배율은 2 에서 자른다 — 배율 3 기기에서 화소가 2.25배로 늘어 프레임마다 일이 그만큼 커지지 않게
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        dprNow = dpr;
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fitCanvas();
    resizeHooks.push(fitCanvas);
    // 2D 값 노이즈 — 격자점마다 시드 난수 값을 두고 사이를 부드럽게 보간한다. 결과는 -1~1
    function makeNoise(seed: number): (x: number, y: number) => number {
        const rng = makeRng(seed);
        const perm = new Uint8Array(512);
        const vals = new Float32Array(256);
        for (let i = 0; i < 256; i += 1) { vals[i] = rng() * 2 - 1; perm[i] = i; }
        for (let i = 255; i > 0; i -= 1) {
            const j = Math.floor(rng() * (i + 1));
            const t = perm[i];
            perm[i] = perm[j];
            perm[j] = t;
        }
        for (let i = 0; i < 256; i += 1) { perm[i + 256] = perm[i]; }
        function at(xi: number, yi: number): number { return vals[perm[(xi & 255) + perm[yi & 255]]]; }
        return function (x: number, y: number): number {
            const xi = Math.floor(x);
            const yi = Math.floor(y);
            const fx = x - xi;
            const fy = y - yi;
            const u = fx * fx * (3 - 2 * fx);
            const v = fy * fy * (3 - 2 * fy);
            const a = lerp(at(xi, yi), at(xi + 1, yi), u);
            const b = lerp(at(xi, yi + 1), at(xi + 1, yi + 1), u);
            return lerp(a, b, v);
        };
    }
    type Phase = 'idle' | 'fly' | 'drift' | 'done';
    type V2 = [number, number];
    // 꼬리 입자 풀 크기 — 이 수를 넘으면 가장 오래된 입자 자리부터 다시 쓴다
    const TRAIL_COUNT = 150;
    // 공기 저항 — 16ms 한 걸음마다 속도에 곱한다. 1 에 가까울수록 멀리 미끄러진다
    const AIR_DRAG = 0.955;
    // 노이즈 장이 입자를 미는 세기(px/걸음²). 장의 값이 방향(0~2π)이 된다
    const TRAIL_NOISE = 0.06;
    const NOISE_SCALE = 0.011;
    const NOISE_DRIFT = 0.00045;
    const LIFE_MS = 1100;
    const SPAWN_PER_STEP = 3;
    const FLY_MS = 1150;
    const DEMO_CYCLE = 2400;
    // 비행 경로 — 버튼 안 아이콘 자리에서 출발하는 3차 베지어 S 곡선
    const PATH: V2[] = [[66, 236], [250, 96], [318, 270], [520, 58]];
    // 날아가는 종이비행기 모양 = 버튼 아이콘과 같은 Phosphor paper-plane-tilt 경로(256 격자)
    const PLANE_FILL = 'm223.69 42.18l-58.22 192a8 8 0 0 1-14.92 1.25L108 148l-87.42-42.55a8 8 0 0 1 1.25-14.92l192-58.22a8 8 0 0 1 9.86 9.87';
    const PLANE_LINE = 'M227.32 28.68a16 16 0 0 0-15.66-4.08h-.15L19.57 82.84a16 16 0 0 0-2.49 29.8L102 154l41.3 84.87a15.86 15.86 0 0 0 14.44 9.13q.69 0 1.38-.06a15.88 15.88 0 0 0 14-11.51l58.2-191.94v-.15a16 16 0 0 0-4-15.66m-69.49 203.17l-.05.14v-.07l-40.06-82.3l48-48a8 8 0 0 0-11.31-11.31l-48 48l-82.33-40.06h-.07h.14L216 40Z';
    const TXT_IDLE = '초대장 보내기';
    const TXT_SENDING = '보내는 중';
    const TXT_SENT = '보냈어요';
    const TXT_READY = '보낼 준비 됨';
    const TXT_FLY = '꼬리를 남기며 날아가는 중';
    const TXT_DONE = '보냄 — 초대장이 출발했어요';
    const sendEl = root.querySelector('[data-role="send"]') as HTMLButtonElement | null;
    const labelEl = root.querySelector('[data-role="label"]') as HTMLElement | null;
    const iconEl = root.querySelector('[data-role="icon"]') as SVGElement | null;
    if (!sendEl || !labelEl || !iconEl) { return; }
    const send: HTMLButtonElement = sendEl;
    const label: HTMLElement = labelEl;
    const icon: SVGElement = iconEl;
    const planeFill = new Path2D(PLANE_FILL);
    const planeLine = new Path2D(PLANE_LINE);
    const noise = makeNoise(466);
    const rng = makeRng(4660);
    const px = new Float32Array(TRAIL_COUNT);
    const py = new Float32Array(TRAIL_COUNT);
    const vx = new Float32Array(TRAIL_COUNT);
    const vy = new Float32Array(TRAIL_COUNT);
    const age = new Float32Array(TRAIL_COUNT);
    const alive = new Uint8Array(TRAIL_COUNT);
    let head = 0;
    let phase: Phase = 'idle';
    let pt = 0;
    let fieldT = 0;
    let demoNext = 200;
    function pathAt(t: number): V2 {
        const u = 1 - t;
        const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        return [a * PATH[0][0] + b * PATH[1][0] + c * PATH[2][0] + d * PATH[3][0], a * PATH[0][1] + b * PATH[1][1] + c * PATH[2][1] + d * PATH[3][1]];
    }
    function pathDir(t: number): V2 {
        const u = 1 - t;
        const dx = 3 * u * u * (PATH[1][0] - PATH[0][0]) + 6 * u * t * (PATH[2][0] - PATH[1][0]) + 3 * t * t * (PATH[3][0] - PATH[2][0]);
        const dy = 3 * u * u * (PATH[1][1] - PATH[0][1]) + 6 * u * t * (PATH[2][1] - PATH[1][1]) + 3 * t * t * (PATH[3][1] - PATH[2][1]);
        const l = Math.hypot(dx, dy) || 1;
        return [dx / l, dy / l];
    }
    function flyParam(p: number): number { return Math.pow(clamp(p, 0, 1), 1.3); }
    // 입자 하나를 꼬리 자리에 떨어뜨린다 — 진행 반대쪽으로 조금, 옆으로 시드 난수만큼 흩뿌린다
    function spawn(pos: V2, dir: V2): void {
        const i = head;
        head = (head + 1) % TRAIL_COUNT;
        const side = (rng() - 0.5) * 0.9;
        const back = 0.6 + rng() * 0.8;
        px[i] = pos[0] - dir[0] * 8;
        py[i] = pos[1] - dir[1] * 8;
        vx[i] = -dir[0] * back - dir[1] * side;
        vy[i] = -dir[1] * back + dir[0] * side;
        age[i] = 0;
        alive[i] = 1;
    }
    // 한 걸음 — 속도에 저항을 곱해 줄이고, 그 자리 노이즈 값이 가리키는 방향으로 민 뒤 옮긴다
    function advance(i: number): void {
        vx[i] *= AIR_DRAG;
        vy[i] *= AIR_DRAG;
        const ang = noise(px[i] * NOISE_SCALE, py[i] * NOISE_SCALE + fieldT * NOISE_DRIFT) * Math.PI * 2;
        vx[i] += Math.cos(ang) * TRAIL_NOISE;
        vy[i] += Math.sin(ang) * TRAIL_NOISE - 0.004;
        px[i] += vx[i];
        py[i] += vy[i];
        age[i] += FIXED_DT;
        if (age[i] >= LIFE_MS) { alive[i] = 0; }
    }
    function aliveCount(): number {
        let n = 0;
        for (let i = 0; i < TRAIL_COUNT; i += 1) { n += alive[i]; }
        return n;
    }
    function setIcon(a: number, s: number): void {
        icon.style.opacity = a === 1 ? '' : a.toFixed(3);
        icon.style.transform = s === 1 ? '' : 'scale(' + s.toFixed(3) + ')';
    }
    function resetIdle(): void {
        phase = 'idle';
        pt = 0;
        alive.fill(0);
        label.textContent = TXT_IDLE;
        send.classList.remove('is-sent');
        setIcon(1, 1);
        say(TXT_READY);
    }
    function finish(): void {
        phase = 'done';
        pt = 0;
        alive.fill(0);
        label.textContent = TXT_SENT;
        send.classList.add('is-sent');
        setIcon(1, 1);
        say(TXT_DONE);
    }
    function settle(): void { finish(); }
    function press(): void {
        if (phase !== 'idle' && phase !== 'done') { return; }
        if (still) { finish(); return; }
        resetIdle();
        phase = 'fly';
        label.textContent = TXT_SENDING;
        setIcon(0, 1);
        say(TXT_FLY);
    }
    function step(): void {
        fieldT += FIXED_DT;
        for (let i = 0; i < TRAIL_COUNT; i += 1) { if (alive[i] === 1) { advance(i); } }
        if (phase === 'idle' || phase === 'done') { return; }
        pt += FIXED_DT;
        if (phase === 'fly') {
            const t = flyParam(pt / FLY_MS);
            const pos = pathAt(t);
            const dir = pathDir(t);
            if (pos[0] < W + 10) { for (let s = 0; s < SPAWN_PER_STEP; s += 1) { spawn(pos, dir); } }
            if (pt >= FLY_MS) {
                phase = 'drift';
                pt = 0;
                label.textContent = TXT_SENT;
                send.classList.add('is-sent');
            }
        } else if (phase === 'drift' && aliveCount() === 0) {
            finish();
        }
    }
    function demoTick(t: number): void {
        if (t < demoNext) { return; }
        demoNext += DEMO_CYCLE;
        resetIdle();
        press();
    }
    function draw(): void {
        ctx.clearRect(0, 0, W, H);
        for (let i = 0; i < TRAIL_COUNT; i += 1) {
            if (alive[i] === 0) { continue; }
            const f = age[i] / LIFE_MS;
            ctx.fillStyle = rgba(mix(LILAC, SKY, f), 0.5 * Math.pow(1 - f, 1.3));
            ctx.beginPath();
            ctx.arc(px[i], py[i], 1.5 + 5 * f, 0, Math.PI * 2);
            ctx.fill();
        }
        if (phase === 'fly') {
            const t = flyParam(pt / FLY_MS);
            const pos = pathAt(t);
            const dir = pathDir(t);
            ctx.save();
            ctx.translate(pos[0], pos[1]);
            // 아이콘 기수는 오른쪽 위(−45°)를 본다 — 진행 각도에 45° 를 더해 기수를 접선에 맞춘다
            ctx.rotate(Math.atan2(dir[1], dir[0]) + Math.PI / 4);
            ctx.scale(26 / 256, 26 / 256);
            ctx.translate(-128, -128);
            ctx.fillStyle = rgba(PAPER, 0.55);
            ctx.fill(planeFill);
            ctx.fillStyle = rgba(PAPER, 1);
            ctx.fill(planeLine);
            ctx.restore();
        } else if (phase === 'drift') {
            const p = clamp(pt / 260, 0, 1);
            setIcon(p, lerp(0.4, 1, easeOut(p)));
        }
    }
    send.addEventListener('click', function (): void { press(); });
    resetIdle();

    let rafId = 0;
    let lastTs = -1;
    let acc = 0;
    let clock = 0;
    function onResize(): void {
        fitScene();
        for (const f of resizeHooks) { f(); }
        draw();
    }
    fitScene();
    window.addEventListener('resize', onResize);
    function frame(ts: number): void {
        if (lastTs < 0) { lastTs = ts; }
        // 탭이 숨었다 돌아와도 한 번에 100ms 까지만 따라잡는다 — 순간이동 대신 이어서 움직인다
        acc += Math.min(ts - lastTs, 100);
        lastTs = ts;
        let n = 0;
        while (acc >= FIXED_DT && n < 6) {
            clock += FIXED_DT;
            if (demo) { demoTick(clock); }
            step();
            acc -= FIXED_DT;
            n += 1;
        }
        draw();
        rafId = window.requestAnimationFrame(frame);
    }
    if (still) {
        settle();
        draw();
    } else {
        rafId = window.requestAnimationFrame(frame);
    }
    return function (): void {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
    };

  }, []);

  return (
    <div className={cx("sb") + " is-demo"} ref={rootRef}>
      <div className={cx("sb__scene")} data-role="scene">
        <canvas className={cx("sb__canvas")} data-role="canvas" width={480} height={300} aria-hidden="true"></canvas>
        <button className={cx("tr__send")} data-role="send" type="button"><svg xmlns="http://www.w3.org/2000/svg" className={cx("tr__icon")} data-role="icon" aria-hidden="true" focusable="false" viewBox="0 0 256 256"><g fill="currentColor"><path d="m223.69 42.18l-58.22 192a8 8 0 0 1-14.92 1.25L108 148l-87.42-42.55a8 8 0 0 1 1.25-14.92l192-58.22a8 8 0 0 1 9.86 9.87" opacity=".2"/><path d="M227.32 28.68a16 16 0 0 0-15.66-4.08h-.15L19.57 82.84a16 16 0 0 0-2.49 29.8L102 154l41.3 84.87a15.86 15.86 0 0 0 14.44 9.13q.69 0 1.38-.06a15.88 15.88 0 0 0 14-11.51l58.2-191.94v-.15a16 16 0 0 0-4-15.66m-69.49 203.17l-.05.14v-.07l-40.06-82.3l48-48a8 8 0 0 0-11.31-11.31l-48 48l-82.33-40.06h-.07h.14L216 40Z"/></g></svg><span className={cx("tr__label")} data-role="label">초대장 보내기</span></button>
        <p className={cx("sb__status sb__status--top")} data-role="status" aria-live="off">보낼 준비 됨</p>
      </div>
    </div>
  );
}
