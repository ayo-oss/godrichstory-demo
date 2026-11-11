import { useEffect, useRef, useState } from "react";
import styles from "./ScrollCtaRibbon.module.scss";

// 이벤트·ref 타입은 이 파일 안에서 최소한으로 선언한다
type Box<T> = { current: T | null };
type Entry = { isIntersecting: boolean };

export type ScrollCtaRibbonProps = { duration?: number; easing?: string; color?: string };
type Vars = { "--duration": string; "--easing": string; "--color": string };

export default function ScrollCtaRibbon({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ScrollCtaRibbonProps) {
  const [demo, setDemo] = useState(true);
  const [up, setUp] = useState(false);
  const [closed, setClosed] = useState(false);
  const [msg, setMsg] = useState("");
  const vpRef: Box<HTMLDivElement> = useRef<HTMLDivElement>(null);
  const markRef: Box<HTMLParagraphElement> = useRef<HTMLParagraphElement>(null);
  const againRef: Box<HTMLButtonElement> = useRef<HTMLButtonElement>(null);
  const vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as Vars;

  useEffect(() => {
    let wasClosed = false;
    try { wasClosed = sessionStorage.getItem("ribbon271") === "closed"; } catch (err) {}
    if (wasClosed) { setClosed(true); setMsg("리본을 닫아 뒀어요"); }
  }, []);

  useEffect(() => {
    const vp = vpRef.current;
    const mark = markRef.current;
    if (!vp || !mark) return;
    const io = new IntersectionObserver((entries: Entry[]) => {
      if (entries[0].isIntersecting && !closed) {
        setUp(true);
        setMsg("시작 안내가 올라왔어요");
      }
    }, { root: vp, threshold: 0.6 });
    io.observe(mark);
    return () => io.disconnect();
  }, [closed]);

  useEffect(() => {
    const off = () => setDemo(false);
    window.addEventListener("pointerdown", off, { once: true });
    window.addEventListener("keydown", off, { once: true });
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", off);
    };
  }, []);

  function close() {
    setClosed(true);
    setUp(false);
    setMsg("리본을 닫아 뒀어요");
    try { sessionStorage.setItem("ribbon271", "closed"); } catch (err) {}
    if (againRef.current) againRef.current.focus({ preventScroll: true });
  }

  function again() {
    setClosed(false);
    setUp(true);
    setMsg("시작 안내를 다시 불렀어요");
    try { sessionStorage.removeItem("ribbon271"); } catch (err) {}
  }

  return (
    <main className={`${styles.stage} ${demo ? styles.demo : ""}`} style={vars}>
      <div className={styles.sr}>
        <div className={styles.vp} ref={vpRef}>
          <div className={styles.track}>
            <p className={styles.h}>주간 요금제를 고르는 법</p>
            <p className={styles.p}>처음에는 가장 작은 요금제로 시작하는 편이 좋아요.</p>
            <p className={styles.p}>쓰는 양은 두 주쯤 지나야 눈에 보이거든요.</p>
            <p className={styles.p}>그때 올려도 늦지 않고, 내리는 것도 같은 자리에서 돼요.</p>
            <p className={`${styles.p} ${styles.mark}`} ref={markRef} data-mark>
              여기서 월 ₩0으로 시작할 수 있어요
              <span className={styles.hl} aria-hidden="true" />
            </p>
            <p className={styles.p}>더 궁금한 점은 아래 안내에서 이어집니다.</p>
          </div>
        </div>

        <div className={`${styles.ribbon} ${up ? styles.up : ""}`}>
          <span className={styles.ribbonT}>월 ₩0부터 시작하기</span>
          <span className={styles.arrow} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="14" height="14"><g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2" /><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z" /></g></svg>
          </span>
          <button type="button" className={styles.close} aria-label="닫기" onClick={close}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="12" height="12" aria-hidden="true"><g fill="currentColor"><path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" /><path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" /></g></svg>
          </button>
        </div>

        <button type="button" className={styles.again} ref={againRef} hidden={!closed} onClick={again}>다시 보기</button>
      </div>
      <p className={styles.msg} role="status">{msg}</p>
    </main>
  );
}
