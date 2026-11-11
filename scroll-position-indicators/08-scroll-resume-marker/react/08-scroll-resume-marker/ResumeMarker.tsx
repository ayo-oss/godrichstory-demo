import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ResumeMarker.module.scss";

export type ResumeMarkerProps = {
  title?: string;
  stateReading?: string;
  stateSaved?: string;
  paragraphs?: string[];
  say?: string;
  pillLabel?: string;
  groupLabel?: string;
  bodyLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type ScrollBox = { scrollTop: number; scrollHeight: number; clientHeight: number; scrollTo: (o: { top: number; behavior: string }) => void };

const DEFAULT_PARAGRAPHS = [
  "이 문서는 중간에 두고 나갔다 돌아오는 사람을 위한 문서예요.",
  "읽던 깊이가 점선으로 남고, 그 줄이 화면 위로 밀려나면 알약이 올라와요.",
  "세 번째 문단쯤에서 잠깐 나갔다 왔다고 상상해 보세요.",
  "네 번째 문단은 환불 규칙에 대한 이야기입니다.",
  "다섯 번째 문단은 문의처와 운영 시간을 안내합니다.",
  "여기까지 내려오면 거의 다 읽은 거예요.",
];

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M192,176v48l-64-40L64,224V176l64-40Z" opacity="0.2"/><path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Zm0,16V161.57l-51.77-32.35a8,8,0,0,0-8.48,0L72,161.56V48ZM132.23,177.22a8,8,0,0,0-8.48,0L72,209.57V180.43l56-35,56,35v29.14Z"/></svg>
  );
}

export default function ResumeMarker({
  title = "도움말 · 자주 묻는 질문",
  stateReading = "처음부터 읽는 중",
  stateSaved = "읽던 자리가 남아 있어요",
  paragraphs = DEFAULT_PARAGRAPHS,
  say = "읽던 자리로 돌아갈까요?",
  pillLabel = "읽던 자리로 돌아가기",
  groupLabel = "읽던 자리 이어읽기",
  bodyLabel = "도움말 본문",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ResumeMarkerProps) {
  const [deep, setDeep] = useState(false);
  const [live, setLive] = useState(demo);
  const [liveText, setLiveText] = useState("읽기 시작");
  const [markTop, setMarkTop] = useState(0);
  const viewRef = useRef<ScrollBox>(null);
  const deepestRef = useRef(0);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 가장 깊이 내려갔던 scrollTop 자리에 점선이 남는다
  function onScroll() {
    const el = viewRef.current;
    if (!el) return;
    setLive(false);
    const next = Math.max(deepestRef.current || 0, el.scrollTop);
    deepestRef.current = next;
    setMarkTop(next);
    const max = el.scrollHeight - el.clientHeight;
    const pct = max > 0 ? Math.round((el.scrollTop / max) * 100) : 0;
    const pushed = next > 24 && el.scrollTop + el.clientHeight < next + 8 && el.scrollTop < next - 8;
    setDeep(pushed);
    setLiveText(pushed ? "읽던 자리가 " + Math.round((next / (max || 1)) * 100) + "% 지점에 남아 있어요" : pct > 8 ? "읽는 중 · " + pct + "%" : "읽기 시작");
  }

  function back() {
    setLive(false);
    const el = viewRef.current;
    if (!el) return;
    el.scrollTo({ top: deepestRef.current || 0, behavior: "smooth" });
  }

  const cls = [styles.rs, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.head}>
        <p className={styles.rtitle}>{title}</p>
        <p className={styles.state}>{deep ? stateSaved : stateReading}</p>
      </header>
      <div className={styles.view} ref={viewRef} onScroll={onScroll} tabIndex={0} role="region" aria-label={bodyLabel}>
        <div className={styles.pad}>
          {paragraphs.map((p) => (
            <p className={styles.p} key={p}>{p}</p>
          ))}
          <span className={styles.mark} style={{ top: (live ? 96 : markTop) + "px" }} aria-hidden="true"></span>
        </div>
      </div>
      <button className={`${styles.pill} ${deep ? styles.up : ""}`} type="button" aria-label={pillLabel} onClick={back}>
        <BookmarkIcon />
        <span className={styles.psay}>{say}</span>
      </button>
      <p className={styles.plive} aria-live="polite">{liveText}</p>
    </section>
  );
}
