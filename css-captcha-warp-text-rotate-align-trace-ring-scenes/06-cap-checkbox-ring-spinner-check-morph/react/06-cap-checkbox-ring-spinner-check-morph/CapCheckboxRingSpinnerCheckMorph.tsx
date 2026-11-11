// CapCheckboxRingSpinnerCheckMorph - vanilla 판(06-cap-checkbox-ring-spinner-check-morph) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./CapCheckboxRingSpinnerCheckMorph.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function CapCheckboxRingSpinnerCheckMorph() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    type RGB = [number, number, number];
    interface Input { idle: number; focus: boolean; key: boolean; }
    interface Scene {
        CYCLE: number;
        REDUCE_TICKS: number;
        reset(): void;
        auto(clk: number): void;
        step(): void;
        draw(ctx: CanvasRenderingContext2D): void;
        label(): string;
        down(x: number, y: number): void;
        move(x: number, y: number): void;
        up(x: number, y: number): void;
        key(k: string): boolean;
        next?(): void;
    }
    type Make = (inp: Input, reduce: boolean) => Scene;
    const W = 480;
    const H = 300;
    const PI2 = Math.PI * 2;
    const FIXED_DT = 16;
    const IDLE_TICKS = 150;
    const BTN_PAUSE = '멈춤';
    const BTN_PLAY = '재생';
    const BTN_NEXT = '다음 장면';
    // 파스텔 팔레트 - 어두운 판 위에 밝은 색을 얹어 명도 차로 읽힌다
    const BG: RGB = [29, 26, 44];
    const PANEL: RGB = [44, 40, 68];
    const MINT: RGB = [126, 226, 192];
    const SKY: RGB = [124, 196, 255];
    const LILAC: RGB = [190, 164, 255];
    const PINK: RGB = [255, 160, 190];
    const PEACH: RGB = [255, 208, 168];
    const CREAM: RGB = [255, 244, 224];
    const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabdefghmnqrt23456789';
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    function easeOutBack(x: number): number { const c = clamp(x, 0, 1) - 1; return 1 + c * c * (2.7 * c + 1.7); }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    function mix(a: RGB, b: RGB, k: number): RGB {
        return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
    }
    // 시드 고정 난수 - 같은 시드면 언제나 같은 수열 (선형 합동 방식)
    function lcg(seed: number): () => number {
        let s = seed >>> 0;
        return function () {
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }
    // 정수 두 개와 시드로 0 이상 1 미만의 값을 만드는 해시 (같은 입력은 늘 같은 값)
    function hash2(x: number, y: number, seed: number): number {
        let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    }
    // 시드로 뜻 없는 글자열을 만든다
    function glyphStr(seed: number, n: number): string {
        const r = lcg(seed * 7919 + 13);
        let s = '';
        for (let i = 0; i < n; i += 1) {
            s += CHARSET.charAt(Math.floor(r() * CHARSET.length));
        }
        return s;
    }
    function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
        const rr = Math.max(0, Math.min(r, w / 2, h / 2));
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.lineTo(x + w - rr, y);
        ctx.arcTo(x + w, y, x + w, y + rr, rr);
        ctx.lineTo(x + w, y + h - rr);
        ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
        ctx.lineTo(x + rr, y + h);
        ctx.arcTo(x, y + h, x, y + h - rr, rr);
        ctx.lineTo(x, y + rr);
        ctx.arcTo(x, y, x + rr, y, rr);
        ctx.closePath();
    }
    function mount(root: HTMLElement, make: Make): () => void {
        const canvas = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement;
        const statusEl = root.querySelector('[data-role="status"]') as HTMLElement;
        const btnEl = root.querySelector('[data-role="btn"]') as HTMLButtonElement;
        if (!canvas || !statusEl || !btnEl) {
            return function () { return; };
        }
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        if (!ctx) {
            return function () { return; };
        }
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const inp: Input = { idle: 99999, focus: false, key: false };
        const scene = make(inp, reduce);
        let paused = false;
        let rafId = 0;
        let lastTs = -1;
        let accMs = 0;
        let lastLabel = '';
        let lastLabelTick = -999;
        let lastLive = 'polite';
        let tickN = 0;
        let clk = 0;
        let wasAuto = true;
        const cleaners: Array<() => void> = [];
        function listen<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void): void {
            target.addEventListener(type, fn);
            cleaners.push(function () { target.removeEventListener(type, fn); });
        }
        function show(): void {
            scene.draw(ctx);
            // 시연이 혼자 돌 때는 낭독을 끄고, 사람이 만지는 동안은 값이 바뀌어도 0.7초에 한 번만 갱신한다
            const live = (reduce || inp.idle <= IDLE_TICKS) ? 'polite' : 'off';
            if (live !== lastLive) {
                lastLive = live;
                statusEl.setAttribute('aria-live', live);
            }
            const t = scene.label();
            if (t !== lastLabel && (reduce || live === 'off' || tickN - lastLabelTick >= 44)) {
                lastLabel = t;
                lastLabelTick = tickN;
                statusEl.textContent = t;
            }
        }
        // 고정 간격 한 틱 - 입력이 없으면 시연 스크립트가 같은 입구로 입력을 대신 넣는다
        function advance(): void {
            inp.idle += 1;
            tickN += 1;
            const a = inp.idle > IDLE_TICKS;
            if (a && !wasAuto) {
                scene.reset();
                clk = 0;
            }
            wasAuto = a;
            if (a) {
                clk += 1;
                scene.auto(clk);
                if (clk >= scene.CYCLE) {
                    clk = 0;
                    scene.reset();
                }
            }
            scene.step();
        }
        // 움직임 줄이기: 틱을 몰아서 돌린 뒤 한 번만 그린다 (중간 보간 장면은 화면에 나오지 않는다)
        function settle(n: number): void {
            for (let i = 0; i < n; i += 1) {
                inp.idle = 0;
                tickN += 1;
                scene.step();
            }
            show();
        }
        function tick(ts: number): void {
            if (lastTs < 0) {
                lastTs = ts;
            }
            const frameDt = Math.min(ts - lastTs, 160);
            lastTs = ts;
            if (!paused) {
                accMs += frameDt;
                while (accMs >= FIXED_DT) {
                    advance();
                    accMs -= FIXED_DT;
                }
                show();
            }
            rafId = requestAnimationFrame(tick);
        }
        function point(e: PointerEvent): number[] {
            const r = canvas.getBoundingClientRect();
            return [clamp((e.clientX - r.left) * W / r.width, 0, W), clamp((e.clientY - r.top) * H / r.height, 0, H)];
        }
        btnEl.textContent = reduce ? BTN_NEXT : BTN_PAUSE;
        if (reduce) {
            root.classList.remove('is-demo');
            for (let i = 0; i < scene.REDUCE_TICKS; i += 1) {
                advance();
            }
            show();
        }
        listen(btnEl, 'click', function () {
            if (reduce) {
                if (scene.next) {
                    scene.next();
                    show();
                    return;
                }
                const n = Math.round(scene.CYCLE / 3);
                inp.idle = 99999;
                wasAuto = true;
                for (let i = 0; i < n; i += 1) {
                    advance();
                }
                show();
                return;
            }
            paused = !paused;
            if (paused) {
                root.classList.remove('is-demo');
            }
            else {
                root.classList.add('is-demo');
            }
            btnEl.textContent = paused ? BTN_PLAY : BTN_PAUSE;
        });
        listen(canvas, 'focus', function () { inp.focus = true; if (reduce) { show(); } });
        listen(canvas, 'blur', function () { inp.focus = false; inp.key = false; if (reduce) { show(); } });
        listen(canvas, 'pointerdown', function (e) {
            const p = point(e);
            inp.idle = 0;
            inp.key = false;
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 캡처가 안 되는 환경은 그냥 넘어간다 */ }
            scene.down(p[0], p[1]);
            if (reduce) { settle(30); }
        });
        listen(canvas, 'pointermove', function (e) {
            const p = point(e);
            inp.idle = 0;
            inp.key = false;
            scene.move(p[0], p[1]);
            if (reduce) { settle(30); }
        });
        listen(canvas, 'pointerup', function (e) {
            const p = point(e);
            inp.idle = 0;
            scene.up(p[0], p[1]);
            if (reduce) { settle(30); }
        });
        listen(canvas, 'keydown', function (e) {
            inp.idle = 0;
            inp.key = true;
            if (scene.key(e.key)) {
                e.preventDefault();
            }
            if (reduce) { settle(30); }
        });
        if (!reduce) {
            rafId = requestAnimationFrame(tick);
        }
        return function () {
            cancelAnimationFrame(rafId);
            for (let i = 0; i < cleaners.length; i += 1) {
                cleaners[i]();
            }
        };
    }
    const RING_R = 32;        // 고리일 때 반경 (px) - 정사각형 한 변 64px 의 절반이라 이 값에서 원이 된다
    const BOX_R = 12;         // 체크 칸일 때 모서리 반경 (px)
    const SPIN_MS = 560;      // 고리 안에서 호가 도는 시간
    const MORPH_MS = 360;     // 칸 -> 고리, 고리 -> 칸 한 번에 걸리는 시간
    const MORPH_EASE = 2.6;   // 이징 지수 (클수록 가운데가 급하다)
    const PASS_DELAY = 180;   // 호가 멈춘 뒤 칸으로 돌아가기 전 잠깐 멈춤 (ms)
    const IDLE_MS = 140;
    const ROWS = 3;
    const BX = 104;
    const TXT_WAIT = '대기';
    const TXT_CHECKING = '확인 중';
    const TXT_PASSED = '통과';
    const TXT_COUNT = '완료 {p} / {n}';
    interface RowShape { r: number; rot: number; e: number; spin: number; check: number; phase: number; total: number; }
    // PURE-BEGIN
    // 지수 이징 - 앞 절반은 천천히 오르고 뒤 절반은 천천히 멈춘다
    function easeInOutPow(x: number, e: number): number {
        const c = x < 0 ? 0 : (x > 1 ? 1 : x);
        return c < 0.5 ? 0.5 * Math.pow(2 * c, e) : 1 - 0.5 * Math.pow(2 * (1 - c), e);
    }
    // 한 줄의 경과 시간(ms)으로 모양을 정한다. e 하나가 모서리 반경과 회전각을 함께 끈다
    function rowShape(u: number, boxR: number, ringR: number, morphMs: number, spinMs: number, delayMs: number, idleMs: number, ease: number): RowShape {
        const t1 = idleMs;
        const t2 = t1 + morphMs;
        const t3 = t2 + spinMs;
        const t4 = t3 + delayMs;
        const t5 = t4 + morphMs;
        let e = 0;
        let spin = -1;
        let check = 0;
        let phase = 0;
        if (u < t1) { e = 0; }
        else if (u < t2) { e = easeInOutPow((u - t1) / morphMs, ease); phase = 1; }
        else if (u < t3) { e = 1; spin = (u - t2) / spinMs; phase = 1; }
        else if (u < t4) { e = 1; phase = 1; }
        else if (u < t5) { e = 1 - easeInOutPow((u - t4) / morphMs, ease); phase = 1; check = clamp01((u - t4) / morphMs - 0.35) / 0.65; }
        else { e = 0; check = 1; phase = 2; }
        return { r: boxR + (ringR - boxR) * e, rot: e * Math.PI * 0.5, e: e, spin: spin, check: check, phase: phase, total: t5 };
    }
    function clamp01(v: number): number { return v < 0 ? 0 : (v > 1 ? 1 : v); }
    // PURE-END
    const make: Make = (inp, reduce) => {
        const rowT: number[] = [];
        const startAt = [0, 100, 200];
        let cur = 0;
        let t = 0;
        function shapeOf(k: number): RowShape {
            return rowShape(rowT[k], BOX_R, RING_R, MORPH_MS, SPIN_MS, PASS_DELAY, IDLE_MS, MORPH_EASE);
        }
        function clear(): void {
            rowT.length = 0;
            for (let k = 0; k < ROWS; k += 1) { rowT.push(-1); }
        }
        clear();
        function begin(k: number): void {
            if (reduce) {
                // 움직임 줄이기: 중간 모양 없이 끝 상태와 처음 상태만 번갈아 보인다
                rowT[k] = rowT[k] >= shapeOf0().total ? -1 : shapeOf0().total;
                return;
            }
            rowT[k] = 0;
        }
        function shapeOf0(): RowShape { return rowShape(0, BOX_R, RING_R, MORPH_MS, SPIN_MS, PASS_DELAY, IDLE_MS, MORPH_EASE); }
        function rowY(k: number): number { return 62 + k * 88; }
        const scene: Scene = {
            CYCLE: 126,
            REDUCE_TICKS: 100,
            reset() { clear(); },
            auto(clk) {
                for (let k = 0; k < ROWS; k += 1) {
                    if (clk === 4 + Math.round(startAt[k] / FIXED_DT)) { rowT[k] = 0; }
                }
            },
            step() {
                t += 1;
                for (let k = 0; k < ROWS; k += 1) {
                    if (rowT[k] >= 0) { rowT[k] = Math.min(rowT[k] + FIXED_DT, shapeOf0().total + 1); }
                }
            },
            draw(ctx) {
                ctx.fillStyle = rgba(BG, 1);
                ctx.fillRect(0, 0, W, H);
                ctx.font = 'bold 22px "Segoe UI", "Noto Sans KR", sans-serif';
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'left';
                for (let k = 0; k < ROWS; k += 1) {
                    const y = rowY(k);
                    ctx.fillStyle = rgba(PANEL, 1);
                    rrect(ctx, 20, y - 40, W - 40, 80, 16);
                    ctx.fill();
                    const s = rowT[k] < 0 ? null : shapeOf(k);
                    const e = s ? s.e : 0;
                    const r = s ? s.r : BOX_R;
                    const rot = s ? s.rot : 0;
                    const check = s ? s.check : 0;
                    const col = s ? (s.phase === 2 ? MINT : (s.spin >= 0 ? LILAC : mix(CREAM, SKY, e))) : CREAM;
                    // 칸 - 모서리 반경이 커져 고리가 되고 회전각이 함께 따라온다
                    ctx.save();
                    ctx.translate(BX, y);
                    ctx.rotate(rot);
                    const fill = clamp(check * (1 - e), 0, 1);
                    if (fill > 0) {
                        ctx.fillStyle = rgba(MINT, fill);
                        rrect(ctx, -32, -32, 64, 64, r);
                        ctx.fill();
                    }
                    ctx.lineWidth = 5 - e * 1.5;
                    ctx.strokeStyle = rgba(col, 1);
                    rrect(ctx, -32, -32, 64, 64, r);
                    ctx.stroke();
                    ctx.restore();
                    if (s && s.spin >= 0) {
                        // 호 - 고리 안쪽을 한 바퀴 반 돈다
                        const a0 = s.spin * PI2 * 1.5;
                        ctx.lineWidth = 6;
                        ctx.lineCap = 'round';
                        ctx.strokeStyle = rgba(CREAM, 1);
                        ctx.beginPath();
                        ctx.arc(BX, y, 20, a0, a0 + 1.7);
                        ctx.stroke();
                    }
                    if (check > 0) {
                        // 체크 - 두 꼭짓점을 이은 꺾은선을 진행도만큼만 그린다
                        const p1 = [BX - 14, y + 1];
                        const p2 = [BX - 4, y + 12];
                        const p3 = [BX + 16, y - 12];
                        const l1 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
                        const l2 = Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
                        const run = (l1 + l2) * clamp(check, 0, 1);
                        ctx.lineWidth = 7;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.strokeStyle = rgba(BG, 1);
                        ctx.beginPath();
                        ctx.moveTo(p1[0], p1[1]);
                        if (run <= l1) {
                            ctx.lineTo(lerp(p1[0], p2[0], run / l1), lerp(p1[1], p2[1], run / l1));
                        }
                        else {
                            ctx.lineTo(p2[0], p2[1]);
                            const q = (run - l1) / l2;
                            ctx.lineTo(lerp(p2[0], p3[0], q), lerp(p2[1], p3[1], q));
                        }
                        ctx.stroke();
                    }
                    const word = !s ? TXT_WAIT : (s.phase === 2 ? TXT_PASSED : TXT_CHECKING);
                    ctx.fillStyle = rgba(s && s.phase === 2 ? MINT : CREAM, s ? 1 : 0.7);
                    ctx.fillText(word, 168, y);
                    // 오른쪽 진행 막대
                    const prog = s ? clamp(rowT[k] / s.total, 0, 1) : 0;
                    ctx.fillStyle = rgba(CREAM, 0.22);
                    rrect(ctx, 320, y - 5, 120, 10, 5);
                    ctx.fill();
                    ctx.fillStyle = rgba(s && s.phase === 2 ? MINT : LILAC, 1);
                    rrect(ctx, 320, y - 5, Math.max(0, 120 * prog), 10, 5);
                    ctx.fill();
                    if (inp.key && inp.focus && cur === k) {
                        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
                        ctx.lineWidth = 2.5;
                        rrect(ctx, 22, y - 38, W - 44, 76, 14);
                        ctx.stroke();
                    }
                }
            },
            label() {
                let p = 0;
                for (let k = 0; k < ROWS; k += 1) {
                    if (rowT[k] >= 0 && shapeOf(k).phase === 2) { p += 1; }
                }
                return TXT_COUNT.replace('{p}', String(p)).replace('{n}', String(ROWS));
            },
            down(x, y) {
                for (let k = 0; k < ROWS; k += 1) {
                    if (Math.abs(y - rowY(k)) <= 40) { cur = k; begin(k); }
                }
            },
            move() { return; },
            up() { return; },
            key(k) {
                if (k === 'ArrowUp') { cur = Math.max(0, cur - 1); return true; }
                if (k === 'ArrowDown') { cur = Math.min(ROWS - 1, cur + 1); return true; }
                if (k === 'Enter' || k === ' ') { begin(cur); return true; }
                return false;
            },
        };
        return scene;
    };

    return mount(root, make);
  }, []);

  return (
      <div className={cx("cp") + " is-demo"} id="cp" ref={rootRef}>
      <canvas className={cx("cp__canvas")} data-role="canvas" width="480" height="300" tabIndex={0} aria-label="체크 칸이 고리로 바뀌어 돌다가 체크 표시로 이어지는 확인 버튼"></canvas>
      <p className={cx("cp__status")} data-role="status" aria-live="polite">시연 준비 중</p>
      <button className={cx("cp__btn")} data-role="btn" type="button">멈춤</button>
      </div>
  );
}
