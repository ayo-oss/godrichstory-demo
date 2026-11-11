// TeamProfileDetail — vanilla 판(run/338/demo/04-team-profile-detail/index.html) 의 React 포트.
// 소개글의 clamp 전·후 scrollHeight 를 재서 실제로 넘치는 줄만 더보기 버튼을 보이고,
// clamp 줄 수가 바뀌면 그 계산을 다시 돈다(계산 한 겹).
import { useEffect, useRef } from "react";
import styles from "./TeamProfileDetail.module.scss";

export type TeamProfileDetailProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "소개글 실제 줄 수를 세로 높이로 재서, 정해 둔 줄 수보다 더 있을 때만 더보기 버튼을 보여줍니다";
const BIO_TEXT =
  "한 줄 소개 텍스트가 여기에 들어갑니다. 두 번째 줄도 이어집니다. 세 번째 줄까지 길게 이어지는 소개 문구입니다. 네 번째 줄은 잘려서 숨겨집니다.";
const MORE_TEXT = "더보기";
const LESS_TEXT = "접기";

const LINES = [3, 2];

function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0; a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEXES = ["#9fc9ec", "#93d9c0", "#b9a0ff", "#f6c6d3"];

function drawAvatar(cv: HTMLCanvasElement, seed: number, label: string): void {
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const rnd = mulberry32(seed);
  const s = cv.width;
  ctx.save();
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  ctx.clip();
  const cell = 7;
  for (let y = 0; y < s; y += cell) {
    for (let x = 0; x < s; x += cell) {
      const v = rnd();
      ctx.fillStyle = v > 0.5 ? HEXES[Math.floor(rnd() * HEXES.length)] : "rgba(23,20,26,.08)";
      ctx.fillRect(x, y, cell, cell);
    }
  }
  ctx.restore();
  ctx.fillStyle = "rgba(23,20,26,.55)";
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff7e6";
  ctx.font = "700 " + Math.round(s * 0.4) + 'px -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, s / 2, s / 2 + 1);
}

export default function TeamProfileDetail({
  duration = "300ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: TeamProfileDetailProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const bioRef = useRef<HTMLParagraphElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const card = cardRef.current;
    const cv = cvRef.current;
    const bio = bioRef.current;
    const more = moreRef.current;
    const chip = chipRef.current;
    if (!card || !cv || !bio || !more || !chip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    drawAvatar(cv, 41, "M1");

    function measure(lineClamp: number): boolean {
      bio!.style.setProperty("--clamp", String(lineClamp));
      bio!.classList.add(styles.isClamped);
      const clampedHeight = bio!.scrollHeight;
      bio!.classList.remove(styles.isClamped);
      const fullHeight = bio!.scrollHeight;
      bio!.classList.add(styles.isClamped);
      return fullHeight > clampedHeight + 1;
    }

    let isOpen = false;

    function apply(lineClamp: number): void {
      const overflow = measure(lineClamp);
      isOpen = false;
      bio!.classList.remove(styles.isOpen);
      more!.setAttribute("aria-expanded", "false");
      more!.textContent = MORE_TEXT;
      more!.style.display = overflow ? "" : "none";
      chip!.textContent = "clamp " + lineClamp + "줄 · " + (overflow ? "넘침 O" : "넘침 X");
      card!.classList.toggle(styles.isAlt);
    }

    function onMoreClick(): void {
      isOpen = !isOpen;
      bio!.classList.toggle(styles.isOpen, isOpen);
      more!.setAttribute("aria-expanded", isOpen ? "true" : "false");
      more!.textContent = isOpen ? LESS_TEXT : MORE_TEXT;
    }
    more.addEventListener("click", onMoreClick);

    let idx = 0;
    apply(LINES[0]);

    let timer = 0;
    if (!reduce) {
      timer = window.setInterval(() => {
        idx = (idx + 1) % LINES.length;
        apply(LINES[idx]);
      }, 320);
    }

    return () => {
      more!.removeEventListener("click", onMoreClick);
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.detail}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.card} ref={cardRef}>
          <canvas className={styles.cv} ref={cvRef} width={40} height={40} aria-hidden="true" />
          <div className={styles.body}>
            <p className={styles.bio} ref={bioRef}>{BIO_TEXT}</p>
            <button className={styles.more} ref={moreRef} type="button" aria-expanded="false">
              {MORE_TEXT}
            </button>
          </div>
        </div>
        <p className={styles.meta}>
          <span className={styles.chip} ref={chipRef} style={{ color }}>clamp 3줄 · 실측 대기</span>
        </p>
      </section>
    </main>
  );
}
