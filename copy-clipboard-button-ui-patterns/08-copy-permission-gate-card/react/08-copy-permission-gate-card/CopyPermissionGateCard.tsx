import { useEffect, useRef } from "react";
import styles from "./CopyPermissionGateCard.module.scss";

// 권한 대기 카드 — 읽기 권한을 얻지 못한 상태가 되면 안내판이 대기 카드로 바뀌고,
// 권한 상태 값(denied)과 남은 대기 시간의 비율만큼 카드 농도·안내 문구를 바꾼다.
// 계산 겹: 경과시간 → 남은 대기 비율(0~1) → 카드 배경 알파·진행바 폭 재계산.
// 실사용자 리스너 있음(권한 다시 요청 버튼). 실 클립보드 API/Permissions API 호출 없음 — 상태는 시뮬레이션.
const CHECK_MS = 500;
const WAIT_MS = 1600;
const CYCLE_MS = CHECK_MS + WAIT_MS;

export default function CopyPermissionGateCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const title = titleRef.current;
    const fill = fillRef.current;
    const msg = msgRef.current;
    const retryBtn = retryRef.current;
    if (!card || !title || !fill || !msg || !retryBtn) return;

    function applyChecking() {
      card!.dataset.state = "checking";
      title!.textContent = "붙여넣기 권한 확인 중";
      msg!.textContent = "권한 상태를 확인하고 있어요";
      fill!.style.width = "0%";
      card!.style.setProperty("--tint", "0.14");
    }

    function applyWaiting(elapsed: number) {
      card!.dataset.state = "waiting";
      const remain = Math.max(WAIT_MS - elapsed, 0);
      const ratio = remain / WAIT_MS;
      title!.textContent = "권한이 아직 없어요";
      msg!.textContent = `거부됨 · 남은 대기 ${(remain / 1000).toFixed(1)}s`;
      fill!.style.width = `${((1 - ratio) * 100).toFixed(1)}%`;
      card!.style.setProperty("--tint", (0.14 + (1 - ratio) * 0.34).toFixed(3));
    }

    function setPhase(t: number) {
      if (t < CHECK_MS) {
        applyChecking();
      } else {
        applyWaiting(t - CHECK_MS);
      }
    }

    setPhase(0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let start: number | null = null;
    let autoRaf = 0;

    function autoLoop(ts: number) {
      if (start === null) start = ts;
      const t = (ts - start) % CYCLE_MS;
      setPhase(t);
      autoRaf = requestAnimationFrame(autoLoop);
    }

    if (!reduce) autoRaf = requestAnimationFrame(autoLoop);

    function onRetry() {
      if (autoRaf) {
        cancelAnimationFrame(autoRaf);
        autoRaf = 0;
      }
      let clickStart: number | null = null;
      function userLoop(ts: number) {
        if (clickStart === null) clickStart = ts;
        const t = ts - clickStart;
        if (t < CYCLE_MS) {
          setPhase(t);
          requestAnimationFrame(userLoop);
        } else {
          setPhase(0);
        }
      }
      requestAnimationFrame(userLoop);
    }

    retryBtn.addEventListener("click", onRetry);
    return () => {
      if (autoRaf) cancelAnimationFrame(autoRaf);
      retryBtn.removeEventListener("click", onRetry);
    };
  }, []);

  return (
    <div className={styles.stage}>
      <section ref={cardRef} className={styles.card}>
        <p ref={titleRef} className={styles.title}>붙여넣기 권한 확인 중</p>
        <div className={styles.track}>
          <div ref={fillRef} className={styles.fill} />
        </div>
        <p ref={msgRef} className={styles.msg}>권한 상태를 확인하고 있어요</p>
        <button ref={retryRef} className={styles.retryBtn} type="button">권한 다시 요청</button>
      </section>
    </div>
  );
}
