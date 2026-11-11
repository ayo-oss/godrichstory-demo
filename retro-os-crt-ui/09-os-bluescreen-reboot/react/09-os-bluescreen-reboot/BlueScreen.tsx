// BlueScreen — vanilla 판(run/023/demo/09-os-bluescreen-reboot/index.html) 의 React 포트.
// 오류 문구는 steps(1, end) 컷으로 한 프레임에 통째로 나타나고(중간 키프레임 7%·8% 가 컷 지점),
// 안내 줄의 점 세 개는 음수 animation-delay 로 위상을 밀어 차례로 켜진 뒤 켜진 채로 남는다.
// 재시작을 누르면 clip-path 위프(이징 짝 애니메이션)로 위에서 아래로 쓸려 사라지고 원래 창이
// 드러난다 — 퇴장이 주제여도 루프에서 화면이 비는 순간은 없다.
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BlueScreen.module.scss";

export type BlueScreenProps = {
  duration?: number;
  easing?: string;
  color?: string;
  winTitle?: string;
  crashText?: string;
  restartText?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 타입에 TransitionEvent 가 없다 — 쓰는 속성만 로컬 타입으로 선언한다
type TransEvt = { propertyName: string };
// useRef<T> 는 { current: T | null } 을 돌려준다 — ambient 타입에 맞춘 상자 타입
type Box<T> = { current: T | null };

const WIN_TITLE = "시스템 정보";
const CRASH = "시스템 오류";
const RESTART = "재시작";
const ROWS: { k: string; v: string }[] = [
  { k: "프로세서", v: "486DX2 66MHz" },
  { k: "메모리", v: "16 MB" },
  { k: "디스크", v: "540 MB" },
];
const ERR_LINES = [
  "치명적 오류 0E : 016F : BFF9B3D4",
  "VXD VMM(01) 을 처리하다 문제가 생겼습니다",
  "현재 작업을 저장하고 시스템을 다시 시작합니다",
];
const GUIDE = "상태를 저장하는 중";

export default function BlueScreen(props: BlueScreenProps) {
  const duration = props.duration ?? 600;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#0a4fe8";
  const winTitle = props.winTitle ?? WIN_TITLE;
  const crashText = props.crashText ?? CRASH;
  const restartText = props.restartText ?? RESTART;
  const [preview, setPreview] = useState<boolean>(true);
  const [crashed, setCrashed] = useState<boolean>(false);
  const [wiped, setWiped] = useState<boolean>(false);
  const restartRef = useRef<HTMLButtonElement>(null) as Box<HTMLButtonElement>;

  const leave = () => setPreview(false);

  // 시스템 오류 — 파란 화면이 한 프레임에 통째로 뜬다(전환이라 트랜지션 없이 상태만).
  // 포커스는 iframe 안 데모라 부모 스크롤을 밀지 않도록 preventScroll 과 함께
  const onCrash = () => {
    setWiped(false);
    setCrashed(true);
    if (restartRef.current) restartRef.current.focus({ preventScroll: true });
  };

  // 재시작 — 화면이 위에서 아래로 쓸려 사라지고 원래 창이 드러난다
  const onRestart = () => setWiped(true);

  const onWipeEnd = (e: TransEvt) => {
    if (e.propertyName !== "clip-path") return;
    setCrashed(false);
    setWiped(false);
  };

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div
        className={styles.root + (preview ? " " + styles.isDemo : "")}
        style={vars}
        onPointerDown={leave}
      >
        <div className={styles.win}>
          <div className={styles.title}>
            <span className={styles.tico} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256">
                <g fill="currentColor">
                  <path d="M128 144h80v72l-80-14.55Zm-96 40l64 11.64V144H32Zm96-129.45V112h80V40ZM32 112h64V60.36L32 72Z" opacity=".2" />
                  <path d="M208 136h-80a8 8 0 0 0-8 8v57.45a8 8 0 0 0 6.57 7.88l80 14.54a7.6 7.6 0 0 0 1.43.13a8 8 0 0 0 8-8v-72a8 8 0 0 0-8-8m-8 70.41l-64-11.63V152h64ZM96 136H32a8 8 0 0 0-8 8v40a8 8 0 0 0 6.57 7.87l64 11.64a8.5 8.5 0 0 0 1.43.13a8 8 0 0 0 8-8V144a8 8 0 0 0-8-8m-8 50.05l-48-8.73V152h48ZM213.13 33.86a8 8 0 0 0-6.56-1.73l-80 14.55a8 8 0 0 0-6.57 7.87V112a8 8 0 0 0 8 8h80a8 8 0 0 0 8-8V40a8 8 0 0 0-2.87-6.14M200 104h-64V61.22l64-11.63Zm-98.87-49.78a8 8 0 0 0-6.56-1.73l-64 11.64A8 8 0 0 0 24 72v40a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8V60.36a8 8 0 0 0-2.87-6.14M88 104H40V78.68L88 70Z" />
                </g>
              </svg>
            </span>
            <span className={styles.tname}>{winTitle}</span>
            <span className={styles.tbtns} aria-hidden="true">
              <span className={styles.gb + " " + styles.gbMin} />
              <span className={styles.gb} />
            </span>
          </div>
          <div className={styles.wbody}>
            {ROWS.map((row, i) => (
              <p key={i} className={styles.row + (i > 0 ? " " + styles.rowGap : "")}>
                <span className={styles.k}>{row.k}</span>
                <span className={styles.v}>{row.v}</span>
              </p>
            ))}
            <div className={styles.actions}>
              <button type="button" className={styles.btn} onClick={onCrash}>
                {crashText}
              </button>
            </div>
          </div>
        </div>
        <div
          className={
            styles.screen +
            (crashed ? " " + styles.isCrash : "") +
            (wiped ? " " + styles.isWiped : "")
          }
          onTransitionEnd={onWipeEnd}
        >
          <div className={styles.err}>
            {ERR_LINES.map((text, i) => (
              <p key={i} className={styles.eline}>
                {text}
              </p>
            ))}
          </div>
          <div className={styles.guide}>
            <span className={styles.gtext}>{GUIDE}</span>
            <span className={styles.dots} aria-hidden="true">
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </span>
          </div>
          <div className={styles.sact}>
            <button
              type="button"
              className={styles.btn + " " + styles.btnS}
              ref={restartRef}
              onClick={onRestart}
            >
              {restartText}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
