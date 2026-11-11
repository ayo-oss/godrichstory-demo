import { useEffect, useRef } from "react";
import styles from "./ScratchCardRevealRadialWipeLerp.module.scss";

type Press = { x: number; y: number; r: number };

export default function ScratchCardRevealRadialWipeLerp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const foilRef = useRef<HTMLCanvasElement>(null);
  const revealBtnRef = useRef<HTMLButtonElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const zone = zoneRef.current;
    const foil = foilRef.current;
    const revealBtn = revealBtnRef.current;
    const live = liveRef.current;
    if (!root || !zone || !foil || !revealBtn || !live) return;
    const ctx = foil.getContext("2d");
    if (!ctx) return;

    const FW = foil.width, FH = foil.height;
    const WIPE_TARGET_R = Math.ceil(Math.sqrt(FW * FW + FH * FH) / 2); // 카드 대각선 절반 — 어느 지점을 눌러도 끝까지 덮는다
    const WIPE_LERP_RATE = 1.5; // 확장 과정이 눈에 오래 보이도록 가속을 늦춘다

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const foilRand = seedRand(424041);

    function paintFoil() {
      ctx!.globalCompositeOperation = "source-over";
      ctx!.clearRect(0, 0, FW, FH);
      const grad = ctx!.createLinearGradient(0, 0, FW, FH);
      grad.addColorStop(0, "#dfe3ea");
      grad.addColorStop(.5, "#f4f6f9");
      grad.addColorStop(1, "#c9ced8");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, FW, FH);
      ctx!.strokeStyle = "rgba(23,20,26,.14)";
      ctx!.lineWidth = 1;
      for (let i = 0; i < 18; i += 1) {
        const x = foilRand() * FW, y = foilRand() * FH;
        ctx!.beginPath();
        ctx!.moveTo(x, y);
        ctx!.lineTo(x + (foilRand() * 20 - 10), y + (foilRand() * 8 - 4));
        ctx!.stroke();
      }
    }

    let press: Press | null = null;
    function wipe() {
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.beginPath();
      ctx!.arc(press!.x, press!.y, press!.r, 0, Math.PI * 2);
      ctx!.fill();
    }

    function clearedRatio() {
      const data = ctx!.getImageData(0, 0, FW, FH).data;
      let clear = 0;
      const total = data.length / 4;
      for (let i = 3; i < data.length; i += 4) { if (data[i] < 40) clear += 1; }
      return clear / total;
    }

    let opened = false;
    function openCard() {
      if (opened) return;
      opened = true;
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.fillRect(0, 0, FW, FH);
      root!.classList.add("is-open");
      live!.textContent = "할인 쿠폰이 열렸어요";
    }

    function pos(e: PointerEvent) {
      const r = foil!.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (FW / r.width), y: (e.clientY - r.top) * (FH / r.height) };
    }

    paintFoil();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let holding = false;

    function onDown(e: PointerEvent) {
      if (opened) return;
      root!.classList.remove("is-demo");
      holding = true;
      const p = pos(e);
      press = { x: p.x, y: p.y, r: 4 };
      wipe();
      zone!.setPointerCapture?.(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (!holding || opened || !press) return;
      const p = pos(e);
      press.x = p.x; press.y = p.y;
    }
    function onUp() { holding = false; }
    zone.addEventListener("pointerdown", onDown);
    zone.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    function onReveal() { root!.classList.remove("is-demo"); openCard(); }
    revealBtn.addEventListener("click", onReveal);

    // 카드 끝까지 원형 확장 → 다시 덮임 → 다른 지점에서 재확장을 한 루프 안에서 반복한다.
    const demoRand = seedRand(424042);
    const DEMO_POINTS: Array<{ x: number; y: number }> = [
      { x: FW * (0.30 + demoRand() * 0.08), y: FH * (0.36 + demoRand() * 0.08) },
      { x: FW * (0.66 + demoRand() * 0.08), y: FH * (0.58 + demoRand() * 0.08) },
      { x: FW * (0.42 + demoRand() * 0.08), y: FH * (0.30 + demoRand() * 0.08) }
    ];
    const DEMO_STARTS = [220, 950, 1680];
    const DEMO_LOOP_MS = 3200;
    let demoCycle = -1;
    let demoPress: Press | null = null;

    function resetDemo() {
      opened = false;
      root!.classList.remove("is-open");
      paintFoil();
      demoCycle = -1;
      demoPress = null;
    }
    function runDemo(tMod: number, dtS: number) {
      const next = demoCycle + 1;
      if (next < DEMO_STARTS.length && tMod >= DEMO_STARTS[next]) {
        demoCycle = next;
        const p = DEMO_POINTS[demoCycle];
        demoPress = { x: p.x, y: p.y, r: 4 };
        opened = false;
        root!.classList.remove("is-open");
        paintFoil(); // 이전 사이클에서 열렸던 은박을 다시 덮는다
      }
      if (demoPress && !opened) {
        demoPress.r += (WIPE_TARGET_R - demoPress.r) * Math.min(1, WIPE_LERP_RATE * dtS);
        press = demoPress;
        wipe();
        if (clearedRatio() > .82) openCard();
      }
    }

    if (reduce) root.classList.remove("is-demo");
    let elapsed = 0;
    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      const dtS = dt / 1000;
      lastTs = ts;
      if (holding && !opened && press) {
        press.r += (WIPE_TARGET_R - press.r) * Math.min(1, WIPE_LERP_RATE * dtS);
        wipe();
        if (clearedRatio() > .82) openCard();
      }
      if (!reduce && root!.classList.contains("is-demo")) {
        elapsed += dt;
        const tMod = elapsed % DEMO_LOOP_MS;
        if (tMod < dt) resetDemo();
        runDemo(tMod, dtS);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      zone.removeEventListener("pointerdown", onDown);
      zone.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      revealBtn.removeEventListener("click", onReveal);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.scv} is-demo`} ref={rootRef}>
        <div className={styles.scv__card}>
          <p className={styles.scv__label}>스크래치 카드</p>
          <div className={styles.scv__zone} ref={zoneRef}>
            <div className={styles.scv__prize}>
              <p className={styles.scv__prizeTitle}>할인 쿠폰</p>
              <p className={styles.scv__prizeSub}>누른 지점에서 원이 점점 커져요</p>
            </div>
            <canvas className={styles.scv__foil} ref={foilRef} width={280} height={150} aria-hidden="true" />
          </div>
          <button type="button" className={styles.scv__reveal} ref={revealBtnRef}>한 번에 보기</button>
          <p className={styles.scv__live} ref={liveRef} aria-live="polite"></p>
        </div>
      </div>
    </main>
  );
}
