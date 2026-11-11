// EmojiPickerVariantLongpressFan — vanilla 판(run/402/demo/05-.../index.html) 의 React 포트.
// 계산 겹: pointerdown 시각을 performance.now() 로 저장해 두고 매 프레임 지금 시각과의 차(누른
// 시간 값)를 문턱과 비교한다 — 그 값을 그대로 링 채움 비율로 써서, 값이 문턱을 넘는 순간에만
// 반응 변형이 부채꼴로 펼쳐진다.
import { useEffect, useRef, useState } from "react";
import styles from "./EmojiPickerVariantLongpressFan.module.scss";

type Box<T> = { current: T };

const EMOJI_LONGPRESS_THRESHOLD_MS = 550;
const VARIANTS = [
  { ch: "\u{1F44D}", label: "좋아요" },
  { ch: "\u{2764}\u{FE0F}", label: "사랑해요" },
  { ch: "\u{1F602}", label: "웃겨요" },
  { ch: "\u{1F62E}", label: "놀라워요" },
  { ch: "\u{1F622}", label: "슬퍼요" },
];

export default function EmojiPickerVariantLongpressFan() {
  const [isDemo, setIsDemo] = useState(true);
  const [fanOpen, setFanOpen] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [ch, setCh] = useState(VARIANTS[0].ch);
  const [pop, setPop] = useState(0);

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const pressingRef = useRef(false) as unknown as Box<boolean>;
  const pressStartRef = useRef(0) as unknown as Box<number>;
  const fanOpenedRef = useRef(false) as unknown as Box<boolean>;
  const hoverIndexRef = useRef(-1) as unknown as Box<number>;
  const rafRef = useRef(0) as unknown as Box<number>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;
  const liveRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const ringRef = useRef(null) as unknown as Box<HTMLSpanElement>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function tick() {
    if (!pressingRef.current) return;
    const elapsed = performance.now() - pressStartRef.current;
    const pct = Math.min(1, elapsed / EMOJI_LONGPRESS_THRESHOLD_MS);
    if (ringRef.current) ringRef.current.style.transform = "scaleX(" + pct + ")";
    if (pct >= 1 && !fanOpenedRef.current) openFan();
    rafRef.current = requestAnimationFrame(tick);
  }

  function openFan() {
    fanOpenedRef.current = true;
    setFanOpen(true);
    if (liveRef.current) liveRef.current.textContent = "변형 " + VARIANTS.length + "개 펼쳐짐";
  }

  function closeFan(commit: boolean) {
    setFanOpen(false);
    setHoverIndex(-1);
    hoverIndexRef.current = -1;
    if (!commit && liveRef.current) liveRef.current.textContent = "닫힘";
    fanOpenedRef.current = false;
  }

  function selectDefault() {
    setCh(VARIANTS[0].ch);
    setPop((p) => p + 1);
    if (liveRef.current) liveRef.current.textContent = VARIANTS[0].label + " 선택됨";
  }

  function selectVariant(i: number) {
    setCh(VARIANTS[i].ch);
    setPop((p) => p + 1);
    if (liveRef.current) liveRef.current.textContent = VARIANTS[i].label + " 선택됨";
  }

  function setHover(i: number) {
    if (hoverIndexRef.current === i) return;
    hoverIndexRef.current = i;
    setHoverIndex(i);
  }

  function press() {
    pressingRef.current = true;
    pressStartRef.current = performance.now();
    fanOpenedRef.current = false;
    hoverIndexRef.current = -1;
    setHoverIndex(-1);
    if (ringRef.current) ringRef.current.style.transform = "scaleX(0)";
    rafRef.current = requestAnimationFrame(tick);
  }

  function release() {
    if (!pressingRef.current) return;
    pressingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (ringRef.current) ringRef.current.style.transform = "scaleX(0)";
    if (fanOpenedRef.current) {
      const hi = hoverIndexRef.current;
      if (hi >= 0) selectVariant(hi);
      closeFan(hi >= 0);
    } else {
      selectDefault();
    }
  }

  useEffect(() => {
    function onUp() { release(); }
    window.addEventListener("pointerup", onUp);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = [
      { hold: 240, hover: -1 },
      { hold: 780, hover: 1 },
      { hold: 240, hover: -1 },
      { hold: 900, hover: 3 },
    ];
    let si = 0;
    function runStep() {
      if (!isDemoRef.current) return;
      const s = steps[si % steps.length];
      synthRef.current = true; press(); synthRef.current = false;
      const mid = Math.round(s.hold * 0.78);
      window.setTimeout(() => { if (s.hover >= 0 && fanOpenedRef.current) setHover(s.hover); }, mid);
      window.setTimeout(() => {
        synthRef.current = true; release(); synthRef.current = false;
        si++;
        loopTimerRef.current = window.setTimeout(runStep, 520);
      }, s.hold);
    }
    if (!reduce) { loopTimerRef.current = window.setTimeout(runStep, 400); }
    else { isDemoRef.current = false; setIsDemo(false); }
    return () => { window.removeEventListener("pointerup", onUp); window.clearTimeout(loopTimerRef.current); cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.lp + " " + (isDemo ? styles.isDemo : "")}>
        <div className={styles.wrap}>
          <div
            className={styles.fan + " " + (fanOpen ? styles.fanOpen : "")}
            role="menu"
            aria-label="반응 변형"
            hidden={!fanOpen && !isDemo}
          >
            {VARIANTS.map((v, i) => (
              <button
                key={v.label}
                type="button"
                className={styles.variant + " " + (hoverIndex === i ? styles.variantHover : "")}
                role="menuitem"
                aria-label={v.label}
                style={{ "--i": i } as any}
              >
                {v.ch}
              </button>
            ))}
          </div>
          <button
            className={styles.main}
            type="button"
            aria-label="좋아요"
            onPointerDown={() => { human(); press(); }}
            onPointerCancel={() => release()}
          >
            <span key={pop} className={styles.mainCh + " " + styles.mainChPop}>{ch}</span>
            <span className={styles.ring} aria-hidden="true">
              <span className={styles.ringFill} ref={ringRef} />
            </span>
          </button>
        </div>
        <p className={styles.sr} role="status" aria-live="polite" ref={liveRef} />
      </div>
    </main>
  );
}
