// NotifBellBadgePulseOpen — vanilla 판(run/405/demo/01-.../index.html) 의 React 포트.
// 계산 겹: measureHeight() 가 패널을 hidden 상태로 실측해 항목 수마다 다른 실제 높이 값을 얻고
// 그 값으로 0 → 실측치 전환을 건다(고정 높이 아님) — vanilla 와 동일 동작.
import { useEffect, useRef, useState } from "react";
import styles from "./NotifBellBadgePulseOpen.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const NOTIF_BADGE_PULSE_MS = 900; // 뱃지가 값이 오를 때 두 번 숨쉬듯 부풀었다 가라앉는 데 걸리는 시간

const NAMES = [
  "결제가 승인됐어요", "새 댓글이 달렸어요", "회의 10분 전이에요",
  "업로드가 끝났어요", "초대장이 도착했어요",
];
const TIMES = ["방금 전", "5분 전", "1시간 전", "어제", "2일 전"];

type Item = { name: string; time: string };

export default function NotifBellBadgePulseOpen() {
  const [isDemo, setIsDemo] = useState(true);

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const bellRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const badgeRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const ringRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const srRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const panelRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const itemsRef = useRef([] as Item[]) as unknown as Box<Item[]>;
  const openRef = useRef(false) as unknown as Box<boolean>;
  const seqRef = useRef(0) as unknown as Box<number>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;
  const stepRef = useRef(0) as unknown as Box<number>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function renderList() {
    const listEl = listRef.current;
    if (!listEl) return;
    listEl.innerHTML = "";
    itemsRef.current.forEach((it) => {
      const li = document.createElement("li");
      li.className = styles.item;
      li.setAttribute("role", "listitem");
      li.innerHTML =
        '<span class="' + styles.itemName + '">' + it.name + "</span>" +
        '<span class="' + styles.itemTime + '">' + it.time + "</span>";
      listEl.appendChild(li);
    });
  }

  function pulseBadge(reduce: boolean) {
    const badge = badgeRef.current;
    const ring = ringRef.current;
    if (!badge || !ring) return;
    badge.classList.remove(styles.badgePulse);
    ring.classList.remove(styles.pulseRingGo);
    if (!reduce) {
      // 계산 겹: 배지의 실측 지름(getBoundingClientRect)에서 링이 퍼져나갈 배율을 구한다 —
      // 고정 px 가 아니라 그 순간 배지 크기 비례라 320px 무대에서도 배지 밖으로 정확히 퍼진다
      const bw = badge.getBoundingClientRect().width || 20;
      const targetD = bw * 2.6;
      ring.style.width = bw + "px";
      ring.style.height = bw + "px";
      ring.style.setProperty("--ring-scale", (targetD / bw).toFixed(2));
      void badge.offsetWidth;
      void ring.offsetWidth;
      badge.classList.add(styles.badgePulse);
      ring.classList.add(styles.pulseRingGo);
    }
  }

  // 계산 겹: 패널을 실제로 펼치기 전, 화면 밖(visibility hidden)에서 콘텐츠의 실제 높이를
  // getBoundingClientRect 로 미리 재서(항목 수마다 다른 값) 그 값으로 0 → 실측치를 전환한다.
  function measureHeight(): number {
    const panel = panelRef.current;
    if (!panel) return 0;
    const prevVis = panel.style.visibility;
    const prevH = panel.style.height;
    panel.style.visibility = "hidden";
    panel.style.height = "auto";
    const h = panel.getBoundingClientRect().height;
    panel.style.visibility = prevVis;
    panel.style.height = prevH;
    return h;
  }

  function setOpen(v: boolean) {
    openRef.current = v;
    const bell = bellRef.current, panel = panelRef.current;
    if (bell) bell.setAttribute("aria-expanded", v ? "true" : "false");
    if (!panel) return;
    if (v) {
      const h = measureHeight();
      panel.style.height = "0px";
      requestAnimationFrame(() => { panel.style.height = h + "px"; });
    } else {
      panel.style.height = measureHeight() + "px";
      requestAnimationFrame(() => { panel.style.height = "0px"; });
    }
  }

  function addNotification(reduce: boolean) {
    const idx = seqRef.current % NAMES.length;
    itemsRef.current.unshift({ name: NAMES[idx], time: TIMES[seqRef.current % TIMES.length] });
    seqRef.current++;
    if (itemsRef.current.length > 5) itemsRef.current.pop();
    const badge = badgeRef.current, sr = srRef.current;
    if (badge) badge.textContent = String(itemsRef.current.length);
    if (sr) sr.textContent = "미확인 알림 " + itemsRef.current.length + "개";
    pulseBadge(reduce);
    renderList();
    // 패널이 열려 있는 동안 새 알림이 오면 높이도 새 내용에 맞춰 다시 잰다(고정폭 안 잘림)
    if (openRef.current) {
      const panel = panelRef.current;
      if (panel) panel.style.height = measureHeight() + "px";
    }
  }

  function toggle() {
    human();
    setOpen(!openRef.current);
  }

  function onKeyDown(e: KeyEvt) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const badge = badgeRef.current;
    if (badge) badge.style.animationDuration = NOTIF_BADGE_PULSE_MS + "ms";

    addNotification(reduce);
    addNotification(reduce);

    if (reduce) {
      const panel = panelRef.current;
      if (panel) panel.style.transition = "none";
      setOpen(true);
      addNotification(reduce);
    } else {
      // 시연 주기 간격(펄스→열림→추가→닫힘) — 측정창(2초) 안에 패널 열림이 다 보이도록 조정했다.
      // NOTIF_BADGE_PULSE_MS 자체는 그대로, 다음 단계로 넘어가는 대기시간만 다르게 준다.
      const STEP_WAIT_MS = [500, 500, 400, 900];
      function loop() {
        if (!isDemoRef.current) return;
        synthRef.current = true;
        const step = stepRef.current;
        if (step === 0) addNotification(false);
        else if (step === 1) setOpen(true);
        else if (step === 2) addNotification(false);
        else setOpen(false);
        synthRef.current = false;
        loopTimerRef.current = window.setTimeout(loop, STEP_WAIT_MS[step]);
        stepRef.current = (step + 1) % 4;
      }
      loopTimerRef.current = window.setTimeout(loop, 200);
    }

    return () => { window.clearTimeout(loopTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.nb + " " + (isDemo ? styles.isDemo : "")} ref={rootRef}>
        <button className={styles.bell} type="button" aria-expanded="false" aria-controls="nbPanel"
                ref={bellRef} onClick={toggle} onKeyDown={onKeyDown}>
          <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
            <g fill="currentColor">
              <path opacity=".2" d="M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12" />
              <path d="M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z" />
            </g>
          </svg>
          <span className={styles.badge} aria-hidden="true" ref={badgeRef}>0</span>
          <span className={styles.pulseRing} aria-hidden="true" ref={ringRef} />
          <span className={styles.sr} aria-live="polite" ref={srRef}>미확인 알림 0개</span>
        </button>
        <div className={styles.panel} id="nbPanel" role="region" aria-label="알림 패널" ref={panelRef}>
          <ul className={styles.list} role="list" ref={listRef} />
        </div>
      </div>
    </main>
  );
}
