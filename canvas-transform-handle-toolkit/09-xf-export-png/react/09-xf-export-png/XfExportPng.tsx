import { useEffect, useRef } from 'react';
import styles from './XfExportPng.module.scss';

const FILL_A = '#ffb199';
const FILL_B = '#8ec5ff';
const ROTATE_SPEED_DEG_PER_S = 26;
const AUTO_PREVIEW_MS = 700;

export default function XfExportPng() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const scene = scene0;
    const subject0 = scene.querySelector<HTMLDivElement>('.' + styles.subjectShape);
    const canvas0 = scene.querySelector<HTMLCanvasElement>('.' + styles.exportCanvas);
    const img0 = scene.querySelector<HTMLImageElement>('.' + styles.previewImg);
    const btn0 = scene.querySelector<HTMLButtonElement>('.' + styles.exportBtn);
    const status0 = scene.querySelector<HTMLDivElement>('.' + styles.status);
    const ctx0 = canvas0 ? canvas0.getContext('2d') : null;
    if (!subject0 || !canvas0 || !img0 || !btn0 || !status0 || !ctx0) return undefined;
    const subject = subject0;
    const canvas = canvas0;
    const img = img0;
    const btn = btn0;
    const status = status0;
    const ctx = ctx0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let angle = 0, scale = 1;
    let rafId = 0;
    let timers: number[] = [];

    function roundedRectPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }

    // 오브젝트를 canvas.toDataURL 로 내보내기: 화면의 subjectShape 와 같은 회전·비율을 ctx 변환으로
    // 그대로 재현한 뒤(대칭 산술), roundRect 경로 + gradient 를 채우고 PNG 데이터 URL 을 만든다.
    // 실제 파일 저장·다운로드·클립보드 기록은 하지 않는다 — 미리보기 이미지 생성까지만 시뮬레이션한다.
    function generatePreview() {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle * Math.PI / 180);
      ctx.scale(scale, scale);
      const grad = ctx.createLinearGradient(-34, -34, 34, 34);
      grad.addColorStop(0, FILL_A);
      grad.addColorStop(1, FILL_B);
      ctx.fillStyle = grad;
      roundedRectPath(ctx, -34, -34, 68, 68, 14);
      ctx.fill();
      ctx.restore();
      img.src = canvas.toDataURL('image/png');
      status.textContent = '생성됨';
    }

    function human() {
      if (scene.classList.contains(styles['is-demo'])) {
        scene.classList.remove(styles['is-demo']);
        timers.forEach((t) => window.clearTimeout(t));
        timers = [];
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      }
    }

    function onClick() {
      human();
      generatePreview();
    }
    btn.addEventListener('click', onClick);

    // reduce: 실사용 경로 적용 — 버튼 클릭 시 generatePreview() 는 현재 각도·비율을 그대로 그려
    // 트윈 없이 즉시 PNG 를 만든다. 아래 ambient()/자동 미리보기는 시연 게이트만이며 reduce 에서는 돌지 않는다.
    function ambient(now: number) {
      if (!scene.classList.contains(styles['is-demo'])) return;
      const t = now / 1000;
      angle = (t * ROTATE_SPEED_DEG_PER_S) % 360;
      scale = 1 + Math.sin(t * 1.4) * 0.12;
      subject.style.transform = 'rotate(' + angle.toFixed(1) + 'deg) scale(' + scale.toFixed(3) + ')';
      rafId = requestAnimationFrame(ambient);
    }

    function autoPreviewLoop() {
      if (!scene.classList.contains(styles['is-demo'])) return;
      generatePreview();
      timers.push(window.setTimeout(autoPreviewLoop, AUTO_PREVIEW_MS));
    }

    generatePreview();
    if (!reduce) {
      rafId = requestAnimationFrame(ambient);
      timers.push(window.setTimeout(autoPreviewLoop, AUTO_PREVIEW_MS));
    }

    return () => {
      btn.removeEventListener('click', onClick);
      timers.forEach((t) => window.clearTimeout(t));
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.scene + ' ' + styles['is-demo']} ref={sceneRef}>
        <div className={styles.frame}>
          <div className={styles.subjectShape}></div>
        </div>
        <div className={styles.exportPanel}>
          <canvas width={96} height={96} className={styles.exportCanvas} aria-hidden="true"></canvas>
          <div className={styles.previewBox}>
            <img className={styles.previewImg} alt="내보낸 PNG 미리보기" />
          </div>
          <button type="button" className={styles.exportBtn}>미리보기 생성</button>
          <div className={styles.status} aria-live="polite">대기</div>
        </div>
      </div>
    </main>
  );
}
