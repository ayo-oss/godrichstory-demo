// EmojiPickerAnchorPositionFlip — vanilla 판(run/402/demo/07-.../index.html) 의 React 포트.
// 계산 겹: measureAndPlace() 가 뷰포트·입력창의 실제 렌더 좌표(getBoundingClientRect)와 패널의
// 실제 렌더 높이(offsetHeight)를 재서, 아래쪽 남은 공간이 패널 높이보다 작을 때만 위로 연다.
import { useEffect, useRef, useState } from "react";
import styles from "./EmojiPickerAnchorPositionFlip.module.scss";

type Box<T> = { current: T };

const EMOJI_PANEL_FLIP_MARGIN_PX = 8;
const PICKS = ["\u{1F600}", "\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F389}", "\u{1F525}", "\u{1F440}"];

export default function EmojiPickerAnchorPositionFlip() {
  const [isDemo, setIsDemo] = useState(true);
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const [low, setLow] = useState(true);
  const [panelStyle, setPanelStyle] = useState<{ top?: string; bottom?: string; left?: string }>({});

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const openRef = useRef(false) as unknown as Box<boolean>;
  const lowRef = useRef(true) as unknown as Box<boolean>;
  const liveRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const viewportRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const triggerRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const panelRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function measureAndPlace(): boolean {
    const vp = viewportRef.current, tr = triggerRef.current, pn = panelRef.current;
    if (!vp || !tr || !pn) return false;
    const vpRect = vp.getBoundingClientRect();
    const trRect = tr.getBoundingClientRect();
    const wasHidden = pn.hidden;
    pn.style.visibility = "hidden";
    pn.hidden = false;
    const panelH = pn.offsetHeight;
    pn.hidden = wasHidden;
    pn.style.visibility = "";
    const spaceBelow = vpRect.bottom - trRect.bottom;
    const spaceAbove = trRect.top - vpRect.top;
    const openAbove = (spaceBelow - EMOJI_PANEL_FLIP_MARGIN_PX) < panelH && spaceAbove > spaceBelow;
    setAbove(openAbove);
    const left = (trRect.left + trRect.width / 2 - vpRect.left) + "px";
    if (openAbove) {
      setPanelStyle({ bottom: (vpRect.bottom - trRect.top + EMOJI_PANEL_FLIP_MARGIN_PX) + "px", top: "auto", left: left });
    } else {
      setPanelStyle({ top: (trRect.bottom - vpRect.top + EMOJI_PANEL_FLIP_MARGIN_PX) + "px", bottom: "auto", left: left });
    }
    if (liveRef.current) {
      liveRef.current.textContent = "남은 공간 아래 " + Math.round(spaceBelow) + "px · 위 " + Math.round(spaceAbove) + "px, " + (openAbove ? "위로 열림" : "아래로 열림");
    }
    return openAbove;
  }

  function togglePanel() {
    human();
    if (!openRef.current) {
      measureAndPlace();
      openRef.current = true;
      setOpen(true);
    } else {
      openRef.current = false;
      setOpen(false);
    }
  }

  function movePosition(nextLow: boolean) {
    lowRef.current = nextLow;
    setLow(nextLow);
    if (openRef.current) window.setTimeout(measureAndPlace, 0);
  }

  useEffect(() => {
    function onResize() { if (openRef.current) measureAndPlace(); }
    window.addEventListener("resize", onResize);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lowState = true;
    function runStep() {
      if (!isDemoRef.current) return;
      movePosition(lowState);
      lowState = !lowState;
      synthRef.current = true; togglePanel(); synthRef.current = false;
      window.setTimeout(() => {
        synthRef.current = true; togglePanel(); synthRef.current = false;
        loopTimerRef.current = window.setTimeout(runStep, 480);
      }, 900);
    }
    if (!reduce) { loopTimerRef.current = window.setTimeout(runStep, 420); }
    else { isDemoRef.current = false; setIsDemo(false); }
    return () => { window.removeEventListener("resize", onResize); window.clearTimeout(loopTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.af + " " + (isDemo ? styles.isDemo : "")}>
        <div className={styles.viewport} ref={viewportRef}>
          <div
            className={
              styles.panel + " " +
              (above ? styles.panelAbove : styles.panelBelow) + " " +
              (open ? styles.panelOpen : "")
            }
            role="dialog"
            aria-label="이모지 패널"
            hidden={!open}
            ref={panelRef}
            style={panelStyle}
          >
            {PICKS.map((p, i) => (
              <button key={i} type="button" className={styles.pick}>{p}</button>
            ))}
          </div>
          <button
            className={styles.trigger + " " + (low ? styles.triggerLow : styles.triggerHigh)}
            type="button"
            aria-haspopup="true"
            aria-expanded={open}
            ref={triggerRef}
            onClick={togglePanel}
          >
            {"\u{1F600} 추가"}
          </button>
        </div>
        <p className={styles.sr} role="status" aria-live="polite" ref={liveRef} />
      </div>
    </main>
  );
}
