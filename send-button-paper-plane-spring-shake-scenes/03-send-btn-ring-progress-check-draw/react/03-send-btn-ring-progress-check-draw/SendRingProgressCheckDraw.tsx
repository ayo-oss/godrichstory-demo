// SendRingProgressCheckDraw - vanilla 판(03-send-btn-ring-progress-check-draw) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./SendRingProgressCheckDraw.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function SendRingProgressCheckDraw() {
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
    type Phase = 'idle' | 'shrink' | 'load' | 'fill' | 'check' | 'done';
    // 알약 버튼 크기(px) — svg 안 좌표. 원으로 줄면 너비가 높이와 같아진다
    const PILL_W = 192;
    const PILL_H = 56;
    const SVG_CX = 120;
    const SVG_CY = 50;
    // 알약 너비가 높이(원)까지 줄어드는 시간
    const SHRINK_MS = 360;
    // 진행 링 선 두께(px). 링 반지름 = 원 반지름 28 + 틈 6 + 두께의 절반
    const RING_STROKE = 4;
    const RING_R = PILL_H / 2 + 6 + RING_STROKE / 2;
    // 둘레 길이 = 2πr. 진행률만큼만 선을 드러내려면 dasharray 를 둘레로, dashoffset 을 둘레 × (1 − 진행률)로 둔다
    const RING_C = 2 * Math.PI * RING_R;
    // 체크 표시를 다 긋는 시간 — 경로 길이에 정비례로 펜이 움직여 두 획의 길이 비율대로 시간이 나뉜다
    const CHECK_DRAW_MS = 300;
    const PROGRESS_MS = 1000;
    const FILL_MS = 160;
    const DEMO_CYCLE = 2400;
    const TXT_IDLE = '제출하기';
    const TXT_DONE = '제출 완료';
    const TXT_READY = '제출할 준비 됨';
    const TXT_LOAD = '원으로 줄어 진행 링을 채우는 중';
    const TXT_FINISH = '제출 완료 — 접수 번호를 메일로 보냈어요';
    const sendEl = root.querySelector('[data-role="send"]') as HTMLButtonElement | null;
    const labelEl = root.querySelector('[data-role="label"]') as HTMLElement | null;
    const bodyEl = root.querySelector('[data-role="body"]') as SVGRectElement | null;
    const trackEl = root.querySelector('[data-role="track"]') as SVGCircleElement | null;
    const ringEl = root.querySelector('[data-role="ring"]') as SVGCircleElement | null;
    const checkEl = root.querySelector('[data-role="check"]') as SVGPolylineElement | null;
    const haloEl = root.querySelector('[data-role="halo"]') as SVGCircleElement | null;
    if (!sendEl || !labelEl || !bodyEl || !trackEl || !ringEl || !checkEl || !haloEl) { return; }
    const halo: SVGCircleElement = haloEl;
    const send: HTMLButtonElement = sendEl;
    const label: HTMLElement = labelEl;
    const body: SVGRectElement = bodyEl;
    const track: SVGCircleElement = trackEl;
    const ring: SVGCircleElement = ringEl;
    const check: SVGPolylineElement = checkEl;
    // 체크 경로 길이 — 브라우저가 재 준 값(getTotalLength)을 쓰고, 못 재면 두 획 길이의 합으로
    const CHECK_PTS: Array<[number, number]> = [[106, 51], [116, 61], [135, 40]];
    function pathLength(pts: Array<[number, number]>): number {
        let s = 0;
        for (let i = 1; i < pts.length; i += 1) { s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); }
        return s;
    }
    const checkLen = typeof check.getTotalLength === 'function' ? check.getTotalLength() : pathLength(CHECK_PTS);
    const rng = makeRng(466);
    let phase: Phase = 'idle';
    let pt = 0;
    let progress = 0;
    let shown = 0;
    let demoNext = 200;
    function setNum(el: Element, name: string, v: number): void { el.setAttribute(name, v.toFixed(2)); }
    // 알약 너비 w 로 몸통을 다시 그린다 — 가운데를 지키려면 x 도 함께 옮긴다
    function setPill(w: number): void {
        setNum(body, 'x', SVG_CX - w / 2);
        setNum(body, 'width', w);
    }
    function setRing(p: number): void { setNum(ring, 'stroke-dashoffset', RING_C * (1 - clamp(p, 0, 1))); }
    function setCheck(p: number): void {
        setNum(check, 'stroke-dashoffset', checkLen * (1 - clamp(p, 0, 1)));
        // 길이 0 인 대시에도 둥근 끝(round cap)이 점 하나로 찍힌다 — 긋기 전에는 아예 숨긴다
        check.style.opacity = p <= 0 ? '0' : '';
    }
    function setFill(t: number): void { body.setAttribute('fill', rgba(mix(LILAC, MINT, clamp(t, 0, 1)), 1)); }
    function setRingAlpha(a: number): void {
        ring.style.opacity = a.toFixed(3);
        track.style.opacity = a.toFixed(3);
    }
    // 후광 — 링이 보여 주는 진행률 하나로 반지름(RING_R + 4 → + 38)과 진하기를 같이 정한다. 진행이 원 밖 넓은 면까지 번진다
    function setHalo(p: number, a: number): void {
        setNum(halo, 'r', RING_R + 4 + 34 * clamp(p, 0, 1));
        halo.style.opacity = clamp(a, 0, 1).toFixed(3);
    }
    function resetIdle(): void {
        phase = 'idle';
        pt = 0;
        progress = 0;
        shown = 0;
        setPill(PILL_W);
        setFill(0);
        setRing(0);
        setRingAlpha(0);
        setHalo(0, 0);
        setCheck(0);
        label.textContent = TXT_IDLE;
        label.style.opacity = '';
        say(TXT_READY);
    }
    function finish(): void {
        phase = 'done';
        pt = 0;
        setPill(PILL_H);
        setFill(1);
        setRingAlpha(0);
        setHalo(1, 0);
        setCheck(1);
        label.textContent = TXT_DONE;
        label.style.opacity = '0';
        say(TXT_FINISH);
    }
    function settle(): void { finish(); }
    function press(): void {
        if (phase !== 'idle' && phase !== 'done') { return; }
        if (still) { finish(); return; }
        resetIdle();
        phase = 'shrink';
        say(TXT_LOAD);
    }
    function step(): void {
        if (phase === 'idle' || phase === 'done') { return; }
        pt += FIXED_DT;
        if (phase === 'shrink' && pt >= SHRINK_MS) { phase = 'load'; pt = 0; }
        else if (phase === 'load') {
            // 업로드는 고르게 차지 않는다 — 걸음마다 평균 속도의 0.35~1.65 배로 더해 덩어리지게 찬다
            progress = Math.min(1, progress + (FIXED_DT / PROGRESS_MS) * (0.35 + 1.3 * rng()));
            // 링은 진행률로 바로 튀지 않고 남은 차이의 30% 씩 다가간다
            shown += (progress - shown) * 0.3;
            if (progress >= 1 && shown > 0.995) { shown = 1; phase = 'fill'; pt = 0; }
        } else if (phase === 'fill' && pt >= FILL_MS) { phase = 'check'; pt = 0; label.textContent = TXT_DONE; }
        else if (phase === 'check' && pt >= CHECK_DRAW_MS) { finish(); }
    }
    function demoTick(t: number): void {
        if (t < demoNext) { return; }
        demoNext += DEMO_CYCLE;
        resetIdle();
        press();
    }
    function draw(): void {
        if (phase === 'shrink') {
            const p = easeInOut(pt / SHRINK_MS);
            setPill(lerp(PILL_W, PILL_H, p));
            label.style.opacity = clamp(1 - p * 2, 0, 1).toFixed(3);
            setRingAlpha(p);
            setHalo(0, p * 0.9);
        } else if (phase === 'load') {
            setRing(shown);
            setHalo(shown, 0.9 - 0.3 * shown);
        } else if (phase === 'fill') {
            const p = pt / FILL_MS;
            setRing(1);
            setFill(p);
            setRingAlpha(1 - p);
            setHalo(1, 0.6 * (1 - p));
        } else if (phase === 'check') {
            setRingAlpha(0);
            setHalo(1, 0);
            setFill(1);
            setCheck(pt / CHECK_DRAW_MS);
        }
    }
    setNum(ring, 'r', RING_R);
    setNum(track, 'r', RING_R);
    setNum(ring, 'stroke-width', RING_STROKE);
    setNum(track, 'stroke-width', RING_STROKE);
    ring.setAttribute('stroke-dasharray', RING_C.toFixed(2));
    check.setAttribute('stroke-dasharray', checkLen.toFixed(2));
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
        <span className={cx("rg__area")} aria-hidden="true"></span>
        <button className={cx("rg__send")} data-role="send" type="button">
          <svg className={cx("rg__svg")} viewBox="0 0 240 100" aria-hidden="true" focusable="false">
            <circle className={cx("rg__halo")} data-role="halo" cx="120" cy="50" r="40" fill="#e6dfff"/>
            <rect className={cx("rg__body")} data-role="body" x="24" y="22" width="192" height="56" rx="28" fill="#c8b8ff"/>
            <circle className={cx("rg__track")} data-role="track" cx="120" cy="50" r="36" fill="none" strokeWidth="4"/>
            <circle className={cx("rg__ring")} data-role="ring" cx="120" cy="50" r="36" fill="none" strokeWidth="4" strokeLinecap="round" transform="rotate(-90 120 50)"/>
            <polyline className={cx("rg__check")} data-role="check" points="106,51 116,61 135,40" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={cx("rg__label")} data-role="label">제출하기</span>
        </button>
        <p className={cx("sb__status")} data-role="status" aria-live="off">제출할 준비 됨</p>
      </div>
    </div>
  );
}
