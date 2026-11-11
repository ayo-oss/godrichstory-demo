import { useEffect, useRef } from 'react';
import styles from './XfZOrder.module.scss';

const POP_MS = 360;
const LOOP_MS = 1000;
const SEQUENCE = [0, 2, 1, 3];

export default function XfZOrder() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const scene = scene0;
    const cards = Array.from(scene.querySelectorAll<HTMLDivElement>('.' + styles.card));
    const btnFront0 = scene.querySelector<HTMLButtonElement>('#btnFront');
    const btnBack0 = scene.querySelector<HTMLButtonElement>('#btnBack');
    const status0 = scene.querySelector<HTMLDivElement>('.' + styles.status);
    if (cards.length === 0 || !btnFront0 || !btnBack0 || !status0) return undefined;
    const btnFront = btnFront0;
    const btnBack = btnBack0;
    const status = status0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // order: 뒤(0번째)→앞(마지막) 순으로 쌓인 카드 id 배열. z-index 는 이 배열 안의 위치(index+1)로만 정해진다.
    let order = [0, 1, 2, 3];
    let selectedId = 1;
    const popRaf: Record<number, number> = {};
    let timers: number[] = [];

    function easeOutBack(t: number) {
      const c = 1.7;
      return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
    }

    function applyZ() {
      cards.forEach((card) => {
        const id = Number(card.dataset.id);
        const z = order.indexOf(id) + 1;
        card.style.zIndex = String(z);
        card.classList.toggle(styles.isSelected, id === selectedId);
        card.setAttribute('aria-pressed', String(id === selectedId));
      });
      status.textContent = '순서 ' + order.join(' ');
    }

    // 앞으로 온 카드가 살짝 들렸다 앉는 팝: z 변화를 눈에 보이게 하는 산술 트윈(easeOutBack 오버슛).
    function popCard(card: HTMLDivElement) {
      const id = Number(card.dataset.id);
      if (popRaf[id]) cancelAnimationFrame(popRaf[id]);
      const start = performance.now();
      function step(now: number) {
        const p = Math.min(1, (now - start) / POP_MS);
        const lift = (1 - Math.abs(2 * p - 1)) * 0.1;
        card.style.setProperty('--lift', lift.toFixed(3));
        if (p < 1) popRaf[id] = requestAnimationFrame(step);
        else { card.style.setProperty('--lift', '0'); popRaf[id] = 0; }
      }
      popRaf[id] = requestAnimationFrame(step);
    }

    // 배열 재정렬 → z-index: 선택된 id 를 order 배열 안에서 한 칸 옮기고, 그 배열의 위치를 그대로
    // z-index 로 다시 매긴다. 스타일 값을 직접 고르는 게 아니라 배열 연산의 결과로 z 가 나온다.
    function swapNeighbor(dir: number) {
      const idx = order.indexOf(selectedId);
      const next = idx + dir;
      if (next < 0 || next >= order.length) return;
      const tmp = order[idx];
      order[idx] = order[next];
      order[next] = tmp;
      applyZ();
      popCard(cards[selectedId]);
    }

    function bringToFront(id: number) {
      order = order.filter((v) => v !== id);
      order.push(id);
      selectedId = id;
      applyZ();
      popCard(cards[selectedId]);
    }

    function human() {
      if (scene.classList.contains(styles['is-demo'])) {
        scene.classList.remove(styles['is-demo']);
        timers.forEach((t) => window.clearTimeout(t));
        timers = [];
        Object.keys(popRaf).forEach((k) => {
          const id = Number(k);
          if (popRaf[id]) { cancelAnimationFrame(popRaf[id]); popRaf[id] = 0; }
        });
      }
    }

    function selectCard(id: number) {
      human();
      selectedId = id;
      applyZ();
    }

    const cleanups: Array<() => void> = [];
    cards.forEach((card) => {
      const id = Number(card.dataset.id);
      function onClick() { selectCard(id); }
      function onKey(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCard(id); }
      }
      card.addEventListener('click', onClick);
      card.addEventListener('keydown', onKey);
      cleanups.push(() => {
        card.removeEventListener('click', onClick);
        card.removeEventListener('keydown', onKey);
      });
    });

    function onFront() { human(); swapNeighbor(1); }
    function onBack() { human(); swapNeighbor(-1); }
    btnFront.addEventListener('click', onFront);
    btnBack.addEventListener('click', onBack);

    applyZ();

    // reduce: 실사용 경로 적용 — 카드 선택·앞으로/뒤로 버튼은 applyZ() 로 즉시 반영된다(팝은 계산 트윈이라 즉시 최종 상태).
    // 아래 자동 루프는 시연 게이트만 — 정해진 순서로 카드를 차례로 맨 앞에 올리며 reduce 에서는 돌지 않는다.
    let seqI = 0;
    function loop() {
      if (!scene.classList.contains(styles['is-demo'])) return;
      seqI = (seqI + 1) % SEQUENCE.length;
      bringToFront(SEQUENCE[seqI]);
      timers.push(window.setTimeout(loop, LOOP_MS));
    }

    if (!reduce) {
      timers.push(window.setTimeout(loop, LOOP_MS));
    }

    return () => {
      cleanups.forEach((fn) => fn());
      btnFront.removeEventListener('click', onFront);
      btnBack.removeEventListener('click', onBack);
      timers.forEach((t) => window.clearTimeout(t));
      Object.keys(popRaf).forEach((k) => {
        const id = Number(k);
        if (popRaf[id]) cancelAnimationFrame(popRaf[id]);
      });
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.scene + ' ' + styles['is-demo']} ref={sceneRef}>
        <div className={styles.frame}>
          <div className={styles.card} data-id="0" tabIndex={0} role="button" aria-label="카드 1 선택"></div>
          <div className={styles.card} data-id="1" tabIndex={0} role="button" aria-label="카드 2 선택"></div>
          <div className={styles.card} data-id="2" tabIndex={0} role="button" aria-label="카드 3 선택"></div>
          <div className={styles.card} data-id="3" tabIndex={0} role="button" aria-label="카드 4 선택"></div>
        </div>
        <div className={styles.controls}>
          <button type="button" className={styles.orderBtn} id="btnBack">뒤로</button>
          <button type="button" className={styles.orderBtn} id="btnFront">앞으로</button>
        </div>
        <div className={styles.status} aria-live="polite">순서 0 1 2 3</div>
      </div>
    </main>
  );
}
