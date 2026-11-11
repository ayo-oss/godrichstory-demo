import { useEffect, useRef } from "react";
import styles from "./CommentThreadCollapseHeightSpring.module.scss";

// $ease-lerp-settle 곡선(site/static/demo-tokens.scss)과 같은 샘플 — 1 을 넘겼다가(최대 1.126) 되돌아온다.
const SPRING_SETTLE_EASING =
  "linear(0.0, 0.051, 0.176, 0.341, 0.518, 0.685, 0.831, 0.947, 1.032, 1.087, 1.117, 1.126, 1.121, 1.105, 1.085, 1.062, 1.041, 1.022, 1.008, 0.997, 1)";

export default function CommentThreadCollapseHeightSpring() {
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const toggle = toggleRef.current;
    const icon = iconRef.current;
    const panel = panelRef.current;
    const inner = innerRef.current;
    const label = labelRef.current;
    const status = statusRef.current;
    if (!root || !toggle || !icon || !panel || !inner || !label || !status) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    let open = false;
    let panelAnim: Animation | null = null;
    let innerAnim: Animation | null = null;
    let iconAnim: Animation | null = null;
    let bgAnim: Animation | null = null;

    function measure() {
      panel!.style.height = "auto";
      inner!.style.opacity = "1";
      return panel!.scrollHeight;
    }

    function setOpen(next: boolean, animate: boolean, delayMs: number) {
      open = next;
      toggle!.setAttribute("aria-expanded", String(open));
      label!.textContent = open ? "답글 숨기기" : "답글 3개 보기";
      status!.textContent = open ? "답글 3개가 펼쳐졌습니다." : "답글이 접혔습니다.";
      if (panelAnim) panelAnim.cancel();
      if (innerAnim) innerAnim.cancel();
      if (iconAnim) iconAnim.cancel();
      if (bgAnim) bgAnim.cancel();

      const target = measure();
      const from = open ? 0 : target;
      const to = open ? target : 0;
      panel!.style.height = from + "px";
      inner!.style.opacity = open ? "0" : "1";

      if (!animate || reduce) {
        panel!.style.height = to + "px";
        inner!.style.opacity = open ? "1" : "0";
        icon!.style.transform = `rotate(${open ? 180 : 0}deg)`;
        return;
      }
      const dur = Math.max(320, Math.min(680, 300 + target * 0.9));
      panelAnim = panel!.animate(
        [{ height: from + "px" }, { height: to + "px" }],
        { duration: dur, delay: delayMs, easing: SPRING_SETTLE_EASING, fill: "forwards" }
      );
      innerAnim = inner!.animate(
        [{ opacity: open ? 0 : 1 }, { opacity: open ? 1 : 0 }],
        { duration: Math.round(dur * 0.6), delay: delayMs, easing: "ease-out", fill: "forwards" }
      );
      iconAnim = icon!.animate(
        [{ transform: `rotate(${open ? 0 : 180}deg)` }, { transform: `rotate(${open ? 180 : 0}deg)` }],
        { duration: dur, delay: delayMs, easing: SPRING_SETTLE_EASING, fill: "forwards" }
      );
      // 계산: 펼침 비율이 0→1(또는 반대)로 진행되는 같은 구간 동안, 패널 전체(카드 바탕)에도
      // 옅은 색 변화를 얹어 화살표·패널 경계 바깥까지 값을 전파한다(넓은 면적의 근거 있는 변화).
      bgAnim = root!.animate(
        [{ backgroundColor: "#231f28" }, { backgroundColor: "#2b3550" }, { backgroundColor: "#231f28" }],
        { duration: Math.round(dur * 1.15), delay: delayMs, easing: "ease-out" }
      );
    }

    panel.style.height = "0px";
    inner.style.opacity = "0";

    const onActivate = () => { root.classList.remove("is-demo"); setOpen(!open, true, 0); };
    toggle.addEventListener("click", onActivate);
    toggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate(); }
    });

    let seqTimer: number | undefined;
    function playSequence() {
      if (seqTimer) { window.clearTimeout(seqTimer); seqTimer = undefined; }
      setOpen(false, false, 0);
      setOpen(true, true, 200);
      seqTimer = window.setTimeout(() => { setOpen(false, true, 0); }, 1080);
    }

    let timer: number | undefined;
    if (reduce) {
      setOpen(true, false, 0);
    } else {
      playSequence();
      timer = window.setInterval(() => {
        if (!root.classList.contains("is-demo")) return;
        playSequence();
      }, 2600);
    }

    return () => { if (timer) window.clearInterval(timer); if (seqTimer) window.clearTimeout(seqTimer); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.ch} is-demo`} ref={rootRef}>
        <div className={styles.ch__card}>
          <div className={styles.ch__row}>
            <span className={styles.ch__avatar} aria-hidden="true" />
            <div className={styles.ch__body}>
              <p className={styles.ch__meta}><strong className={styles.ch__name}>코랄북스</strong></p>
              <p className={styles.ch__text}>이 스레드 답글이 꽤 쌓였네요, 펼쳐서 볼게요.</p>
              <button type="button" className={styles.ch__toggle} ref={toggleRef} aria-expanded="false" aria-controls="chPanel">
                <svg className={styles.ch__toggleIcon} ref={iconRef} viewBox="0 0 256 256" aria-hidden="true">
                  <g fill="currentColor">
                    <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
                    <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
                  </g>
                </svg>
                <span ref={labelRef}>답글 3개 보기</span>
              </button>
            </div>
          </div>
          <div className={styles.ch__panel} id="chPanel" ref={panelRef}>
            <div className={styles.ch__panelInner} ref={innerRef}>
              <div className={styles.ch__reply}>
                <span className={`${styles.ch__avatar} ${styles["ch__avatar--sm"]}`} aria-hidden="true" />
                <p className={styles.ch__text}>저장 버튼 위치가 헷갈렸는데 이제 명확해요.</p>
              </div>
              <div className={styles.ch__reply}>
                <span className={`${styles.ch__avatar} ${styles["ch__avatar--sm"]}`} aria-hidden="true" />
                <p className={styles.ch__text}>동감이에요, 다음 업데이트도 기대할게요.</p>
              </div>
              <div className={styles.ch__reply}>
                <span className={`${styles.ch__avatar} ${styles["ch__avatar--sm"]}`} aria-hidden="true" />
                <p className={styles.ch__text}>스크린샷도 같이 올려주시면 좋을 것 같아요.</p>
              </div>
            </div>
          </div>
        </div>
        <p className={styles.ch__sr} ref={statusRef} aria-live="polite" />
      </div>
    </main>
  );
}
