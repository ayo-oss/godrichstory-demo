// BackdropFilterPrefix — vanilla 판(run/375/demo/02-compat-backdrop-filter-prefix/index.html) 의 React 포트.
// 폴백 배경(반투명 단색)을 항상 선언하고 @supports(backdrop-filter) 가 지원판에서 흐림으로 덮는다.
import { useEffect, useRef } from "react";
import styles from "./BackdropFilterPrefix.module.scss";

type Box<T> = { current: T };

const FALLBACK_BG_ALPHA = 0.6; // 흐림이 없는 환경에서 카드 배경을 채우는 반투명 진하기 — 변형 목표: 0.6 → 0.85
const STEP_MS = 620;

export default function BackdropFilterPrefix() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const cardRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const openBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const simToggleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const modeLabelRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const card = cardRef.current;
    const openBtn = openBtnRef.current;
    const simToggle = simToggleRef.current;
    const modeLabel = modeLabelRef.current;
    if (!wrap || !card || !openBtn || !simToggle || !modeLabel) return;

    let isDemo = true;
    card.style.setProperty("--fallback-alpha", String(FALLBACK_BG_ALPHA));

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }

    let open = false;
    function setOpen(on: boolean) {
      open = on;
      card!.classList.toggle(styles.isOpen, on);
      openBtn!.setAttribute("aria-pressed", String(on));
    }
    function onOpenClick() { human(); setOpen(!open); }
    openBtn.addEventListener("click", onOpenClick);

    let simOn = false;
    function setSim(on: boolean) {
      simOn = on;
      wrap!.classList.toggle(styles.forceFallback, on);
      simToggle!.setAttribute("aria-pressed", String(on));
      modeLabel!.textContent = on ? "흐림 폴백판" : "흐림 지원판";
    }
    function onSimClick() { human(); setSim(!simOn); }
    simToggle.addEventListener("click", onSimClick);

    let last = 0;
    let phase = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce && ts - last >= STEP_MS) {
        last = ts;
        phase = (phase + 1) % 4;
        setOpen(phase === 1 || phase === 2);
        if (phase === 0) setSim(!simOn);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      openBtn!.removeEventListener("click", onOpenClick);
      simToggle!.removeEventListener("click", onSimClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.backdrop}></div>
        <button className={styles.openBtn} ref={openBtnRef} type="button" aria-pressed="false">카드 열기</button>
        <div className={styles.card} ref={cardRef}>
          <p className={styles.cardText}>알림 3건</p>
        </div>
        <div className={styles.foot}>
          <span className={styles.modeLabel} ref={modeLabelRef}>흐림 지원판</span>
          <button className={styles.simToggle} ref={simToggleRef} type="button" aria-pressed="false">폴백 흉내내기</button>
        </div>
      </div>
    </main>
  );
}
