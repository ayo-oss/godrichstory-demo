import { useEffect, useRef, useState } from "react";
import styles from "./AmountRollSwap.module.scss";

export default function AmountRollSwap() {
  const rootRef = useRef<HTMLDivElement>(null);
  const digitsRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<HTMLButtonElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);
  const [badge, setBadge] = useState("결제 금액");
  const [ctrlLabel, setCtrlLabel] = useState("일시정지");

  useEffect(() => {
    const root = rootRef.current;
    const digitsEl = digitsRef.current;
    const ctrl = ctrlRef.current;
    const sweepEl = sweepRef.current;
    if (!root || !digitsEl || !ctrl || !sweepEl) return;

    // AMOUNT_ROLL_DIGIT_STAGGER_MS — 변형 1: 60 → 110 으로 늘리면 자릿수가 더 크게 어긋나며 굴러간다.
    const AMOUNT_ROLL_DIGIT_STAGGER_MS = 60;
    const LOOP_MS = 2000;
    const ROLL_MS = 480;
    const FROM = "08,000";
    const TO = "12,400";
    // 시연 스케줄: 2초 루프 안에 굴러가는 방향을 두 번 넣는다(증가 → 감소) — 로직·상수는 그대로,
    // 두 번째 구간은 같은 트랙(FROM/TO 두 자릿수)을 반대로 재생해 되돌아가는 롤을 보여준다.
    const SEG_DURATION = (TO.length - 1) * AMOUNT_ROLL_DIGIT_STAGGER_MS + ROLL_MS;
    const SEG2_START = 1050;

    digitsEl.innerHTML = "";
    const cols: { track: HTMLSpanElement; delay: number }[] = [];
    for (let i = 0; i < TO.length; i += 1) {
      const col = document.createElement("span");
      col.className = styles.ars__col;
      if (TO[i] === ",") col.classList.add(styles["ars__col--comma"]);
      const track = document.createElement("span");
      track.className = styles.ars__track;
      const a = document.createElement("span"); a.className = styles.ars__d; a.textContent = FROM[i];
      const b = document.createElement("span"); b.className = styles.ars__d; b.textContent = TO[i];
      track.appendChild(a); track.appendChild(b);
      col.appendChild(track);
      digitsEl.appendChild(col);
      // 계산 한 겹: 자릿수 인덱스(왼쪽부터)에 스태거를 곱해 각 컬럼의 시작 지연을 구한다.
      cols.push({ track, delay: i * AMOUNT_ROLL_DIGIT_STAGGER_MS });
    }
    function easeOutBack(t: number) {
      const c1 = 1.4, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    function progressFor(elapsed: number, segStart: number, delay: number) {
      const local = elapsed - segStart - delay;
      if (local <= 0) return 0;
      if (local >= ROLL_MS) return 1;
      return local / ROLL_MS;
    }

    function render(elapsed: number) {
      let anyMoving = false;
      const seg2Active = elapsed >= SEG2_START;

      cols.forEach((c) => {
        let translateY: number;
        let p: number;
        if (seg2Active) {
          const p2 = progressFor(elapsed, SEG2_START, c.delay);
          const eased2 = easeOutBack(p2);
          translateY = -(1 - eased2) * 50;
          p = p2;
        } else {
          const p1 = progressFor(elapsed, 0, c.delay);
          const eased1 = easeOutBack(p1);
          translateY = -eased1 * 50;
          p = p1;
        }
        if (p > 0 && p < 1) anyMoving = true;
        c.track.style.transform = "translateY(" + translateY.toFixed(2) + "%)";

        // 계산 한 겹: 롤 속도(사인 피크, 구간 중앙에서 최대)에 비례한 잔상 톤 — 형태는 바꾸지 않는다.
        const velocity = Math.sin(Math.min(1, Math.max(0, p)) * Math.PI);
        c.track.style.filter = velocity > 0.01 ? "blur(" + (velocity * 1.1).toFixed(2) + "px)" : "none";
        c.track.style.boxShadow = velocity > 0.01
          ? "0 0 " + (velocity * 9).toFixed(1) + "px rgba(91, 140, 248, " + (velocity * 0.5).toFixed(2) + ")"
          : "none";
      });

      setBadge(anyMoving ? "갱신 중" : "결제 금액");

      // 계산 한 겹: 카드 하이라이트 sweep — 롤 진행률(globalP)의 함수로 패널 전체를 가로지른다.
      let globalP = -1;
      if (elapsed >= 0 && elapsed < SEG_DURATION) {
        globalP = elapsed / SEG_DURATION;
      } else if (elapsed >= SEG2_START && elapsed < SEG2_START + SEG_DURATION) {
        globalP = (elapsed - SEG2_START) / SEG_DURATION;
      }
      if (globalP >= 0) {
        const sweepOpacity = Math.sin(globalP * Math.PI);
        sweepEl!.style.opacity = (sweepOpacity * 0.8).toFixed(2);
        sweepEl!.style.transform = "translateX(" + (-120 + globalP * 240).toFixed(1) + "%)";
      } else {
        sweepEl!.style.opacity = "0";
      }
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = true;
    let elapsed = reduce ? SEG2_START + SEG_DURATION : 0;
    if (reduce) {
      playing = false;
      root.classList.remove("is-demo");
    }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (playing) {
        elapsed += dt;
        if (elapsed >= LOOP_MS) elapsed -= LOOP_MS;
      }
      render(elapsed);
      raf = requestAnimationFrame(tick);
    }
    render(elapsed);
    raf = requestAnimationFrame(tick);

    function onClick() {
      playing = !playing;
      setCtrlLabel(playing ? "일시정지" : "재생");
    }
    function onKeydown(e: KeyboardEvent) {
      if ((e.key === "r" || e.key === "R") && !reduce) {
        elapsed = 0;
        playing = true;
        setCtrlLabel("일시정지");
      }
    }
    ctrl.addEventListener("click", onClick);
    ctrl.addEventListener("keydown", onKeydown);

    return () => {
      cancelAnimationFrame(raf);
      ctrl.removeEventListener("click", onClick);
      ctrl.removeEventListener("keydown", onKeydown);
      digitsEl.innerHTML = "";
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.ars} is-demo`} ref={rootRef}>
        <div className={styles.ars__badge}>{badge}</div>
        <button className={styles.ars__ctrl} type="button" ref={ctrlRef}>{ctrlLabel}</button>
        <div className={styles.ars__panel}>
          <div className={styles.ars__sweep} ref={sweepRef} aria-hidden="true" />
          <div className={styles.ars__digits} ref={digitsRef} />
          <span className={styles.ars__unit}>원</span>
        </div>
      </div>
    </main>
  );
}
