// CaseVideoCard — vanilla 판(run/340/demo/06-case-video-card/index.html) 의 React 포트.
// 실제 스크롤 컨테이너 안에서 카드가 뷰포트에 걸친 비율을 IntersectionObserver 로 실측해
// 준비율(%)을 매번 다시 구하고, 그 비율로 미리보기 프레임 인덱스를 정해 캔버스에 다시 그린다.
// 진짜 영상 파일은 없다 — 프레임은 mulberry32 시드 난수로 매번 다시 그리는 절차적 패턴이다.
import { useEffect, useRef } from "react";
import styles from "./CaseVideoCard.module.scss";

export type CaseVideoCardProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "카드를 스크롤해 보세요 — 실제 뷰포트에 걸친 비율만큼 준비율을 재계산하고, 그 비율만큼 미리보기 프레임을 넘깁니다";

const FRAME_COUNT = 12;
const READY_THRESHOLD = 0.62;

function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function CaseVideoCard({
  duration = "220ms",
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6"
}: CaseVideoCardProps) {
  const scrollStageRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const thumbRef = useRef<HTMLCanvasElement | null>(null);
  const playBtnRef = useRef<HTMLButtonElement | null>(null);
  const readyLabelRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const scrollStage = scrollStageRef.current;
    const card = cardRef.current;
    const thumb = thumbRef.current;
    const playBtn = playBtnRef.current;
    const readyLabel = readyLabelRef.current;
    if (!scrollStage || !card || !thumb || !playBtn || !readyLabel) return;
    const ctx = thumb.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastFrame = -1;

    function drawFrame(frameIndex: number): void {
      if (!ctx) return;
      const rnd = mulberry32(frameIndex * 7919 + 11);
      const w = thumb!.width;
      const h = thumb!.height;
      const cols = 8;
      const rows = 5;
      const cw = w / cols;
      const ch = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = rnd();
          const lightness = 22 + v * 34;
          const hue = 214 + rnd() * 18;
          ctx.fillStyle = "hsl(" + hue.toFixed(0) + ", 38%, " + lightness.toFixed(0) + "%)";
          ctx.fillRect(c * cw, r * ch, cw + 1, ch + 1);
        }
      }
      ctx.fillStyle = "rgba(255,255,255,.06)";
      for (let i = 0; i < 3; i++) {
        const bx = rnd() * w;
        const by = rnd() * h;
        const br = 8 + rnd() * 18;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function update(ratio: number): void {
      const percent = Math.round(ratio * 100);
      readyLabel!.textContent = "준비율 " + percent + "%";
      const frameIndex = Math.min(FRAME_COUNT - 1, Math.floor(ratio * (FRAME_COUNT - 1)));
      if (frameIndex !== lastFrame) {
        lastFrame = frameIndex;
        drawFrame(frameIndex);
      }
      if (ratio >= READY_THRESHOLD) {
        playBtn!.classList.add(styles.playBtnReady);
        playBtn!.disabled = false;
      } else {
        playBtn!.classList.remove(styles.playBtnReady);
        playBtn!.disabled = true;
      }
    }

    drawFrame(0);
    update(0);

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        update(entry.intersectionRatio);
      },
      {
        root: scrollStage,
        threshold: Array.from({ length: 51 }, (_, i) => i / 50)
      }
    );
    io.observe(card);

    function onPlayClick(): void {
      if (playBtn!.disabled) return;
      playBtn!.classList.add(styles.playBtnPressed);
      window.setTimeout(() => playBtn!.classList.remove(styles.playBtnPressed), 260);
    }
    playBtn.addEventListener("click", onPlayClick);

    let raf = 0;
    if (!reduce) {
      const tick = () => {
        const max = scrollStage!.scrollHeight - scrollStage!.clientHeight;
        const t = performance.now() / 1400;
        const wave = (Math.sin(t) + 1) / 2;
        scrollStage!.scrollTop = wave * max;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      io.disconnect();
      playBtn.removeEventListener("click", onPlayClick);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.panel}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.scrollStage} ref={scrollStageRef}>
          <div className={styles.scrollSpacer} aria-hidden="true" />
          <article className={styles.card} ref={cardRef}>
            <canvas className={styles.thumb} ref={thumbRef} width={240} height={135} aria-hidden="true" />
            <button className={styles.playBtn} type="button" aria-label="사례 영상 미리보기 재생" ref={playBtnRef}>
              <svg className={styles.playIcon} xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256">
                <g fill="currentColor">
                  <path d="M228.23 134.69L84.15 222.81A8 8 0 0 1 72 216.12V39.88a8 8 0 0 1 12.15-6.69l144.08 88.12a7.82 7.82 0 0 1 0 13.38" opacity=".2" />
                  <path d="M232.4 114.49L88.32 26.35a16 16 0 0 0-16.2-.3A15.86 15.86 0 0 0 64 39.87v176.26A15.94 15.94 0 0 0 80 232a16.07 16.07 0 0 0 8.36-2.35l144.04-88.14a15.81 15.81 0 0 0 0-27ZM80 215.94V40l143.83 88Z" />
                </g>
              </svg>
            </button>
            <p className={styles.readyLabel} ref={readyLabelRef}>준비율 0%</p>
          </article>
          <div className={styles.scrollSpacer} aria-hidden="true" />
        </div>
      </section>
    </main>
  );
}
