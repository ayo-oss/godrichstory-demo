// TagPasteSplitComma — vanilla 판(run/397/demo/05-tag-input-paste-split-comma/index.html) 의 React 포트.
// handlePaste() 는 브라우저가 주는 ClipboardEvent.clipboardData 만 읽는다(navigator.clipboard 는 안 쓴다).
// 자동 데모는 DataTransfer 로 진짜 paste 이벤트를 흉내내고, e.isTrusted 로 사람의 붙여넣기와 가른다.
import { useEffect, useRef, useState } from "react";
import styles from "./TagPasteSplitComma.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string };
type ChangeEvt = { target: { value: string } };
type PasteEvt = { isTrusted?: boolean; clipboardData: { getData(t: string): string } | null; preventDefault(): void };

const DELIM_PATTERN = /[,\n]+/; // 계산 겹 상수: 쉼표·줄바꿈을 구분자로 삼아 붙여넣은 글을 쪼갠다
const PASTES = ["번역,감수\n마감", "표지,내지,색보정"];
const HOLD_MS = 1100, PAUSE_MS = 900;

type Chip = { id: number; text: string; i: number };

export default function TagPasteSplitComma() {
  const timerRef = useRef(0) as unknown as Box<number>;
  const seqRef = useRef(1) as unknown as Box<number>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const inputRef = useRef(null) as unknown as Box<HTMLInputElement>;

  const [chips, setChips] = useState<Chip[]>([]);
  const [draft, setDraft] = useState("");
  const [splitCount, setSplitCount] = useState(0);
  const [isDemo, setIsDemo] = useState(true);
  const [live, setLive] = useState("");

  function human() {
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function addParts(parts: string[]) {
    setChips((cs) => {
      let id = seqRef.current;
      const added = parts.map((p, i) => ({ id: id++, text: p, i }));
      seqRef.current = id;
      return [...cs, ...added];
    });
  }

  function handlePaste(e: PasteEvt) {
    if (e.isTrusted) human();
    e.preventDefault();
    const text = e.clipboardData ? e.clipboardData.getData("text/plain") : "";
    const parts = text.split(DELIM_PATTERN).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) setSplitCount((n) => n + 1);
    addParts(parts);
    setDraft("");
    setLive(parts.length + "개 태그로 쪼갬");
  }

  function simulatePaste(text: string) {
    // 자동 데모 전용: DataTransfer 로 흉내낸 진짜 paste 이벤트 — clipboard 를 읽지 않는다
    const el = inputRef.current;
    if (!el) return;
    let dt: DataTransfer | null = null;
    try { dt = new DataTransfer(); dt.setData("text/plain", text); } catch { dt = null; }
    if (dt) {
      const ev = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
    } else {
      handlePaste({ clipboardData: { getData: () => text }, preventDefault: () => {} });
    }
  }

  function removeChip(id: number) {
    human();
    setChips((cs) => cs.filter((c) => c.id !== id));
  }

  function onKeyDown(e: KeyEvt) {
    if (e.key === "Enter" && draft.trim()) {
      human();
      addParts([draft.trim()]);
      setDraft("");
    }
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function loop(i: number) {
      if (!isDemoRef.current) return;
      if (i < PASTES.length) {
        simulatePaste(PASTES[i]);
        timerRef.current = window.setTimeout(() => loop(i + 1), HOLD_MS);
      } else {
        setChips([]);
        setSplitCount(0);
        timerRef.current = window.setTimeout(() => loop(0), PAUSE_MS);
      }
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(() => loop(0), 300);
    } else {
      isDemoRef.current = false;
      setIsDemo(false);
    }
    return () => window.clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.tp + " " + (isDemo ? styles.isDemo : "")}>
        <div className={styles.row}>
          {chips.map((c) => (
            <span key={c.id} className={styles.chip} style={{ "--i": c.i } as any}>
              <span>{c.text}</span>
              <button type="button" className={styles.chipX} aria-label={"태그 삭제: " + c.text} onClick={() => removeChip(c.id)}>×</button>
            </span>
          ))}
          <input
            type="text" className={styles.input} aria-label="태그 입력, 붙여넣으면 쉼표·줄바꿈으로 쪼갠다"
            placeholder="쉼표·줄바꿈으로 붙여넣기" ref={inputRef} value={draft}
            onChange={(e: ChangeEvt) => setDraft(e.target.value)} onKeyDown={onKeyDown} onPaste={handlePaste}
          />
        </div>
        <p className={styles.meta}>태그 <b>{chips.length}</b>개 · 붙여넣기로 <b>{splitCount}</b>번 쪼갬</p>
        <p className={styles.sr} role="status">{live}</p>
      </div>
    </main>
  );
}
