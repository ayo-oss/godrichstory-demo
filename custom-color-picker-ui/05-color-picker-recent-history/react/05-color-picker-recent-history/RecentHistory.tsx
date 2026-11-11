// RecentHistory — vanilla 판(run/286/demo/05-color-picker-recent-history) 의 React 포트.
// 변수 3개(duration·easing·color)는 props 로 받아 CSS 변수(var(--duration) 등)로 들어온다.
// 칸 색은 등록 속성 --c 하나로만 들어간다. 사람이 쓸 때는 인라인 스타일로,
// 격자 미리보기에서는 module.scss 의 키프레임이 같은 --c 를 덮어쓴다 — 한 경로로 둘 다 된다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RecentHistory.module.scss";

export type RecentHistoryProps = {
  addLabel?: string;
  capLabel?: string;
  /** "지금 색 %x, 누르면 다음 색" 처럼 자리표시자 하나를 가진 틀 */
  nowFormat?: string;
  /** "최근 색 %x" 처럼 자리표시자 하나를 가진 틀 */
  cellFormat?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

type Swatch = CSSProperties & { "--c"?: string };

const PALETTE = ["#2F6DF6", "#6EC8FF", "#4CD4A6", "#FFD23F", "#FF4D1F", "#FF9EBB", "#B9A0FF", "#FFF7E6"];
const STORE_KEY = "godrich-recent-colors";

// 목록은 localStorage 에 남는다. 저장소가 막힌 환경에서도 기본 팔레트로 이어간다
function read(): string[] {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const list: string[] | null = raw ? JSON.parse(raw) : null;
    if (list && list.length) return list.slice(0, 8);
  } catch (err) {
    /* 저장소를 못 쓰는 환경 */
  }
  return PALETTE.slice();
}

function save(list: string[]) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch (err) {
    /* 무시 */
  }
}

export default function RecentHistory({
  addLabel = "담기",
  capLabel = "최근 고른 색",
  nowFormat = "지금 색 %x, 누르면 다음 색",
  cellFormat = "최근 색 %x",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#2f6df6",
}: RecentHistoryProps) {
  const [live, setLive] = useState(demo);
  const [step, setStep] = useState(0);
  const [recent, setRecent] = useState<string[]>(PALETTE.slice());

  // 서버 렌더에서는 저장소가 없으므로 붙은 뒤에 한 번 읽는다
  useEffect(() => {
    setRecent(read());
  }, []);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  const nowColor = PALETTE[step];

  function add() {
    setLive(false);
    // 지금 색이 맨 앞에 끼어들고 아홉 번째는 잘려 나간다. 저장한 뒤 다시 읽어 칸을 그린다
    const next = [nowColor].concat(recent.filter((hex) => hex !== nowColor)).slice(0, 8);
    save(next);
    setRecent(read());
  }

  function pick(hex: string) {
    setLive(false);
    const at = PALETTE.indexOf(hex);
    if (at >= 0) setStep(at);
  }

  return (
    <div className={[styles.rc, live ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
      <div className={styles.top}>
        <button
          className={styles.now}
          type="button"
          aria-label={nowFormat.replace("%x", nowColor)}
          style={{ "--c": nowColor } as Swatch}
          onClick={() => {
            setLive(false);
            setStep((step + 1) % PALETTE.length);
          }}
        />
        <button className={styles.add} type="button" onClick={add}>
          {addLabel}
        </button>
      </div>
      <p className={styles.cap} aria-hidden="true">
        {capLabel}
      </p>
      <div className={styles.hist}>
        {recent.map((hex, i) => (
          <button
            key={`${hex}-${i}`}
            className={styles.cell}
            type="button"
            aria-pressed={hex === nowColor}
            aria-label={cellFormat.replace("%x", hex)}
            style={{ "--c": hex } as Swatch}
            onClick={() => pick(hex)}
          />
        ))}
      </div>
    </div>
  );
}
