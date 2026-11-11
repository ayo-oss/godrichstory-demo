// SendGlossSweepPointer - vanilla 판(06-send-btn-gloss-sweep-pointer) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./SendGlossSweepPointer.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function SendGlossSweepPointer() {
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
    type Phase = 'idle' | 'sending' | 'done';
    // 버튼 자리(장면 px) — scss 의 .gl__send 위치·크기와 같은 값
    const BTN_CX = 240;
    const BTN_CY = 140;
    const BTN_W = 232;
    const BTN_H = 64;
    // 광택 띠가 버튼을 한 번 가로지르는 시간
    const SWEEP_MS = 820;
    // 광택 띠 너비(px) — 대각으로 기울여(skewX −22°) 지나간다
    const GLOSS_WIDTH = 46;
    // 기울기가 포인터 쪽으로 다가가는 비율 — 16ms 한 걸음마다 남은 거리의 12% 만큼 간다(관성 lerp)
    const TILT_LERP = 0.12;
    const TILT_MAX_DEG = 14;
    const SPOT = 140;
    const SEND_MS = 1700;
    const DEMO_CYCLE = 3000;
    const TXT_IDLE = '결제하기';
    const TXT_SENDING = '보내는 중';
    const TXT_SENT = '결제 완료';
    const TXT_READY = '결제할 준비 됨';
    const TXT_SEND = '결제 요청을 보내는 중';
    const TXT_DONE = '결제 완료 — 영수증을 메일로 보냈어요';
    const sendEl = root.querySelector('[data-role="send"]') as HTMLButtonElement | null;
    const labelEl = root.querySelector('[data-role="label"]') as HTMLElement | null;
    const glossEl = root.querySelector('[data-role="gloss"]') as HTMLElement | null;
    const spotEl = root.querySelector('[data-role="spot"]') as HTMLElement | null;
    const shadowEl = root.querySelector('[data-role="shadow"]') as HTMLElement | null;
    const glowEl = root.querySelector('[data-role="glow"]') as HTMLElement | null;
    if (!sendEl || !labelEl || !glossEl || !spotEl || !shadowEl || !glowEl) { return; }
    const glow: HTMLElement = glowEl;
    const send: HTMLButtonElement = sendEl;
    const label: HTMLElement = labelEl;
    const gloss: HTMLElement = glossEl;
    const spot: HTMLElement = spotEl;
    const shadow: HTMLElement = shadowEl;
    let phase: Phase = 'idle';
    let pt = 0;
    let tx = 0;
    let ty = 0;
    let gx = 0;
    let gy = 0;
    let demoNext = 200;
    // 관성 lerp 한 걸음 — 목표로 곧장 가지 않고 남은 거리의 TILT_LERP 만큼만 간다
    function follow(cur: number, goal: number): number { return cur + (goal - cur) * TILT_LERP; }
    // 광택 띠의 x — 한 번 지나가는 동안 왼쪽 밖(−2×너비)에서 오른쪽 밖(버튼 너비 + 너비)까지
    function glossX(t: number): number {
        const p = (t % SWEEP_MS) / SWEEP_MS;
        return lerp(-GLOSS_WIDTH * 2, BTN_W + GLOSS_WIDTH, easeInOut(p));
    }
    // 하이라이트 중심 — 포인터가 아니라 지금의 기울기(tx, ty)에서 다시 계산한다. 그래서 반사광도 늦게 따라온다
    function spotCenter(): [number, number] { return [BTN_W / 2 + tx * BTN_W * 0.38, BTN_H / 2 + ty * BTN_H * 0.5]; }
    function resetIdle(): void {
        phase = 'idle';
        pt = 0;
        label.textContent = TXT_IDLE;
        say(TXT_READY);
    }
    function finish(): void {
        phase = 'done';
        pt = 0;
        label.textContent = TXT_SENT;
        say(TXT_DONE);
    }
    function settle(): void { finish(); }
    function press(): void {
        if (phase === 'sending') { return; }
        if (still) { finish(); return; }
        phase = 'sending';
        pt = 0;
        label.textContent = TXT_SENDING;
        say(TXT_SEND);
    }
    function aim(clientX: number, clientY: number): void {
        const p = toScene(clientX, clientY);
        gx = clamp((p[0] - BTN_CX) / (BTN_W / 2 + 40), -1, 1);
        gy = clamp((p[1] - BTN_CY) / (BTN_H / 2 + 60), -1, 1);
    }
    function step(): void {
        if (still) { tx = gx; ty = gy; return; }
        tx = follow(tx, gx);
        ty = follow(ty, gy);
        if (phase !== 'sending') { return; }
        pt += FIXED_DT;
        if (pt >= SEND_MS) { finish(); }
    }
    function demoTick(t: number): void {
        // 시연 포인터 — 버튼 둘레를 리사주 곡선으로 돈다
        gx = 0.85 * Math.cos(t * 0.0021);
        gy = 0.7 * Math.sin(t * 0.0033);
        if (t < demoNext) { return; }
        demoNext += DEMO_CYCLE;
        resetIdle();
        press();
    }
    function draw(): void {
        send.style.transform = 'perspective(520px) rotateX(' + (-ty * TILT_MAX_DEG).toFixed(2) + 'deg) rotateY(' + (tx * TILT_MAX_DEG).toFixed(2) + 'deg)';
        const c = spotCenter();
        spot.style.transform = 'translate(' + (c[0] - SPOT / 2).toFixed(1) + 'px,' + (c[1] - SPOT / 2).toFixed(1) + 'px)';
        spot.style.opacity = (0.45 + 0.4 * Math.min(1, Math.hypot(tx, ty))).toFixed(3);
        // 그림자는 기울기 반대쪽으로 크게(가로 22px·세로 14px) 밀린다 — 같은 tx·ty 가 버튼 밖 넓은 바닥까지 전파된다
        shadow.style.transform = 'translate(' + (-tx * 22).toFixed(1) + 'px,' + (14 - ty * 14).toFixed(1) + 'px) scale(' + (1 - Math.hypot(tx, ty) * 0.05).toFixed(3) + ')';
        // 바닥 반사 — 광택 띠가 버튼 가운데를 지날 때 가장 밝다(띠 진행률의 사인). 위치는 기울기 쪽으로
        let band = 0;
        if (phase === 'sending') { band = Math.sin(Math.PI * ((pt % SWEEP_MS) / SWEEP_MS)); }
        glow.style.transform = 'translate(' + (tx * 24).toFixed(1) + 'px,' + (ty * 10).toFixed(1) + 'px)';
        glow.style.opacity = (0.2 + 0.6 * band).toFixed(3);
        if (phase === 'sending') {
            gloss.style.opacity = '';
            gloss.style.transform = 'translateX(' + glossX(pt).toFixed(1) + 'px) skewX(-22deg)';
        } else {
            gloss.style.opacity = '0';
        }
    }
    gloss.style.width = GLOSS_WIDTH + 'px';
    root.addEventListener('pointermove', function (ev: PointerEvent): void { wake(); aim(ev.clientX, ev.clientY); });
    root.addEventListener('pointerleave', function (): void { gx = 0; gy = 0; });
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
        <span className={cx("gl__glow")} data-role="glow" aria-hidden="true"></span>
        <span className={cx("gl__shadow")} data-role="shadow" aria-hidden="true"></span>
        <button className={cx("gl__send")} data-role="send" type="button">
          <span className={cx("gl__spot")} data-role="spot" aria-hidden="true"></span>
          <span className={cx("gl__gloss")} data-role="gloss" aria-hidden="true"></span>
          <span className={cx("gl__label")} data-role="label">결제하기</span>
        </button>
        <p className={cx("sb__status")} data-role="status" aria-live="off">결제할 준비 됨</p>
      </div>
    </div>
  );
}
