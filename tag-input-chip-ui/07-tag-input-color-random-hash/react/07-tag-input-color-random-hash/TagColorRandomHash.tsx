// TagColorRandomHash — vanilla 판(run/397/demo/07-tag-input-color-random-hash/index.html) 의 React 포트.
// 계산 겹(hashIndex: 글자 코드값 가중합의 나머지로 팔레트 색 고르기)은 vanilla 와 같은 값.
import { useEffect, useRef, useState } from "react";
import styles from "./TagColorRandomHash.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string };
type ChangeEvt = { target: { value: string } };

const PALETTE_LEN = 6; // 계산 겹 상수: 팔레트 색 개수 — 해시의 나머지 범위
const WORDS = ["카페", "노을", "바다", "카페"];
const TYPE_MS = 90, HOLD_MS = 600, PAUSE_MS = 900;

function hashIndex(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h += text.charCodeAt(i) * (i + 1);
  return h % PALETTE_LEN;
}

type Chip = { id: number; text: string; idx: number; enter: boolean };

export default function TagColorRandomHash() {
  const timerRef = useRef(0) as unknown as Box<number>;
  const seqRef = useRef(1) as unknown as Box<number>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;

  const [chips, setChips] = useState<Chip[]>([]);
  const [draft, setDraft] = useState("");
  const [isDemo, setIsDemo] = useState(true);
  const [live, setLive] = useState("");

  function human() {
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function addChip(text: string) {
    const idx = hashIndex(text);
    const id = seqRef.current++;
    setChips((cs) => [...cs, { id, text, idx, enter: true }]);
    setLive(text + " 태그, " + (idx + 1) + "번째 색");
    window.setTimeout(() => {
      setChips((cs) => cs.map((c) => (c.id === id ? { ...c, enter: false } : c)));
    }, 20);
  }

  function removeChip(id: number) {
    human();
    setChips((cs) => cs.filter((c) => c.id !== id));
  }

  function onKeyDown(e: KeyEvt) {
    if (e.key === "Enter" && draft.trim()) {
      human();
      addChip(draft.trim());
      setDraft("");
    }
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function typeWord(word: string, i: number, cb: () => void) {
      if (!isDemoRef.current) return;
      if (i <= word.length) {
        setDraft(word.slice(0, i));
        timerRef.current = window.setTimeout(() => typeWord(word, i + 1, cb), TYPE_MS);
      } else {
        addChip(word);
        setDraft("");
        timerRef.current = window.setTimeout(cb, HOLD_MS);
      }
    }

    function loop(i: number) {
      if (!isDemoRef.current) return;
      if (i < WORDS.length) {
        typeWord(WORDS[i], 0, () => loop(i + 1));
      } else {
        setChips([]);
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

  const palette = [styles.c0, styles.c1, styles.c2, styles.c3, styles.c4, styles.c5];

  return (
    <main className={styles.stage}>
      <div className={styles.tc + " " + (isDemo ? styles.isDemo : "")}>
        <div className={styles.row}>
          {chips.map((c) => (
            <span
              key={c.id}
              className={styles.chip + " " + palette[c.idx] + " " + (c.enter ? styles.chipEnter : "")}
            >
              <span>{c.text}</span>
              <button type="button" className={styles.chipX} aria-label={"태그 삭제: " + c.text} onClick={() => removeChip(c.id)}>×</button>
            </span>
          ))}
          <input
            type="text" className={styles.input} aria-label="태그 입력, 글자로 색이 정해진다"
            placeholder="태그 입력 후 Enter" value={draft}
            onChange={(e: ChangeEvt) => setDraft(e.target.value)} onKeyDown={onKeyDown}
          />
        </div>
        <p className={styles.meta}><b>{chips.length}</b>개 · 같은 글자는 항상 같은 색</p>
        <p className={styles.sr} role="status">{live}</p>
      </div>
    </main>
  );
}
