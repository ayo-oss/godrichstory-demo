// UploadProgressThumbnailPop — vanilla 판(run/329/demo/05-upload-progress-thumbnail-pop/index.html) 의 React 포트.
// FileReader 가 dataURL 을 다 읽는 순간(onload)을 신호로 삼아 썸네일이 0에서 오버슈트로 커지고,
// 그 아래 진행 바는 그제서야 채워지기 시작한다.
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UploadProgressThumbnailPop.module.scss";

export type UploadProgressThumbnailPopProps = {
  duration?: string;
  easing?: string;
  color?: string;
  fillMs?: number; // 팝인 뒤 바가 채워지는 데 걸리는 시간(ms)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type FileEvt = { target: { files: { length: number; 0?: File } | FileList | null } };

const HINT = "클릭해 이미지 선택";
const META = "FileReader · createObjectURL";

export default function UploadProgressThumbnailPop({
  duration = "2s",
  easing = "cubic-bezier(.34,1.56,.64,1)",
  color = "#b9a0ff",
  fillMs = 900
}: UploadProgressThumbnailPopProps) {
  const [demo, setDemo] = useState(true);
  const [popped, setPopped] = useState(false);
  const [bgUrl, setBgUrl] = useState("");
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function fillTo(pct: number, dur: number): void {
    const t0 = performance.now();
    function step(now: number): void {
      const k = Math.min(1, (now - t0) / dur);
      if (fillRef.current) fillRef.current.style.transform = "scaleX(" + (pct * k / 100) + ")";
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function onChange(e: FileEvt): void {
    const files = e.target.files as FileList | null;
    const file = files && files[0] ? files[0] : null;
    if (!file) return;
    setDemo(false);
    const reader = new FileReader();
    reader.onload = () => {
      setBgUrl(String(reader.result));
      setPopped(true);
      fillTo(100, fillMs);
    };
    reader.readAsDataURL(file);
    // 더 빠른 미리보기가 필요하면 createObjectURL 로도 즉시 참조를 만들 수 있다(여기선 즉시 해제).
    const objUrl = URL.createObjectURL(file);
    URL.revokeObjectURL(objUrl);
  }

  const rootCls = demo ? `${styles.tp} ${styles.isDemo}` : styles.tp;
  const thumbCls = popped ? `${styles.thumb} ${styles.isPop}` : styles.thumb;

  return (
    <main className={styles.stage}>
      <div className={rootCls} style={vars} role="group" tabIndex={0} aria-label="이미지 썸네일 업로드">
        <label className={styles.drop}>
          <span
            className={thumbCls}
            aria-hidden="true"
            style={bgUrl ? { backgroundImage: `url(${bgUrl})` } : undefined}
          >
            <svg viewBox="0 0 256 256" width="22" height="22"><g fill="currentColor"><path d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m-72 88l-24-24-40 40h136Z" opacity=".2"/><path d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m0 16v102.75l-26.07-26.06a16 16 0 0 0-22.63 0l-20 20-44-44a16 16 0 0 0-22.63 0L40 149.37V56ZM40 172l52-52 76 76H40Zm176 28h-4.69l-40-40 20-20L216 164.69V200Z"/></g></svg>
          </span>
          <input className={styles.input} type="file" accept="image/*" onChange={onChange} />
          <span className={styles.hint}>{HINT}</span>
        </label>
        <div className={styles.track}>
          <span className={styles.fill} ref={fillRef}></span>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META}</span>
        </div>
      </div>
    </main>
  );
}
