// SendSpringPressShadow - vanilla 판(02-send-btn-spring-press-shadow) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./SendSpringPressShadow.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function SendSpringPressShadow() {
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
    type Spring = { x: number; v: number; target: number };
    // 감쇠 스프링 한 걸음 — 질량 1, 강성 stiff, 감쇠비 zeta. 속도를 먼저 바꾸고 그 속도로 위치를 옮긴다(반암시적 오일러)
    function springStep(s: Spring, stiff: number, zeta: number, dtMs: number): void {
        const dt = dtMs / 1000;
        const c = 2 * zeta * Math.sqrt(stiff);
        const a = -stiff * (s.x - s.target) - c * s.v;
        s.v += a * dt;
        s.x += s.v * dt;
    }
    // 버튼 자리(장면 px) — scss 의 .sp__send 위치·크기와 같은 값
    const BTN_CX = 240;
    const BTN_CY = 142;
    const BTN_W = 208;
    const BTN_H = 60;
    // 감쇠 스프링 강성(1/s²) — 고유 각진동수 √520 ≈ 22.8 rad/s
    const SPRING_K = 520;
    // 감쇠비 — 1 이면 넘치지 않고 멈추고, 낮출수록 더 넘치고 더 오래 출렁인다
    const SPRING_DAMP = 0.45;
    // 쉴 때 버튼 면이 바닥에서 떠 있는 높이(px). 그림자 거리·흐림·진하기가 이 높이에서 다시 계산된다
    const SHADOW_LIFT_PX = 16;
    // 누르면 목표 깊이가 이만큼(px) 내려간다
    const PRESS_DEPTH = 12;
    const HOLD_MS = 180;
    const DEMO_CYCLE = 1300;
    const TXT_IDLE = '가입하기';
    const TXT_SENT = '신청 완료';
    const TXT_READY = '보낼 준비 됨';
    const TXT_DOWN = '눌림 — 스프링이 깊이를 따라가는 중';
    const TXT_DONE = '보냄 — 가입 신청을 받았어요';
    const sendEl = root.querySelector('[data-role="send"]') as HTMLButtonElement | null;
    const labelEl = root.querySelector('[data-role="label"]') as HTMLElement | null;
    if (!sendEl || !labelEl) { return; }
    const send: HTMLButtonElement = sendEl;
    const label: HTMLElement = labelEl;
    // x = 눌린 깊이(px, 아래가 +). 목표만 바꾸고 위치는 스프링이 프레임마다 따라간다
    const depth: Spring = { x: 0, v: 0, target: 0 };
    let down = false;
    let demoNext = 200;
    let releaseAt = -1;
    // 그림자 세 값 — 면의 높이 h(px)에 비례한다. 높을수록 멀리·흐리게·옅게
    function shadowOffset(h: number): number { return 2 + h * 0.85; }
    function shadowBlur(h: number): number { return 4 + h * 1.6; }
    function shadowAlpha(h: number): number { return clamp(0.42 - h * 0.012, 0.12, 0.42); }
    function pressDown(): void {
        if (down) { return; }
        down = true;
        depth.target = PRESS_DEPTH;
        if (still) { depth.x = PRESS_DEPTH; depth.v = 0; }
        say(TXT_DOWN);
    }
    function release(): void {
        if (!down) { return; }
        down = false;
        depth.target = 0;
        if (still) { depth.x = 0; depth.v = 0; }
    }
    function submit(): void {
        label.textContent = TXT_SENT;
        say(TXT_DONE);
    }
    function resetIdle(): void {
        down = false;
        releaseAt = -1;
        depth.x = 0;
        depth.v = 0;
        depth.target = 0;
        label.textContent = TXT_IDLE;
        say(TXT_READY);
    }
    function settle(): void {
        resetIdle();
        submit();
    }
    function step(): void {
        if (still) { return; }
        springStep(depth, SPRING_K, SPRING_DAMP, FIXED_DT);
    }
    function demoTick(t: number): void {
        if (releaseAt >= 0 && t >= releaseAt) {
            releaseAt = -1;
            release();
            submit();
        }
        if (t < demoNext) { return; }
        demoNext += DEMO_CYCLE;
        resetIdle();
        pressDown();
        releaseAt = t + HOLD_MS;
    }
    function draw(): void {
        const h = SHADOW_LIFT_PX - depth.x;
        // 빠르게 움직이는 동안만 세로로 살짝 늘고 줄어든다 — 가로는 넓이를 지키게 역수
        const sy = 1 - clamp(depth.v * 0.00018, -0.05, 0.05);
        send.style.transform = 'translateY(' + depth.x.toFixed(2) + 'px) scale(' + (1 / sy).toFixed(4) + ',' + sy.toFixed(4) + ')';
        ctx.clearRect(0, 0, W, H);
        const off = 1000;
        ctx.save();
        // 그림자만 남기는 꼼수 — 판 밖(왼쪽 1000px)에 그린 사각형의 그림자를 제자리로 옮겨 온다. shadow 값은 기기 화소 단위라 배율을 곱한다
        ctx.shadowColor = rgba(INK, shadowAlpha(h));
        ctx.shadowBlur = shadowBlur(h) * dprNow;
        ctx.shadowOffsetX = off * dprNow;
        ctx.shadowOffsetY = shadowOffset(h) * dprNow;
        ctx.fillStyle = rgba(INK, 1);
        const w = BTN_W - 12 + h * 0.4;
        const y = BTN_CY - BTN_H / 2 + 6;
        ctx.beginPath();
        ctx.roundRect(BTN_CX - w / 2 - off, y, w, BTN_H - 8, 14);
        ctx.fill();
        // 둘째 겹 = 넓게 퍼지는 주변 그림자. 같은 높이 h 에서 거리 4 + 1.4h · 흐림 8 + 3h 로 — 높이가 바뀌면 바닥 넓은 면의 톤이 함께 바뀐다
        ctx.shadowColor = rgba(INK, 0.16);
        ctx.shadowBlur = (8 + h * 3) * dprNow;
        ctx.shadowOffsetY = (4 + h * 1.4) * dprNow;
        ctx.beginPath();
        ctx.roundRect(BTN_CX - (w + 30) / 2 - off, y + 4, w + 30, BTN_H - 12, 18);
        ctx.fill();
        ctx.restore();
    }
    send.addEventListener('pointerdown', function (): void { pressDown(); });
    send.addEventListener('pointerup', function (): void { release(); });
    send.addEventListener('pointerleave', function (): void { release(); });
    send.addEventListener('pointercancel', function (): void { release(); });
    send.addEventListener('keydown', function (ev: KeyboardEvent): void {
        if ((ev.key === ' ' || ev.key === 'Enter') && !ev.repeat) { pressDown(); }
    });
    send.addEventListener('keyup', function (ev: KeyboardEvent): void {
        if (ev.key === ' ' || ev.key === 'Enter') { release(); }
    });
    send.addEventListener('click', function (): void { submit(); });
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
        <span className={cx("sp__field sp__field--a")} aria-hidden="true"></span>
        <span className={cx("sp__field sp__field--b")} aria-hidden="true"></span>
        <canvas className={cx("sb__canvas")} data-role="canvas" width={480} height={300} aria-hidden="true"></canvas>
        <button className={cx("sp__send")} data-role="send" type="button"><span className={cx("sp__label")} data-role="label">가입하기</span></button>
        <p className={cx("sb__status")} data-role="status" aria-live="off">보낼 준비 됨</p>
      </div>
    </div>
  );
}
