// SendFailDampedShake - vanilla 판(08-send-btn-fail-damped-shake) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./SendFailDampedShake.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function SendFailDampedShake() {
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
    type Spring = { x: number; v: number; target: number };
    // 감쇠 스프링 한 걸음 — 질량 1, 강성 stiff, 감쇠비 zeta. 속도를 먼저 바꾸고 그 속도로 위치를 옮긴다(반암시적 오일러)
    function springStep(s: Spring, stiff: number, zeta: number, dtMs: number): void {
        const dt = dtMs / 1000;
        const c = 2 * zeta * Math.sqrt(stiff);
        const a = -stiff * (s.x - s.target) - c * s.v;
        s.v += a * dt;
        s.x += s.v * dt;
    }
    type Phase = 'idle' | 'sending' | 'shake' | 'failed' | 'done';
    // 처음 흔들림 폭(px)
    const SHAKE_AMP_PX = 12;
    // 지수 감쇠율(1/s) — 폭이 반으로 줄어드는 시간 = ln2 / SHAKE_DECAY
    const SHAKE_DECAY = 6;
    // 초당 왕복 수
    const SHAKE_HZ = 8;
    // 흔들림이 끝났다고 보는 폭(px) — 이 밑으로 줄어드는 시각까지만 흔든다
    const SHAKE_REST_PX = 0.3;
    const SHAKE_MS = Math.ceil(Math.log(SHAKE_AMP_PX / SHAKE_REST_PX) / SHAKE_DECAY * 1000);
    // 보내기 버튼은 입력줄에 스프링으로 매달려 한 발 늦게 따라온다 — 강성을 낮추면 따라오지 못하고 제자리에 남는다
    const LAG_K = 3600;
    const LAG_ZETA = 0.5;
    const SEND_MS = 420;
    const DEMO_CYCLE = 3200;
    const DEMO_RETRY_AT = 1400;
    const TXT_READY = '보낼 준비 됨';
    const TXT_SENDING = '보내는 중';
    const TXT_FAIL = '전송 실패 — 다시 보내기를 눌러 주세요';
    const TXT_DONE = '보냄 — 다시 보내기에 성공했어요';
    const TXT_ARIA_SEND = '메시지 보내기';
    const TXT_ARIA_RETRY = '다시 보내기';
    const TXT_ARIA_SENT = '보냄';
    const barEl = root.querySelector('[data-role="bar"]') as HTMLElement | null;
    const sendEl = root.querySelector('[data-role="send"]') as HTMLButtonElement | null;
    const noteEl = root.querySelector('[data-role="note"]') as HTMLElement | null;
    const iconSendEl = root.querySelector('[data-role="icon-send"]') as SVGElement | null;
    const iconRetryEl = root.querySelector('[data-role="icon-retry"]') as SVGElement | null;
    if (!barEl || !sendEl || !noteEl || !iconSendEl || !iconRetryEl) { return; }
    const bar: HTMLElement = barEl;
    const send: HTMLButtonElement = sendEl;
    const note: HTMLElement = noteEl;
    const iconSend: SVGElement = iconSendEl;
    const iconRetry: SVGElement = iconRetryEl;
    const lag: Spring = { x: 0, v: 0, target: 0 };
    let phase: Phase = 'idle';
    let pt = 0;
    let attempt = 0;
    let demoStart = -1;
    let retryDone = false;
    // 흔들림 식 — 사인파를 지수로 줄어드는 봉투 안에 넣는다. tau 는 초
    function shakeOffset(tau: number): number {
        return SHAKE_AMP_PX * Math.exp(-SHAKE_DECAY * tau) * Math.sin(2 * Math.PI * SHAKE_HZ * tau);
    }
    function shakeEnvelope(tau: number): number { return Math.exp(-SHAKE_DECAY * tau); }
    function setState(cls: string, aria: string): void {
        bar.classList.remove('is-fail', 'is-ok');
        if (cls) { bar.classList.add(cls); }
        send.setAttribute('aria-label', aria);
        const retry = cls === 'is-fail';
        iconSend.style.opacity = retry ? '0' : '';
        iconRetry.style.opacity = retry ? '' : '0';
    }
    function resetIdle(): void {
        phase = 'idle';
        pt = 0;
        attempt = 0;
        lag.x = 0;
        lag.v = 0;
        lag.target = 0;
        setState('', TXT_ARIA_SEND);
        note.style.opacity = '0';
        bar.style.transform = '';
        send.style.transform = '';
        say(TXT_READY);
    }
    function fail(): void {
        setState('is-fail', TXT_ARIA_RETRY);
        note.style.opacity = '';
        say(TXT_FAIL);
    }
    function succeed(): void {
        phase = 'done';
        pt = 0;
        setState('is-ok', TXT_ARIA_SENT);
        note.style.opacity = '0';
        say(TXT_DONE);
    }
    function settle(): void {
        resetIdle();
        attempt = 1;
        phase = 'failed';
        fail();
    }
    function press(): void {
        if (phase === 'sending' || phase === 'shake') { return; }
        if (phase === 'done') { resetIdle(); return; }
        attempt += 1;
        if (still) {
            // 줄인 움직임 — 흔들지 않고 결과 상태로 바로 간다
            if (attempt === 1) { phase = 'failed'; fail(); } else { succeed(); }
            return;
        }
        phase = 'sending';
        pt = 0;
        say(TXT_SENDING);
    }
    function step(): void {
        if (phase === 'sending') {
            pt += FIXED_DT;
            if (pt >= SEND_MS) {
                pt = 0;
                // 첫 시도는 실패, 다시 보내기는 성공 — 실패 화면을 보여 주는 시연 순서
                if (attempt === 1) { phase = 'shake'; fail(); } else { succeed(); }
            }
        } else if (phase === 'shake') {
            pt += FIXED_DT;
            if (pt >= SHAKE_MS) { phase = 'failed'; pt = 0; }
        }
        lag.target = phase === 'shake' ? shakeOffset(pt / 1000) : 0;
        springStep(lag, LAG_K, LAG_ZETA, FIXED_DT);
    }
    function demoTick(t: number): void {
        // 첫 시연은 200ms 뒤에 — 렌더 하네스가 로드 직후를 따로 재는 구간을 비운다
        if (t < 200) { return; }
        if (demoStart < 0 || t - demoStart >= DEMO_CYCLE) {
            demoStart = t;
            retryDone = false;
            resetIdle();
            press();
        } else if (!retryDone && t - demoStart >= DEMO_RETRY_AT) {
            retryDone = true;
            press();
        }
    }
    function draw(): void {
        const x = phase === 'shake' ? shakeOffset(pt / 1000) : 0;
        // 기울기도 같은 값에서 — 밀린 쪽으로 x × 0.12° 만큼 고개를 돌린다
        bar.style.transform = x === 0 ? '' : 'translateX(' + x.toFixed(2) + 'px) rotate(' + (x * 0.12).toFixed(2) + 'deg)';
        let nudge = 0;
        if (phase === 'sending') { nudge = Math.sin(Math.PI * pt / SEND_MS) * 6; }
        const rel = lag.x - x + nudge;
        send.style.transform = Math.abs(rel) < 0.01 ? '' : 'translateX(' + rel.toFixed(2) + 'px)';
        if (phase === 'shake') {
            note.style.opacity = clamp(1 - shakeEnvelope(pt / 1000) * 0.6, 0, 1).toFixed(3);
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
        <div className={cx("sh__bar")} data-role="bar">
          <span className={cx("sh__text")}>회의 자료 보내 드려요</span>
          <button className={cx("sh__send")} data-role="send" type="button" aria-label="메시지 보내기"><svg xmlns="http://www.w3.org/2000/svg" className={cx("sh__icon")} data-role="icon-send" aria-hidden="true" focusable="false" viewBox="0 0 256 256"><g fill="currentColor"><path d="M227.91 134.86L59.93 231a8 8 0 0 1-11.44-9.67L80 128L48.49 34.72a8 8 0 0 1 11.44-9.67l168 95.85a8 8 0 0 1-.02 13.96" opacity=".2"/><path d="m231.87 114l-168-95.89a16 16 0 0 0-22.95 19.23L71.55 128l-30.63 90.67A16 16 0 0 0 56 240a16.15 16.15 0 0 0 7.93-2.1l167.92-96.05a16 16 0 0 0 .05-27.89ZM56 224a.6.6 0 0 0 0-.12L85.74 136H144a8 8 0 0 0 0-16H85.74L56.06 32.16A.5.5 0 0 0 56 32l168 95.83Z"/></g></svg><svg xmlns="http://www.w3.org/2000/svg" className={cx("sh__icon")} data-role="icon-retry" aria-hidden="true" focusable="false" viewBox="0 0 256 256"><g fill="currentColor"><path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2"/><path d="M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0"/></g></svg></button>
        </div>
        <p className={cx("sh__note")} data-role="note">전송하지 못했어요</p>
        <p className={cx("sb__status sb__status--top")} data-role="status" aria-live="off">보낼 준비 됨</p>
      </div>
    </div>
  );
}
