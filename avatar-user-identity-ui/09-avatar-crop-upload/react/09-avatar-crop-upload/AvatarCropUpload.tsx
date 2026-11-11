import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./AvatarCropUpload.module.scss";

export type AvatarCropUploadProps = {
  label?: string;
  windowLabel?: string;
  zoomLabel?: string;
  /** 사진이 이동·확대했다 되돌아오는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 카메라 아이콘·초점 테두리·슬라이더 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--x"?: string;
  "--y"?: string;
  "--z"?: string;
};
type Box<T> = { current: T };
type PointerEvt = { clientX: number; clientY: number; pointerId: number; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type RangeEvt = { target: { value: string } };

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-4, 0],
  ArrowRight: [4, 0],
  ArrowUp: [0, -4],
  ArrowDown: [0, 4],
};

const CameraIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true" focusable="false" fill="currentColor" className={styles.cam}>
    <path d="M208,64H176L160,40H96L80,64H48A16,16,0,0,0,32,80V192a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V80A16,16,0,0,0,208,64ZM128,168a36,36,0,1,1,36-36A36,36,0,0,1,128,168Z" opacity="0.2" />
    <path d="M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8ZM128,88a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,88Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,128,160Z" />
  </svg>
);

export default function AvatarCropUpload({
  label = "프로필 사진 위치 잡기",
  windowLabel = "사진을 끌어 위치를 맞추는 창",
  zoomLabel = "확대 배율",
  duration = 2000,
  easing = "ease-out",
  color = "#b9a0ff",
}: AvatarCropUploadProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [x, setX] = useState<number>(0);
  const [y, setY] = useState<number>(0);
  const [z, setZ] = useState<number>(1);
  const win = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const drag = useRef<{ id: number; px: number; py: number } | null>(null) as Box<{ id: number; px: number; py: number } | null>;

  // 핵심 — 허용 이동 범위는 maxOffset = (사진크기 × 배율 − 창크기) / 2.
  // 배율을 줄이면 범위가 먼저 좁아지므로 창 가장자리에 빈 여백이 절대 생기지 않는다.
  // 사진 바탕은 창의 1.5배(inset -25%).
  function clamp(v: number, zz: number): number {
    const el = win.current;
    if (!el) return v;
    const w = el.offsetWidth;                        // 창 크기(렌더 변환과 무관)
    const m = Math.max(0, (w * 1.5 * zz - w) / 2);
    return Math.max(-m, Math.min(m, v));
  }

  // 끌기 — setPointerCapture 로 창 밖으로 나가도 놓치지 않는다
  function onDown(e: PointerEvt) {
    drag.current = { id: e.pointerId, px: e.clientX, py: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e: PointerEvt) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    setX((prev) => clamp(prev + e.clientX - d.px, z));
    setY((prev) => clamp(prev + e.clientY - d.py, z));
    drag.current = { id: d.id, px: e.clientX, py: e.clientY };
  }
  function onUp(e: PointerEvt) {
    if (drag.current && e.pointerId === drag.current.id) drag.current = null;
  }

  // 배율이 바뀌면 현재 x·y 를 새 범위로 다시 물린다(clamp)
  function onZoom(e: RangeEvt) {
    const nz = parseFloat(e.target.value);
    setZ(nz);
    setX((prev) => clamp(prev, nz));
    setY((prev) => clamp(prev, nz));
  }

  // 키보드 — 화살표 키로 4px 씩 움직인다
  function onKey(e: KeyEvt) {
    const step = ARROWS[e.key];
    if (!step) return;
    e.preventDefault();
    setX((prev) => clamp(prev + step[0], z));
    setY((prev) => clamp(prev + step[1], z));
  }

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--x": `${x}px`,
    "--y": `${y}px`,
    "--z": `${z}`,
  };

  return (
    <section
      className={loop ? `${styles.cu} ${styles.isDemo}` : styles.cu}
      style={vars}
      aria-label={label}
      onPointerDown={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      {/* 테두리와 창은 제자리 — 움직이는 것은 그 안의 사진뿐이다. 사진 파일은 쓰지 않는다 */}
      <div className={styles.frame}>
        <div
          className={styles.window}
          tabIndex={0}
          aria-label={windowLabel}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => { drag.current = null; }}
          onKeyDown={onKey}
        >
          <div className={styles.photo} aria-hidden="true" />
        </div>
      </div>

      <div className={styles.controls}>
        <CameraIcon />
        <input
          className={styles.zoom}
          type="range"
          min="1"
          max="2"
          step="0.01"
          defaultValue="1"
          aria-label={zoomLabel}
          onChange={onZoom}
        />
        {/* 결과 미리보기 — 같은 그라디언트를 4분의 1 이동으로 미러한다 */}
        <span className={styles.preview} aria-hidden="true"><span className={styles.mini} /></span>
      </div>
    </section>
  );
}
