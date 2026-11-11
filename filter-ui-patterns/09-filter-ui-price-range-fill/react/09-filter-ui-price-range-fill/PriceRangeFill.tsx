import { useEffect, useRef } from "react";
import styles from "./PriceRangeFill.module.scss";

// 최소·최대 두 입력값의 차이를 퍼센트 좌표로 다시 구해 calc() 로 채움 막대의 양 끝(left·right)을 그린다.
// 실제 입력: input[type=range] 의 input 이벤트. 데모는 시드 고정 값 쌍을 순서대로 재생한다.
const SEQ: [number, number][] = [
  [20, 70],
  [5, 40],
  [55, 95],
  [20, 70],
];

function priceLabel(v: number) {
  return (v * 1000).toLocaleString("ko-KR") + "원";
}

export default function PriceRangeFill() {
  const minInputRef = useRef<HTMLInputElement>(null);
  const maxInputRef = useRef<HTMLInputElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const minLabelRef = useRef<HTMLSpanElement>(null);
  const maxLabelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const minInput = minInputRef.current;
    const maxInput = maxInputRef.current;
    const fill = fillRef.current;
    if (!minInput || !maxInput || !fill) return;

    function update() {
      let minV = Number(minInput!.value);
      let maxV = Number(maxInput!.value);
      if (minV > maxV) {
        const t = minV;
        minV = maxV;
        maxV = t;
      }
      fill!.style.setProperty("--min-pct", String(minV));
      fill!.style.setProperty("--max-pct", String(maxV));
      if (minLabelRef.current) minLabelRef.current.textContent = priceLabel(minV);
      if (maxLabelRef.current) maxLabelRef.current.textContent = priceLabel(maxV);
    }

    minInput.addEventListener("input", update);
    maxInput.addEventListener("input", update);
    update();

    let idx = 0;
    let timerId = 0;
    let alive = true;
    (function step() {
      timerId = window.setTimeout(() => {
        if (!alive) return;
        idx = (idx + 1) % SEQ.length;
        minInput!.value = String(SEQ[idx][0]);
        maxInput!.value = String(SEQ[idx][1]);
        update();
        step();
      }, 550);
    })();

    return () => {
      alive = false;
      window.clearTimeout(timerId);
      minInput.removeEventListener("input", update);
      maxInput.removeEventListener("input", update);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.range}>
        <div className={styles.range__track}>
          <div ref={fillRef} className={styles.range__fill} />
        </div>
        <input
          ref={minInputRef}
          className={styles.range__input}
          type="range"
          min={0}
          max={100}
          step={1}
          defaultValue={20}
          aria-label="최소 가격"
        />
        <input
          ref={maxInputRef}
          className={styles.range__input}
          type="range"
          min={0}
          max={100}
          step={1}
          defaultValue={70}
          aria-label="최대 가격"
        />
      </div>
      <div className={styles.range__labels}>
        <span ref={minLabelRef}>20,000원</span>
        <span ref={maxLabelRef}>70,000원</span>
      </div>
    </main>
  );
}
