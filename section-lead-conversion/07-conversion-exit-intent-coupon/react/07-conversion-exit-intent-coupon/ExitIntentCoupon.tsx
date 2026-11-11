import { useEffect, useRef, useState } from "react";
import styles from "./ExitIntentCoupon.module.scss";

// 이벤트 타입은 이 파일 안에서 최소한으로 선언한다 (외부 제네릭에 기대지 않는다)
type MouseEvt = { clientY: number };
type KeyEvt = { key: string };
type Box<T> = { current: T | null };

export type ExitIntentCouponProps = { duration?: number; easing?: string; color?: string };
type Vars = { "--duration": string; "--easing": string; "--color": string };

const CODE = "WELCOME20";
const MICRO = "이 세션엔 다시 안 떠요";

export default function ExitIntentCoupon({
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: ExitIntentCouponProps) {
  const [demo, setDemo] = useState(true);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");
  const closeRef: Box<HTMLButtonElement> = useRef<HTMLButtonElement>(null);
  const ctaRef: Box<HTMLButtonElement> = useRef<HTMLButtonElement>(null);
  const vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as Vars;

  function seen(): boolean {
    try { return sessionStorage.getItem("exit271") === "1"; } catch (err) { return false; }
  }

  useEffect(() => {
    if (seen()) setMsg(MICRO);
    function onLeave(e: MouseEvt) {
      if (e.clientY >= 12 || open) return;
      if (seen()) { setMsg(MICRO); return; }
      try { sessionStorage.setItem("exit271", "1"); } catch (err) {}
      setDemo(false);
      setOpen(true);
    }
    function onKey(e: KeyEvt) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    const off = () => setDemo(false);
    window.addEventListener("pointerdown", off, { once: true });
    window.addEventListener("keydown", off, { once: true });
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", off);
    };
  }, []);

  useEffect(() => {
    if (open && closeRef.current) closeRef.current.focus({ preventScroll: true });
  }, [open]);

  function close() {
    setOpen(false);
    setMsg(MICRO);
    if (ctaRef.current) ctaRef.current.focus({ preventScroll: true });
  }

  function copy() {
    const fail = () => setMsg(`직접 복사: ${CODE}`);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(CODE).then(() => setCopied(true), fail);
    } else { fail(); }
  }

  return (
    <main className={`${styles.stage} ${demo ? styles.demo : ""}`} style={vars}>
      <div className={styles.page}>
        <p className={styles.pageTitle}>주간 요금제</p>
        <p className={styles.pageBody}>필요한 만큼만 골라 쓰는 요금제예요.<br />주간 단위로 바꾸고 그만둘 수 있어요.</p>
        <button type="button" className={styles.pageCta} ref={ctaRef}>요금제 자세히 보기</button>
        <p className={styles.pageHint}>시험: 커서를 화면 맨 위로</p>
        <p className={styles.pageMsg} role="status">{msg}</p>
      </div>

      <div className={styles.wrap}>
        <div
          className={`${styles.xp} ${open ? styles.xpOpen : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="떠나기 전 쿠폰"
        >
          <button type="button" className={styles.close} aria-label="닫기" ref={closeRef} onClick={close}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="13" height="13" aria-hidden="true"><g fill="currentColor"><path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" /><path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" /></g></svg>
          </button>
          <span className={styles.ic} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="26" height="26"><g fill="currentColor"><path d="M200 128a32 32 0 0 0 32 32v32a8 8 0 0 1-8 8H96V56h128a8 8 0 0 1 8 8v32a32 32 0 0 0-32 32" opacity=".2" /><path d="M232 104a8 8 0 0 0 8-8V64a16 16 0 0 0-16-16H32a16 16 0 0 0-16 16v32a8 8 0 0 0 8 8a24 24 0 0 1 0 48a8 8 0 0 0-8 8v32a16 16 0 0 0 16 16h192a16 16 0 0 0 16-16v-32a8 8 0 0 0-8-8a24 24 0 0 1 0-48M32 167.2a40 40 0 0 0 0-78.4V64h56v128H32Zm192 0V192H104V64h120v24.8a40 40 0 0 0 0 78.4" /></g></svg>
          </span>
          <p className={styles.title}>가기 전에, 첫 달 20% 쿠폰</p>
          <p className={styles.code}>{CODE}<span className={styles.sweep} aria-hidden="true" /></p>
          <button type="button" className={`${styles.copy} ${copied ? styles.copied : ""}`} onClick={copy}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="13" height="13" aria-hidden="true"><g fill="currentColor"><path d="M216 40v128h-48V88H88V40Z" opacity=".2" /><path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" /></g></svg>
            <span>{copied ? "복사됨" : "코드 복사"}</span>
            <svg className={styles.check} viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <polyline points="4 12 9 17 20 6" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
