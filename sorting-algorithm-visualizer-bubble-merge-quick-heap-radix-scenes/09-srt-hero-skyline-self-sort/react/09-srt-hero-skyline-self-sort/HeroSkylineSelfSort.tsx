// HeroSkylineSelfSort - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./HeroSkylineSelfSort.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function HeroSkylineSelfSort() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    // 무대 좌표 — 캔버스 안 계산은 늘 480×300. 화면에 보이는 크기와 상관없다
    const W = 480;
    const H = 300;
    const TAU = Math.PI * 2;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function ease(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    // 시드 고정 난수 — 선형 합동 생성기(곱 1664525, 더함 1013904223). 같은 시드면 같은 배열
    function seeded(seed: number): () => number {
        let s = (seed >>> 0) || 1;
        return function (): number {
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }
    // 1 부터 n 까지를 한 번씩 담아 섞는다 — 같은 값이 두 번 나오지 않아 막대 높이가 모두 다르다
    function shuffled(n: number, seed: number): number[] {
        const rng = seeded(seed);
        const a: number[] = [];
        for (let i = 0; i < n; i += 1) { a.push(i + 1); }
        for (let i = n - 1; i > 0; i -= 1) {
            const j = Math.floor(rng() * (i + 1));
            const t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    // 파스텔 팔레트 — 바탕은 연한 라벤더 크림, 막대는 하늘색에서 분홍으로 가는 값 그라디언트
    const BG_TOP: RGB = [248, 244, 252];
    const BG_BOT: RGB = [228, 234, 250];
    const WATER: RGB = [168, 206, 244];
    const ROSE: RGB = [240, 150, 176];
    const MINT: RGB = [150, 214, 190];
    const BUTTER: RGB = [250, 224, 140];
    const LAV: RGB = [188, 172, 236];
    const INK: RGB = [40, 36, 54];
    const PAPER: RGB = [250, 246, 240];
    const NIGHT_TOP: RGB = [38, 44, 86];
    const NIGHT_BOT: RGB = [78, 88, 140];
    const DAWN_TOP: RGB = [176, 196, 240];
    const DAWN_BOT: RGB = [252, 218, 200];
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    // 값 하나의 색 — 작은 값은 하늘색, 큰 값은 분홍. 정렬이 되면 색이 매끈한 띠가 된다
    function barColor(v: number, n: number): RGB { return mix(WATER, ROSE, (v - 1) / Math.max(1, n - 1)); }
    // 색상환 색 — 색 자체가 값이라 채도를 살린다(파스텔 변환 대상이 아닌 기능색)
    function hueColor(h: number): RGB {
        const s = 0.62;
        const l = 0.74;
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        function ch(t: number): number {
            let u = t;
            if (u < 0) { u += 1; }
            if (u > 1) { u -= 1; }
            if (u < 1 / 6) { return p + (q - p) * 6 * u; }
            if (u < 1 / 2) { return q; }
            if (u < 2 / 3) { return p + (q - p) * (2 / 3 - u) * 6; }
            return p;
        }
        return [ch(h + 1 / 3) * 255, ch(h) * 255, ch(h - 1 / 3) * 255];
    }

    // ── 걸음 목록 — 정렬을 실제로 돌려 얻은 비교·교환·쓰기 기록. 화면과 계수기는 이 목록에서만 나온다 ──
    const CMP = 0;
    const SWP = 1;
    const SET = 2;
    const MOV = 3;
    const FIX = 4;
    const LIFT = 5;
    const SHF = 6;
    const DROP = 7;
    const PIV = 8;
    const SPLIT = 9;
    const MRG = 10;
    const DRP = 11;
    const TAK = 12;
    const PASS = 13;
    const TICK = 14;
    const PHASE = 15;
    type Step = { k: number; a: number; b: number; i: number; j: number; lo: number; hi: number; v: number };
    function mk(k: number, a: number, b: number, i: number = -1, j: number = -1, lo: number = -1, hi: number = -1, v: number = 0): Step {
        return { k: k, a: a, b: b, i: i, j: j, lo: lo, hi: hi, v: v };
    }
    function swapAt(a: number[], i: number, j: number): void { const t = a[i]; a[i] = a[j]; a[j] = t; }
    // 시간을 쓰지 않는 표식 걸음 — 비교도 이동도 아니다
    function isMeta(k: number): boolean { return k === FIX || k === SPLIT || k === MRG || k === PASS || k === PHASE || k === PIV; }

    // 거품 — 이웃 둘을 비교해 앞이 크면 맞바꾼다. 한 바퀴마다 가장 큰 값이 끝에 놓인다
    function bubbleSteps(v0: number[]): Step[] {
        const a = v0.slice();
        const out: Step[] = [];
        let end = a.length - 1;
        while (end > 0) {
            let swapped = false;
            for (let i = 0; i < end; i += 1) {
                out.push(mk(CMP, i, i + 1, -1, -1, 0, end));
                if (a[i] > a[i + 1]) {
                    swapAt(a, i, i + 1);
                    out.push(mk(SWP, i, i + 1, -1, -1, 0, end));
                    swapped = true;
                }
            }
            out.push(mk(FIX, end, 0));
            if (swapped) {
                end -= 1;
            } else {
                // 한 바퀴 동안 맞바꿈이 없으면 앞쪽도 이미 정렬된 것
                for (let k = end - 1; k >= 0; k -= 1) { out.push(mk(FIX, k, 0)); }
                end = 0;
            }
        }
        out.push(mk(FIX, 0, 0));
        return out;
    }
    // 삽입 — i 번째를 들어 올리고(LIFT), 왼쪽이 더 크면 한 칸씩 오른쪽으로 민 뒤(SHF) 빈 틈에 내린다(DROP)
    function insertionSteps(v0: number[]): Step[] {
        const a = v0.slice();
        const out: Step[] = [];
        for (let i = 1; i < a.length; i += 1) {
            out.push(mk(LIFT, i, 0, -1, -1, 0, i));
            const key = a[i];
            let j = i;
            while (j > 0) {
                out.push(mk(CMP, j - 1, i, -1, -1, 0, i));
                if (a[j - 1] > key) {
                    a[j] = a[j - 1];
                    out.push(mk(SHF, j - 1, j, -1, -1, 0, i));
                    j -= 1;
                } else {
                    break;
                }
            }
            a[j] = key;
            out.push(mk(DROP, j, 0, -1, -1, 0, i));
        }
        return out;
    }
    // 병합 — 위에서 반씩 갈라 내려 보내고(SPLIT), 아래에서부터 두 줄의 앞을 비교해 작은 쪽을 위층에 쓴다(SET). i 필드가 층 번호
    function mergeSteps(v0: number[]): Step[] {
        const n = v0.length;
        const out: Step[] = [];
        function deep(lo: number, hi: number, lv: number): number {
            if (hi - lo < 2) { return lv; }
            const mid = (lo + hi) >> 1;
            return Math.max(deep(lo, mid, lv + 1), deep(mid, hi, lv + 1));
        }
        const depth = deep(0, n, 0);
        const lv: number[][] = [];
        for (let l = 0; l <= depth; l += 1) { lv.push(v0.slice()); }
        for (let l = 0; l < depth; l += 1) { out.push(mk(SPLIT, l, 0, l)); }
        function sort(lo: number, hi: number, l: number): void {
            if (hi - lo < 2) { return; }
            const mid = (lo + hi) >> 1;
            sort(lo, mid, l + 1);
            sort(mid, hi, l + 1);
            out.push(mk(MRG, lo, hi, l, -1, lo, hi));
            const src = lv[l + 1];
            const dst = lv[l];
            let ii = lo;
            let jj = mid;
            let p = lo;
            while (ii < mid && jj < hi) {
                out.push(mk(CMP, ii, jj, l, -1, lo, hi));
                if (src[ii] <= src[jj]) {
                    dst[p] = src[ii];
                    out.push(mk(SET, p, ii, l, -1, lo, hi, src[ii]));
                    ii += 1;
                } else {
                    dst[p] = src[jj];
                    out.push(mk(SET, p, jj, l, -1, lo, hi, src[jj]));
                    jj += 1;
                }
                p += 1;
            }
            while (ii < mid) { dst[p] = src[ii]; out.push(mk(SET, p, ii, l, -1, lo, hi, src[ii])); ii += 1; p += 1; }
            while (jj < hi) { dst[p] = src[jj]; out.push(mk(SET, p, jj, l, -1, lo, hi, src[jj])); jj += 1; p += 1; }
        }
        sort(0, n, 0);
        return out;
    }
    // 퀵 — 구간 맨 앞을 기준으로 세우고(PIV), 왼쪽 포인터는 큰 값을 찾고 오른쪽 포인터는 작은 값을 찾아 맞바꾼다. 만나면 기준을 내려놓는다
    function quickSteps(v0: number[]): Step[] {
        const a = v0.slice();
        const out: Step[] = [];
        function qs(lo: number, hi: number): void {
            if (lo > hi) { return; }
            if (lo === hi) { out.push(mk(FIX, lo, 0, -1, -1, lo, hi)); return; }
            const p = a[lo];
            let i = lo + 1;
            let j = hi;
            out.push(mk(PIV, lo, 0, i, j, lo, hi));
            for (;;) {
                while (i <= j) {
                    out.push(mk(CMP, i, lo, i, j, lo, hi));
                    if (a[i] <= p) { i += 1; } else { break; }
                }
                while (i <= j) {
                    out.push(mk(CMP, j, lo, i, j, lo, hi));
                    if (a[j] > p) { j -= 1; } else { break; }
                }
                if (i < j) {
                    swapAt(a, i, j);
                    out.push(mk(SWP, i, j, i, j, lo, hi));
                    i += 1;
                    j -= 1;
                } else {
                    break;
                }
            }
            if (j > lo) {
                swapAt(a, lo, j);
                out.push(mk(SWP, lo, j, j, j, lo, hi));
            }
            out.push(mk(FIX, j, 0, -1, -1, lo, hi));
            qs(lo, j - 1);
            qs(j + 1, hi);
        }
        qs(0, a.length - 1);
        return out;
    }
    // 힙 — 배열을 이진 트리로 읽는다(자식은 2i+1·2i+2). 먼저 힙을 세우고, 최댓값을 맨 끝으로 빼내며 다시 내려 보낸다. hi 필드가 힙 크기
    function heapSteps(v0: number[]): Step[] {
        const a = v0.slice();
        const out: Step[] = [];
        function sift(start: number, size: number): void {
            let root = start;
            for (;;) {
                let child = 2 * root + 1;
                if (child >= size) { break; }
                if (child + 1 < size) {
                    out.push(mk(CMP, child, child + 1, -1, -1, root, size));
                    if (a[child + 1] > a[child]) { child += 1; }
                }
                out.push(mk(CMP, root, child, -1, -1, root, size));
                if (a[root] < a[child]) {
                    swapAt(a, root, child);
                    out.push(mk(SWP, root, child, -1, -1, root, size));
                    root = child;
                } else {
                    break;
                }
            }
        }
        const n = a.length;
        for (let s = (n >> 1) - 1; s >= 0; s -= 1) { sift(s, n); }
        out.push(mk(PHASE, 1, 0));
        for (let end = n - 1; end > 0; end -= 1) {
            swapAt(a, 0, end);
            out.push(mk(SWP, 0, end, -1, -1, 0, end + 1));
            out.push(mk(FIX, end, 0));
            sift(0, end);
        }
        out.push(mk(FIX, 0, 0));
        return out;
    }
    // 선택 — 남은 구간에서 가장 작은 값을 찾아(CMP 로 훑는다) 맨 앞과 맞바꾼다. lo 필드가 구간 시작
    function selectionSteps(v0: number[]): Step[] {
        const a = v0.slice();
        const out: Step[] = [];
        for (let i = 0; i < a.length - 1; i += 1) {
            let m = i;
            for (let j = i + 1; j < a.length; j += 1) {
                out.push(mk(CMP, j, m, -1, -1, i, a.length));
                if (a[j] < a[m]) { m = j; }
            }
            if (m !== i) {
                swapAt(a, i, m);
                out.push(mk(SWP, i, m, -1, -1, i, a.length));
            }
            out.push(mk(FIX, i, 0));
        }
        out.push(mk(FIX, a.length - 1, 0));
        return out;
    }
    // 기수 — 자리 숫자(일·십·백)마다 통 열 개에 붓고(DRP) 0번 통부터 차례로 꺼낸다(TAK). 값끼리 비교하지 않는다
    function radixSteps(v0: number[], digits: number): Step[] {
        let row = v0.slice();
        const out: Step[] = [];
        let place = 1;
        for (let pass = 0; pass < digits; pass += 1) {
            out.push(mk(PASS, pass, 0, pass));
            const buckets: number[][] = [];
            for (let d = 0; d < 10; d += 1) { buckets.push([]); }
            for (let s = 0; s < row.length; s += 1) {
                const d = Math.floor(row[s] / place) % 10;
                buckets[d].push(row[s]);
                out.push(mk(DRP, s, d, pass, -1, -1, -1, row[s]));
            }
            const next: number[] = [];
            for (let d = 0; d < 10; d += 1) {
                for (const x of buckets[d]) {
                    out.push(mk(TAK, next.length, d, pass, -1, -1, -1, x));
                    next.push(x);
                }
            }
            row = next;
            place *= 10;
        }
        return out;
    }
    // 혼합 — 짧은 구간(RUN 칸)은 삽입으로 정렬하고, 정렬된 구간 둘을 병합으로 합친다. 이동은 MOV(from → to) 한 걸음
    function hybridSteps(v0: number[], run: number): Step[] {
        const a = v0.slice();
        const out: Step[] = [];
        const n = a.length;
        function move(from: number, to: number, lo: number, hi: number): void {
            const x = a.splice(from, 1)[0];
            a.splice(to, 0, x);
            out.push(mk(MOV, from, to, -1, -1, lo, hi));
        }
        for (let lo = 0; lo < n; lo += run) {
            const hi = Math.min(lo + run, n);
            for (let i = lo + 1; i < hi; i += 1) {
                let p = i;
                while (p > lo) {
                    out.push(mk(CMP, p - 1, i, -1, -1, lo, hi));
                    if (a[p - 1] > a[i]) { p -= 1; } else { break; }
                }
                if (p < i) { move(i, p, lo, hi); }
            }
        }
        for (let w = run; w < n; w *= 2) {
            for (let lo = 0; lo + w < n; lo += 2 * w) {
                let mid = lo + w;
                const hi = Math.min(lo + 2 * w, n);
                let i = lo;
                let j = mid;
                while (i < mid && j < hi) {
                    out.push(mk(CMP, i, j, -1, -1, lo, hi));
                    if (a[i] <= a[j]) {
                        i += 1;
                    } else {
                        move(j, i, lo, hi);
                        i += 1;
                        mid += 1;
                        j += 1;
                    }
                }
            }
        }
        out.push(mk(FIX, 0, 0));
        return out;
    }
    // 걸음 목록에서 비교 횟수와 이동 횟수(교환·밀기·쓰기) 를 센다
    function countOf(steps: Step[]): { c: number; m: number } {
        let c = 0;
        let m = 0;
        for (const s of steps) {
            if (s.k === CMP) { c += 1; } else if (s.k === SWP || s.k === SET || s.k === MOV || s.k === SHF) { m += 1; }
        }
        return { c: c, m: m };
    }
    // 값 배열 하나에 걸음을 그대로 적용한다 — 같은 걸음 목록이 막대 열을 되살린다
    type Lane = { a: number[]; key: number };
    function applyLane(L: Lane, s: Step): void {
        if (s.k === SWP) { swapAt(L.a, s.a, s.b); } else if (s.k === SET) { L.a[s.a] = s.v; } else if (s.k === SHF) { L.a[s.b] = L.a[s.a]; } else if (s.k === LIFT) { L.key = L.a[s.a]; } else if (s.k === DROP) { L.a[s.a] = L.key; } else if (s.k === MOV) {
            const x = L.a.splice(s.a, 1)[0];
            L.a.splice(s.b, 0, x);
        }
    }
    function isSorted(a: number[]): boolean {
        for (let i = 1; i < a.length; i += 1) { if (a[i - 1] > a[i]) { return false; } }
        return true;
    }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const padEl = root.querySelector('[data-role="pad"]') as HTMLElement | null;
    const pauseEl = root.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const stepEl = root.querySelector('[data-role="step"]') as HTMLButtonElement | null;
    const doneEl = root.querySelector('[data-role="done"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !pauseEl || !padEl || !stepEl || !doneEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const pauseBtn: HTMLButtonElement = pauseEl;
    const stepBtn: HTMLButtonElement = stepEl;
    const doneP: HTMLElement = doneEl;
    const pad: HTMLElement = padEl;
    // 외부 웹폰트는 부르지 않는다 — 기기에 있는 글꼴 목록만
    const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
    let dpr = 1;
    function fitCanvas(): void {
        // 배율은 2 에서 자른다 — 배율 3 기기에서 화소가 2.25배로 늘지 않게
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function skyFill(top: RGB, bot: RGB): void {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, rgba(top, 1));
        g.addColorStop(1, rgba(bot, 1));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }
    function disc(x: number, y: number, r: number, c: RGB, a: number): void {
        if (r <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
    }
    function ring(x: number, y: number, r: number, width: number, c: RGB, a: number): void {
        if (r <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.lineWidth = width;
        ctx.strokeStyle = rgba(c, a);
        ctx.stroke();
    }
    function seg(x1: number, y1: number, x2: number, y2: number, width: number, c: RGB, a: number): void {
        if (a <= 0) { return; }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(c, a);
        ctx.stroke();
    }
    function box(x: number, y: number, w: number, h: number, r: number, c: RGB, a: number): void {
        if (w <= 0.2 || h <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
    }
    function text(s: string, x: number, y: number, c: RGB, a: number, px: number, weight: number, align: CanvasTextAlign): void {
        ctx.font = weight + ' ' + px + 'px ' + FONT_STACK;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(c, a);
        ctx.fillText(s, x, y);
    }
    // 글자 이름표 — 바탕 알약 위에 글자
    function tag(s: string, x: number, y: number, bg: RGB, fg: RGB, px: number, align: CanvasTextAlign): void {
        ctx.font = '700 ' + px + 'px ' + FONT_STACK;
        const w = ctx.measureText(s).width + px * 1.1;
        const left = align === 'center' ? x - w / 2 : (align === 'right' ? x - w : x);
        box(left, y - px * 0.82, w, px * 1.64, px * 0.82, bg, 0.92);
        text(s, left + w / 2, y + 0.5, fg, 1, px, 700, 'center');
    }
    // 장면 시계(초) — 장면 계산이 고치고 화면 쪽이 읽는다
    let sceneT = 0;
    // 스프링 한 개 — x 는 지금 값, v 는 속도
    type Sp = { x: number; v: number };
    function newSp(x: number): Sp { return { x: x, v: 0 }; }
    // 목표로 당기는 힘 w²·(목표−x) 와 속도를 깎는 힘 2·z·w·v. 한 프레임을 네 토막으로 적분해 큰 dt 에서도 터지지 않는다
    function spr(s: Sp, target: number, dt: number, w: number, z: number): void {
        const h = dt / 4;
        for (let k = 0; k < 4; k += 1) {
            s.v += (w * w * (target - s.x) - 2 * z * w * s.v) * h;
            s.x += s.v * h;
        }
    }
    // 정렬이 끝난 뒤 완성 장면을 보여 주는 시간(초). 지나면 다음 판이 처음부터 시작
    const HOLD_S = 1.6;
    // 걸음 재생기 — 걸음 목록 한 줄을 시간표대로 적용한다. 계수기는 적용한 걸음에서만 센다
    let steps: Step[] = [];
    let at = 0;
    let acc = 0;
    let cmpN = 0;
    let movN = 0;
    let holdT = 0;
    let lap = 0;
    function countStep(s: Step): void {
        if (s.k === CMP) { cmpN += 1; } else if (s.k === SWP || s.k === SET || s.k === MOV || s.k === SHF) { movN += 1; }
    }
    function isDone(): boolean { return at >= steps.length; }
    // 지금 걸음의 진행(0~1) — 걸음이 끝나면 1
    function stepFrac(): number { return at < steps.length ? clamp(acc / stepDur(steps[at]), 0, 1) : 1; }
    function runOne(): void {
        const s = steps[at];
        countStep(s);
        applyOne(s);
        at += 1;
    }
    function runTo(n: number): void {
        while (at < n && at < steps.length) { runOne(); }
    }
    // 판 시작 — 첫 판(lap 0)은 START_FRAC 만큼 앞의 걸음을 미리 적용해 정렬 중간에서 보여 준다
    function begin(): void {
        sceneT = 0;
        at = 0;
        acc = 0;
        cmpN = 0;
        movN = 0;
        holdT = 0;
        build();
        if (lap === 0) { runTo(Math.floor(steps.length * START_FRAC)); }
        snap();
    }
    function advance(dt: number): void {
        sceneT += dt;
        if (at < steps.length) {
            acc += dt;
            while (at < steps.length && acc >= stepDur(steps[at])) {
                acc -= stepDur(steps[at]);
                runOne();
            }
        } else {
            holdT += dt;
            if (holdT >= HOLD_S) { lap += 1; begin(); }
        }
        update(dt);
    }
    let shownStatus = '';
    function pushStatus(s: string): void {
        if (!statusEl || s === shownStatus) { return; }
        shownStatus = s;
        statusEl.textContent = s;
    }
    // ── 09 무너진 도시 윤곽이 스스로 정렬돼 계단이 되는 히어로 ───────────────────────────
    // 건물 수
    const BUILDINGS = 16;
    // 처음에 삽입 정렬로 줄 세우는 묶음 크기 — 이 크기로 나눠 삽입한 뒤 묶음끼리 병합으로 합친다
    const RUN = 4;
    // 비교 한 걸음, 건물 하나가 자리를 옮기는 걸음의 길이(ms)
    const STEP_MS = 70;
    const MOVE_MS = 260;
    const SEED = 4939;
    const START_FRAC = 0.45;
    const SPRING_W = 22;
    const SPRING_Z = 0.6;
    const BASE_Y = 262;
    const MAX_H = 150;
    const MIN_H = 34;
    const GAP = 2;
    const BODY: RGB = [58, 54, 98];
    const BODY_DAWN: RGB = [158, 148, 198];
    const LAMP: RGB = [255, 232, 168];
    const SUN: RGB = [255, 214, 170];
    let vals: number[] = [];
    let widths: number[] = [];
    let lit: number[][] = [];
    let stars: number[][] = [];
    let row: number[] = [];
    let sx: Sp[] = [];
    let sky: Sp = newSp(0);
    let hotA = -1;
    let hotB = -1;
    function build(): void {
        const rng = seeded(SEED + lap * 7);
        vals = shuffled(BUILDINGS, SEED + lap * 7);
        widths = [];
        let sum = 0;
        for (let i = 0; i < BUILDINGS; i += 1) {
            const w = 14 + Math.floor(rng() * 14);
            widths.push(w);
            sum += w;
        }
        // 합이 무대 폭에 딱 맞게 늘이거나 줄인다
        const k = (W - 44 - GAP * (BUILDINGS - 1)) / sum;
        widths = widths.map(function (w: number): number { return w * k; });
        lit = [];
        for (let i = 0; i < BUILDINGS; i += 1) {
            const cells: number[] = [];
            for (let c = 0; c < 80; c += 1) { cells.push(rng()); }
            lit.push(cells);
        }
        stars = [];
        for (let i = 0; i < 28; i += 1) { stars.push([rng() * W, rng() * 150, 0.5 + rng() * 1.2, rng()]); }
        row = [];
        sx = [];
        for (let i = 0; i < BUILDINGS; i += 1) { row.push(i); sx.push(newSp(0)); }
        for (let p = 0; p < BUILDINGS; p += 1) { sx[row[p]].x = slotX(p); }
        steps = hybridSteps(vals, RUN);
        sky = newSp(0);
        hotA = -1;
        hotB = -1;
    }
    // 위치 p 에 놓인 건물의 왼쪽 x — 앞에 선 건물들의 폭을 모두 더한다
    function slotX(p: number): number {
        let x = 22;
        for (let q = 0; q < p; q += 1) { x += widths[row[q]] + GAP; }
        return x;
    }
    function barH(v: number): number { return MIN_H + ((v - 1) / (BUILDINGS - 1)) * MAX_H; }
    function stepDur(s: Step): number { return s.k === MOV ? MOVE_MS / 1000 : STEP_MS / 1000; }
    function applyOne(s: Step): void {
        if (s.k === CMP) {
            hotA = row[s.a];
            hotB = row[s.b];
        } else if (s.k === MOV) {
            const id = row.splice(s.a, 1)[0];
            row.splice(s.b, 0, id);
            hotA = id;
            hotB = -1;
        }
    }
    function snap(): void {
        for (let p = 0; p < BUILDINGS; p += 1) { sx[row[p]].x = slotX(p); sx[row[p]].v = 0; }
        sky.x = at / Math.max(1, steps.length);
        sky.v = 0;
    }
    function update(dt: number): void {
        for (let p = 0; p < BUILDINGS; p += 1) { spr(sx[row[p]], slotX(p), dt, SPRING_W, SPRING_Z); }
        spr(sky, at / Math.max(1, steps.length), dt, 6, 1);
    }
    function draw(): void {
        const t = ease(clamp(sky.x, 0, 1));
        skyFill(mix(NIGHT_TOP, DAWN_TOP, t), mix(NIGHT_BOT, DAWN_BOT, t));
        // 별 — 정렬이 진행될수록 사라진다
        for (const st of stars) {
            const a = clamp(1 - t * 1.5, 0, 1) * (0.5 + 0.5 * Math.sin(sceneT * 1.4 + st[3] * TAU));
            disc(st[0], st[1], st[2], PAPER, a * 0.85);
        }
        // 해 — 진행률 따라 아래에서 올라온다
        const sy = lerp(318, 112, t);
        disc(388, sy, 62, SUN, 0.18 * t);
        disc(388, sy, 40, SUN, 0.3 * t);
        disc(388, sy, 24, SUN, 0.95 * Math.min(1, t * 1.6));
        box(0, BASE_Y, W, H - BASE_Y, 0, mix([44, 40, 76], [110, 100, 156], t * 0.6), 1);
        const body = mix(BODY, BODY_DAWN, t * 0.6);
        for (let pass = 0; pass < 2; pass += 1) {
            for (let id = 0; id < BUILDINGS; id += 1) {
                const moving = Math.abs(slotX(row.indexOf(id)) - sx[id].x);
                // 자리를 옮기는 건물은 위로 살짝 떠 이웃 위를 건너간다
                const lift = -Math.min(18, moving * 0.2);
                if ((moving > 3 ? 1 : 0) !== pass) { continue; }
                const w = widths[id];
                const h = barH(vals[id]);
                const x = sx[id].x;
                const y = BASE_Y - h + lift;
                const isHot = id === hotA || id === hotB;
                box(x, y, w, h + 2, 2, isHot ? mix(body, BUTTER, 0.22) : body, 1);
                if (isHot) {
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = rgba(BUTTER, 0.95);
                    ctx.beginPath();
                    ctx.roundRect(x, y, w, h + 2, 2);
                    ctx.stroke();
                }
                // 창문 — 창문마다 정해진 난수가 문턱(0.55 에서 하늘이 밝아질수록 0.35 까지 내려감)보다 작으면 켜지고, 비교 중인 건물은 전부 켜진다
                const cols = Math.max(1, Math.floor((w - 4) / 7));
                const rows = Math.floor((h - 10) / 11);
                for (let r = 0; r < rows; r += 1) {
                    for (let c = 0; c < cols; c += 1) {
                        const on = isHot || lit[id][(r * 5 + c) % 80] < 0.55 - t * 0.2;
                        if (!on) { continue; }
                        box(x + 3 + c * 7, y + 6 + r * 11, 4.5, 6.5, 1, LAMP, isHot ? 1 : 0.8);
                    }
                }
            }
        }
    }
    function statusText(): string {
        if (isDone()) { return '정렬 완료 — 비교 {c}회 · 옮긴 건물 {s}채'.replace('{c}', String(cmpN)).replace('{s}', String(movN)); }
        return '비교 {c}회 · 옮긴 건물 {s}채'.replace('{c}', String(cmpN)).replace('{s}', String(movN));
    }
    let paused = false;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 움직임 줄이기 설정을 바꿔도 change 리스너가 다시 읽는다
    let still = reduceQuery.matches;
    // 자동 시연 표시 — 사람이 처음 손대면 떼고 상태 줄을 polite 로 켠다
    let demo = root.classList.contains('is-demo');
    const off = new AbortController();
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
        if (statusEl) { statusEl.setAttribute('aria-live', 'polite'); }
    }
    // 한 판이 끝났음을 스크린리더에 한 번만 알린다 — 판이 되풀이돼도 다시 읽지 않는다
    let doneSaid = false;
    function checkDone(): void {
        if (isDone() && !doneSaid) {
            doneSaid = true;
            doneP.textContent = statusText();
        }
    }
    // 한 프레임에 넘기는 시간 상한(초) — 오래 숨었다 돌아온 첫 프레임도 50ms 까지만 계산에 넣는다
    const DT_MAX = 0.05;
    // 한 걸음 버튼 뒤 스프링이 자리 잡도록 미리 흘려보내는 시간
    const SETTLE_FRAMES = 14;
    const SETTLE_DT = 0.04;
    function showNow(): void {
        draw();
        pushStatus(statusText());
        checkDone();
    }
    let rafId = 0;
    let lastTs = -1;
    function frame(ts: number): void {
        if (still || paused) { rafId = 0; return; }
        if (lastTs < 0) { lastTs = ts; }
        const dt = Math.min((ts - lastTs) / 1000, DT_MAX);
        lastTs = ts;
        if (dt > 0) { advance(dt); }
        showNow();
        rafId = window.requestAnimationFrame(frame);
    }
    function startLoop(): void {
        if (rafId) { return; }
        // 멈췄던 사이의 시간을 첫 프레임 dt 로 넘기지 않는다
        lastTs = -1;
        rafId = window.requestAnimationFrame(frame);
    }
    function stopLoop(): void {
        if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
    }
    // 움직임 줄이기 — 루프 없이 정렬이 끝난 막대 한 장
    function showRest(): void {
        stopLoop();
        lap = 0;
        begin();
        runTo(steps.length);
        snap();
        showNow();
    }
    function play(): void {
        begin();
        showNow();
        if (!paused) { startLoop(); }
    }
    function togglePause(): void {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        wake();
        if (paused) { stopLoop(); } else if (!still) { startLoop(); }
    }
    // 한 걸음 — 멈춘 채 걸음 목록을 하나만 적용한다. 끝난 판이면 다음 판을 처음부터 연다
    function stepOnce(): void {
        wake();
        if (!paused) {
            paused = true;
            pauseBtn.setAttribute('aria-pressed', 'true');
            stopLoop();
        }
        if (isDone()) {
            doneSaid = false;
            lap += 1;
            begin();
        } else {
            runOne();
            acc = 0;
        }
        for (let k = 0; k < SETTLE_FRAMES; k += 1) { update(SETTLE_DT); }
        showNow();
    }
    pauseBtn.addEventListener('click', togglePause, { signal: off.signal });
    stepBtn.addEventListener('click', stepOnce, { signal: off.signal });
    // 키보드 — 무대에 포커스가 있을 때만. Enter·Space 는 일시정지, 오른쪽 방향키는 한 걸음
    pad.addEventListener('keydown', function (e: KeyboardEvent): void {
        if (e.altKey || e.ctrlKey || e.metaKey) { return; }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePause();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            stepOnce();
        }
    }, { signal: off.signal });
    // 탭이 숨으면 멈추고, 돌아오면 시계를 다시 맞춰 시작 — 숨은 동안의 몇 초가 한 프레임에 몰리지 않게
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 바뀌면 — 켜지면 정렬 끝난 한 장, 꺼지면 다시 움직인다
    reduceQuery.addEventListener('change', function (): void {
        still = reduceQuery.matches;
        if (still) { showRest(); } else { lap = 0; play(); }
    }, { signal: off.signal });
    window.addEventListener('resize', function (): void {
        fitCanvas();
        draw();
    }, { signal: off.signal });
    fitCanvas();
    if (still) { showRest(); } else { play(); }
    return function (): void {
        stopLoop();
        off.abort();
    };
  }, []);

  return (
    <div className={cx("vj") + " is-demo"} ref={rootRef}>
        <div className={cx("vj__pad")} data-role="pad" tabIndex={0} role="application" aria-label={'정렬 시연 무대 — 누른 뒤 Enter 로 일시정지, 오른쪽 방향키로 한 걸음'}>
          <canvas className={cx("vj__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'높이와 폭이 제멋대로인 건물 열여섯 채의 스카이라인이 네 채씩 삽입으로 줄을 세운 뒤 병합으로 합쳐 키 순서의 계단 윤곽이 되고, 창문 불빛이 켜진 채 정렬이 진행될수록 하늘이 해 뜨는 색으로 밝아지는 히어로 장면'}></canvas>
        </div>
        <p className={cx("vj__status")} data-role="status" aria-live="off">{'정렬 시연'}</p>
        <div className={cx("vj__ctrl")}>
          <button className={cx("vj__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
          <button className={cx("vj__step")} data-role="step" type="button">{'한 걸음'}</button>
        </div>
        <p className={cx("vj__done")} data-role="done" role="status" aria-live="polite"></p>
    </div>
  );
}
