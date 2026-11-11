// WaitingQueueNoshowRecallCountdown — vanilla 판(05-waiting-queue-noshow-recall-countdown) 의 React 포트.
// 호출 시점부터 지난 시간을 매 프레임 다시 계산해 남은 비율만큼 게이지 width 를 줄이고,
// 비율 0 도달을 계산해 배지를 만료로 바꾸고 흔들림을 한 번 재생한다. Date 없이 rAF 시간만 쓴다.
import { useEffect, useRef, useState } from "react";
import styles from "./WaitingQueueNoshowRecallCountdown.module.scss";

type Box<T> = { current: T };

const RECALL_COUNTDOWN_SEC = 60;
const SHAKE_DURATION_MS = 380;
const CALL_BASE = 201;
const DEMO_TIME_SCALE = 40;

export default function WaitingQueueNoshowRecallCountdown() {
  const [ticketText, setTicketText] = useState(CALL_BASE + "번");
  const [badgeText, setBadgeText] = useState("대기중");
  const [expired, setExpired] = useState(false);
  const [warn, setWarn] = useState(false);
  const [gaugeW, setGaugeW] = useState(100);
  const [secText, setSecText] = useState(RECALL_COUNTDOWN_SEC + "초 남음");
  const [status, setStatus] = useState("");
  const [reduce, setReduce] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const rootRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const ticketIndexRef = useRef<number>(0) as Box<number>;
  const callStartRef = useRef<number>(0) as Box<number>;
  const expiredRef = useRef<boolean>(false) as Box<boolean>;
  const shakenRef = useRef<boolean>(false) as Box<boolean>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const t0Ref = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function ticketNum(): number { return CALL_BASE + ticketIndexRef.current; }

  function shake(): void {
    if (reduce) return;
    const panel = panelRef.current;
    if (!panel) return;
    panel.animate(
      [
        { transform: "translateX(0px)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(0px)" }
      ],
      { duration: SHAKE_DURATION_MS, easing: "ease-out" }
    );
  }

  function startTicket(nowMs: number): void {
    setTicketText(ticketNum() + "번");
    setBadgeText("대기중");
    setExpired(false);
    setWarn(false);
    callStartRef.current = nowMs;
    expiredRef.current = false;
    shakenRef.current = false;
    setGaugeW(100);
    setSecText(RECALL_COUNTDOWN_SEC + "초 남음");
    setStatus(ticketNum() + "번 호출 · " + RECALL_COUNTDOWN_SEC + "초 안에 확인해주세요.");
  }

  function checkin(nowMs: number): void {
    setStatus(ticketNum() + "번 확인 완료.");
    ticketIndexRef.current += 1;
    startTicket(nowMs);
  }

  function resetAll(nowMs: number): void {
    ticketIndexRef.current = 0;
    startTicket(nowMs);
    setStatus(ticketNum() + "번 호출 · " + RECALL_COUNTDOWN_SEC + "초 안에 확인해주세요.");
  }

  function stepGauge(nowMs: number): void {
    const elapsedS = (nowMs - callStartRef.current) / 1000;
    const ratio = Math.max(0, 1 - elapsedS / RECALL_COUNTDOWN_SEC);
    setGaugeW(Math.round(ratio * 1000) / 10);
    setWarn(ratio <= 0.34 && ratio > 0);
    if (ratio <= 0 && !expiredRef.current) setExpired(true);
    const remainSec = Math.max(0, Math.ceil(RECALL_COUNTDOWN_SEC - elapsedS));
    setSecText(remainSec + "초 남음");
    if (ratio <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      setBadgeText("만료 · 재호출 필요");
      setStatus(ticketNum() + "번 시간 만료 · 재호출이 필요합니다.");
      if (!shakenRef.current) { shakenRef.current = true; shake(); }
    }
  }

  function stopDemo(): void { demoRef.current = false; }

  useEffect(() => {
    startTicket(0);
    function tick(ts: number): void {
      if (t0Ref.current === 0) t0Ref.current = ts;
      const now = ts - t0Ref.current;
      if (!reduce) {
        const inDemo = demoRef.current;
        const demoNow = inDemo ? callStartRef.current + (now - callStartRef.current) * DEMO_TIME_SCALE : now;
        stepGauge(demoNow);
        if (inDemo && expiredRef.current) {
          checkin(now);
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  function onCheckin(): void { stopDemo(); checkin(perfNow()); }
  function onReset(): void { stopDemo(); resetAll(perfNow()); }

  function perfNow(): number { return t0Ref.current === 0 ? 0 : performance.now() - t0Ref.current; }

  function onKeyDown(e: { key: string; preventDefault: () => void }, fn: () => void): void {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
  }

  const badgeClass = [styles.badge, expired ? styles.badgeExpired : ""].join(" ").trim();
  const gaugeClass = [styles.gauge, warn ? styles.gaugeWarn : "", expired ? styles.gaugeExpired : ""].join(" ").trim();
  const rootClass = [styles.wrc, reduce ? "" : "is-demo"].join(" ").trim();

  return (
    <main className={styles.stage}>
      <div className={rootClass} ref={rootRef}>
        <div className={styles.panel} ref={panelRef}>
          <span className={styles.ticket} aria-hidden="true">{ticketText}</span>
          <span className={badgeClass} aria-hidden="true">{badgeText}</span>
          <div className={styles.track} aria-hidden="true"><div className={gaugeClass} style={{ width: gaugeW + "%" }} /></div>
          <span className={styles.sec} aria-hidden="true">{secText}</span>
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
        <div className={styles.controls}>
          <button type="button" className={[styles.btn, styles.btnPrimary].join(" ")} onClick={onCheckin} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onCheckin)}>확인 완료</button>
          <button type="button" className={styles.btn} onClick={onReset} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onReset)}>초기화</button>
        </div>
      </div>
    </main>
  );
}
