import { useEffect, useRef } from "react";
import styles from "./CopyRichTextToast.module.scss";

// 서식 종류 토스트 — 복사된 내용에 서식이 몇 종류 섞였는지 세어(굵게·기울임·코드)
// 그 수만큼 토스트의 라벨 폭을 다시 계산해 늘리고 종류 뱃지가 순서대로 붙는다.
// 계산 겹: DOM 태그 종류 카운트 → 라벨 실측 scrollWidth → 뱃지 폭 합산 → 토스트 min-width 재계산.
// 실사용자 리스너 있음(서식째 복사 버튼). 실 클립보드 API 호출 없음 — 상태는 시뮬레이션.
const KIND_LABELS: Record<string, string> = { strong: "굵게", em: "기울임", code: "코드" };
const BADGE_STAGGER_MS = 160;

const SAMPLES = [
  '이 문단은 <strong>굵게</strong>만 있어요',
  '이 문단은 <strong>굵게</strong>와 <em>기울임</em>이 섞여 있어요',
  '이 문단은 <strong>굵게</strong>와 <em>기울임</em>과 <code>코드</code>가 섞여 있어요',
];
const SAMPLE_MS = 660;
const CYCLE_MS = SAMPLE_MS * SAMPLES.length;

export default function CopyRichTextToast() {
  const previewRef = useRef<HTMLParagraphElement>(null);
  const copyBtnRef = useRef<HTMLButtonElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const toastLabelRef = useRef<HTMLSpanElement>(null);
  const badgesRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const preview = previewRef.current;
    const copyBtn = copyBtnRef.current;
    const toast = toastRef.current;
    const toastLabel = toastLabelRef.current;
    const badgesEl = badgesRef.current;
    if (!preview || !copyBtn || !toast || !toastLabel || !badgesEl) return;

    let badgeTimers: number[] = [];

    function clearBadgeTimers() {
      badgeTimers.forEach((id) => clearTimeout(id));
      badgeTimers = [];
    }

    function countKinds() {
      const found: string[] = [];
      ["strong", "em", "code"].forEach((tag) => {
        if (preview!.querySelector(tag)) found.push(tag);
      });
      return found;
    }

    function measureAndSize(count: number) {
      const labelWidth = toastLabel!.scrollWidth;
      const badgeWidth = count * 46;
      const total = labelWidth + badgeWidth + 40;
      toast!.style.minWidth = `${total}px`;
    }

    function showToast(sampleIndex: number) {
      preview!.innerHTML = SAMPLES[sampleIndex];
      const kinds = countKinds();
      clearBadgeTimers();
      toastLabel!.textContent = `서식 ${kinds.length}종 복사됨`;
      badgesEl!.innerHTML = "";
      measureAndSize(0);
      toast!.classList.add(styles.isVisible);

      kinds.forEach((kind, index) => {
        const timer = window.setTimeout(() => {
          const b = document.createElement("span");
          b.className = styles.badge;
          b.textContent = KIND_LABELS[kind];
          badgesEl!.appendChild(b);
          measureAndSize(index + 1);
        }, index * BADGE_STAGGER_MS);
        badgeTimers.push(timer);
      });
    }

    showToast(0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    if (!reduce) {
      let start: number | null = null;
      let lastSample = -1;
      const autoLoop = (ts: number) => {
        if (start === null) start = ts;
        const elapsed = ts - start;
        const t = elapsed % CYCLE_MS;
        const sampleIndex = Math.floor(t / SAMPLE_MS) % SAMPLES.length;
        if (sampleIndex !== lastSample) {
          lastSample = sampleIndex;
          showToast(sampleIndex);
        }
        raf = requestAnimationFrame(autoLoop);
      };
      raf = requestAnimationFrame(autoLoop);
    }

    function onCopy() {
      showToast(0);
    }
    copyBtn.addEventListener("click", onCopy);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearBadgeTimers();
      copyBtn.removeEventListener("click", onCopy);
    };
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.panel}>
        <p ref={previewRef} className={styles.preview}>
          이 문단은 <strong>굵게</strong>와 <em>기울임</em>과 <code>코드</code>가 섞여 있어요
        </p>
        <button ref={copyBtnRef} className={styles.copyBtn} type="button">서식째 복사</button>
        <div ref={toastRef} className={styles.toast}>
          <span ref={toastLabelRef} className={styles.toastLabel}>서식 0종 복사됨</span>
          <span ref={badgesRef} className={styles.badges} />
        </div>
      </section>
    </div>
  );
}
