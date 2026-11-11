// EmojiSkinToneModifierSwap — vanilla 판(run/402/demo/04-.../index.html) 의 React 포트.
// combine() 은 사람 형태 이모지의 원본 코드포인트에 톤 수정자 코드포인트(U+1F3FB~U+1F3FF)를 그대로
// 이어 붙여 새 문자를 만든다 — 다섯 벌을 미리 그려 바꿔 끼우지 않고 문자 자체를 조합한다.
import { useEffect, useRef, useState } from "react";
import styles from "./EmojiSkinToneModifierSwap.module.scss";

type Box<T> = { current: T };

const EMOJI_TONE_MODIFIERS = ["\u{1F3FB}", "\u{1F3FC}", "\u{1F3FD}", "\u{1F3FE}", "\u{1F3FF}"];
const TONE_NAMES = ["기본", "톤 1", "톤 2", "톤 3", "톤 4", "톤 5"];
const BASES = [
  { cp: "\u{1F44B}", name: "waving hand" }, { cp: "\u{1F44D}", name: "thumbs up" },
  { cp: "\u{1F44F}", name: "clapping hands" }, { cp: "\u{270B}", name: "raised hand" },
  { cp: "\u{1F64F}", name: "folded hands" }, { cp: "\u{1F4AA}", name: "flexed bicep" },
  { cp: "\u{1F44C}", name: "ok hand" }, { cp: "\u{270C}", name: "victory hand" },
  { cp: "\u{270D}", name: "writing hand" }, { cp: "\u{1F64B}", name: "raising hand" },
];

function combine(base: string, toneIndex: number): string {
  if (toneIndex === 0) return base;
  return base + EMOJI_TONE_MODIFIERS[toneIndex - 1];
}

export default function EmojiSkinToneModifierSwap() {
  const [isDemo, setIsDemo] = useState(true);
  const [tone, setToneState] = useState(0);

  const [swapKey, setSwapKey] = useState(0);

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const toneRef = useRef(0) as unknown as Box<number>;
  const mountedRef = useRef(false) as unknown as Box<boolean>;
  const liveRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;
  const swatchRefs = useRef({} as { [i: number]: HTMLButtonElement }) as unknown as Box<{ [i: number]: HTMLButtonElement }>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function setTone(i: number) {
    toneRef.current = i;
    setToneState(i);
    if (mountedRef.current) setSwapKey((k) => k + 1);
    if (liveRef.current) liveRef.current.textContent = TONE_NAMES[i] + " 선택됨, " + BASES.length + "개 갱신";
  }

  function onSwatchClick(i: number) {
    human();
    setTone(i);
  }

  useEffect(() => {
    mountedRef.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const order = [1, 3, 5, 2, 4, 0];
    let oi = 0;
    function loop() {
      if (!isDemoRef.current) return;
      const i = order[oi % order.length];
      const btn = swatchRefs.current[i];
      synthRef.current = true;
      if (btn) btn.click(); else onSwatchClick(i);
      synthRef.current = false;
      oi++;
      loopTimerRef.current = window.setTimeout(loop, 620);
    }
    if (!reduce) { loopTimerRef.current = window.setTimeout(loop, 500); }
    else { isDemoRef.current = false; setIsDemo(false); }
    return () => window.clearTimeout(loopTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.tn + " " + (isDemo ? styles.isDemo : "")}>
        <div className={styles.strip} role="radiogroup" aria-label="톤 선택">
          {TONE_NAMES.map((label, i) => (
            <button
              key={label}
              type="button"
              className={styles.swatch + " " + (styles as any)["swatchT" + i]}
              role="radio"
              aria-checked={tone === i}
              aria-label={label}
              ref={(el: HTMLButtonElement | null) => { if (el) swatchRefs.current[i] = el; }}
              onClick={() => onSwatchClick(i)}
            />
          ))}
        </div>
        <ul className={styles.grid}>
          {BASES.map((it) => (
            <li key={it.name} className={styles.item}>
              <span key={it.name + "-" + swapKey} className={styles.ch + " " + styles.chSwap}>{combine(it.cp, tone)}</span>
            </li>
          ))}
        </ul>
        <p className={styles.sr} role="status" aria-live="polite" ref={liveRef} />
      </div>
    </main>
  );
}
