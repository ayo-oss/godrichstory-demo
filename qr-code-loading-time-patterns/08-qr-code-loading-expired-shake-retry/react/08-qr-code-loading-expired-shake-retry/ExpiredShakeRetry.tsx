import { useEffect, useRef, useState } from "react";
import styles from "./ExpiredShakeRetry.module.scss";

export default function ExpiredShakeRetry() {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const [badge, setBadge] = useState("코드 유효");
  const [ctrlLabel, setCtrlLabel] = useState("일시정지");
  const [code, setCode] = useState("QR");
  const [msg, setMsg] = useState("스캔해 주세요");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    const ctrl = ctrlRef.current;
    const retryBtn = retryRef.current;
    if (!root || !panel || !ctrl || !retryBtn) return;

    // EXPIRED_SHAKE_AMPLITUDE_PX — 변형 1: 10 → 16 으로 늘리면 만료 시 흔들림 폭이 커진다.
    const EXPIRED_SHAKE_AMPLITUDE_PX = 10;
    const LOOP_MS = 2000;
    const EXPIRE_AT = 250;
    const SHAKE_MS = 700;
    const SHAKE_FREQ = 5;
    // 시연 스케줄: 2초 루프 안에 만료→흔들림→자동 재시도→만료→흔들림 을 두 번 넣는다.
    // RETRY_AT(자동 재시도)·EXPIRE_AT2(두 번째 만료)만 새로 추가 — 진폭·진동수·감쇠 함수는 그대로.
    const RETRY_AT = 1050;
    const EXPIRE_AT2 = 1300;

    // 계산 한 겹: 진동수(SHAKE_FREQ)와 지수 감쇠를 곱한 감쇠 사인파로 흔들림을 만든다.
    function shakeOffset(t: number) {
      if (t < 0 || t > SHAKE_MS) return 0;
      const p = t / SHAKE_MS;
      return Math.sin(p * Math.PI * 2 * SHAKE_FREQ) * EXPIRED_SHAKE_AMPLITUDE_PX * Math.exp(-3.2 * p);
    }

    // 자동 재생에서 만료 구간 판정: 첫 만료(EXPIRE_AT~RETRY_AT) · 두 번째 만료(EXPIRE_AT2~루프 끝) 두 번
    function autoExpired(elapsed: number) {
      return (elapsed >= EXPIRE_AT && elapsed < RETRY_AT) || elapsed >= EXPIRE_AT2;
    }
    function autoExpireStart(elapsed: number) {
      return elapsed < RETRY_AT ? EXPIRE_AT : EXPIRE_AT2;
    }

    let manualRetryAt = -1;

    function render(elapsed: number) {
      const isExpired = manualRetryAt < 0 && autoExpired(elapsed);
      const t = manualRetryAt >= 0 ? elapsed - manualRetryAt : elapsed - autoExpireStart(elapsed);
      const offset = isExpired ? shakeOffset(t) : 0;
      panel!.style.transform = offset ? "translateX(" + offset.toFixed(2) + "px)" : "none";

      // 계산 한 겹: 같은 감쇠 사인파(shakeOffset)의 크기를 그림자·배경 톤·QR 격자 흐림에 그대로 전파한다.
      const normOffset = Math.min(1, Math.abs(offset) / EXPIRED_SHAKE_AMPLITUDE_PX);
      panel!.style.boxShadow = "0 14px 24px rgba(23, 20, 26, .32), 0 0 " +
        (normOffset * 20).toFixed(1) + "px rgba(233, 64, 64, " + (normOffset * 0.55).toFixed(2) + ")";

      if (isExpired) {
        setExpired(true);
        setCode("×");
        setMsg("코드가 만료됐어요");
        setBadge("코드 만료");
      } else {
        setExpired(false);
        setCode("QR");
        setMsg("스캔해 주세요");
        setBadge("코드 유효");
      }
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = true;
    let elapsed = reduce ? EXPIRE_AT + SHAKE_MS : 0;
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
        if (elapsed >= LOOP_MS) { elapsed -= LOOP_MS; manualRetryAt = -1; }
      }
      render(elapsed);
      raf = requestAnimationFrame(tick);
    }
    render(elapsed);
    raf = requestAnimationFrame(tick);

    function onRetry() {
      manualRetryAt = elapsed;
    }
    function onClick() {
      playing = !playing;
      setCtrlLabel(playing ? "일시정지" : "재생");
    }
    function onKeydown(e: KeyboardEvent) {
      if ((e.key === "r" || e.key === "R") && !reduce) {
        elapsed = 0;
        manualRetryAt = -1;
        playing = true;
        setCtrlLabel("일시정지");
      }
    }
    retryBtn.addEventListener("click", onRetry);
    ctrl.addEventListener("click", onClick);
    ctrl.addEventListener("keydown", onKeydown);

    return () => {
      cancelAnimationFrame(raf);
      retryBtn.removeEventListener("click", onRetry);
      ctrl.removeEventListener("click", onClick);
      ctrl.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.esr} is-demo`} ref={rootRef}>
        <div className={styles.esr__badge}>{badge}</div>
        <button className={styles.esr__ctrl} type="button" ref={ctrlRef}>{ctrlLabel}</button>
        <div
          className={`${styles.esr__panel}${expired ? " " + styles["esr__panel--expired"] : ""}`}
          ref={panelRef}
        >
          <div className={styles.esr__code}>{code}</div>
          <div className={styles.esr__msg}>{msg}</div>
          <button className={styles.esr__retry} type="button" ref={retryRef}>다시 받기</button>
        </div>
      </div>
    </main>
  );
}
