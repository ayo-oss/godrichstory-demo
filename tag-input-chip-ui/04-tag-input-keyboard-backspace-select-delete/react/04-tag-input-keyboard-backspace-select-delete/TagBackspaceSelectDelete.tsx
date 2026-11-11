// TagBackspaceSelectDelete — vanilla 판(run/397/demo/04-tag-input-keyboard-backspace-select-delete/index.html) 의 React 포트.
// backspaceStep() 은 입력이 비어 있을 때만 반응한다 — ① 첫 백스페이스는 마지막 칩을 선택(링 표시)
// ② 선택된 채로 한 번 더 누르면 그 칩만 회전+수축 퇴장한다. 다른 키·글자 입력은 선택을 지운다.
import { useEffect, useRef, useState } from "react";
import styles from "./TagBackspaceSelectDelete.module.scss";

type Box<T> = { current: T };
type ChangeEvt = { target: { value: string } };
type KeyEvt = { key: string };

const HOLD_MS = 620, GAP_MS = 420, PAUSE_MS = 900;
const SEED = ["임시", "보류", "완료"];

type Chip = { id: number; text: string; exiting: boolean };

export default function TagBackspaceSelectDelete() {
  const timerRef = useRef(0) as unknown as Box<number>;
  const seqRef = useRef(1) as unknown as Box<number>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const chipsRef = useRef<Chip[]>([]) as unknown as Box<Chip[]>;
  const selectedRef = useRef<number | null>(null) as unknown as Box<number | null>;
  const draftRef = useRef("") as unknown as Box<string>;

  const [chips, setChips] = useState<Chip[]>(() =>
    SEED.map((t) => ({ id: seqRef.current++, text: t, exiting: false }))
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [isDemo, setIsDemo] = useState(true);
  const [hint, setHint] = useState('빈 칸에서 백스페이스 — 첫 번째는 고른다');
  const [live, setLive] = useState("");

  useEffect(() => { chipsRef.current = chips; }, [chips]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  function human() {
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function clearSelect() {
    if (selectedRef.current !== null) {
      setSelected(null);
      setHint('빈 칸에서 백스페이스 — 첫 번째는 고른다');
    }
  }

  function select(chip: Chip) {
    // 계산 겹 1단: 선택은 지우기 전 단계 — 어떤 칩이 지워질지 링으로만 보여준다
    setSelected(chip.id);
    setHint('한 번 더 백스페이스 — "' + chip.text + '" 를 지운다');
    setLive(chip.text + " 선택됨");
  }

  function remove(chip: Chip) {
    // 계산 겹 2단: 선택된 칩에만 퇴장(회전+수축)을 걸고 끝난 뒤 목록에서 뗀다
    setSelected(null);
    setChips((cs) => cs.map((c) => (c.id === chip.id ? { ...c, exiting: true } : c)));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      setChips((cs) => cs.filter((c) => c.id !== chip.id));
      setHint('빈 칸에서 백스페이스 — 첫 번째는 고른다');
      setLive(chip.text + " 삭제됨 · 태그 " + (chipsRef.current.length - 1) + "개");
    }, reduce ? 0 : 320);
  }

  function backspaceStep() {
    if (draftRef.current) return;
    const list = chipsRef.current;
    if (!list.length) return;
    const last = list[list.length - 1];
    if (selectedRef.current === last.id) remove(last);
    else select(last);
  }

  function onKeyDown(e: KeyEvt) {
    human();
    if (e.key === "Backspace") backspaceStep();
    else if (selectedRef.current !== null) clearSelect();
  }
  function onInput(e: ChangeEvt) {
    human();
    setDraft(e.target.value);
    if (e.target.value) clearSelect();
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function loop() {
      if (!isDemoRef.current) return;
      if (chipsRef.current.length) {
        backspaceStep();
        timerRef.current = window.setTimeout(() => {
          if (!isDemoRef.current) return;
          if (chipsRef.current.length && selectedRef.current !== null) backspaceStep();
          timerRef.current = window.setTimeout(loop, GAP_MS);
        }, HOLD_MS);
      } else {
        timerRef.current = window.setTimeout(() => {
          setChips(SEED.map((t) => ({ id: seqRef.current++, text: t, exiting: false })));
          timerRef.current = window.setTimeout(loop, GAP_MS);
        }, PAUSE_MS);
      }
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(loop, 280);
    } else {
      isDemoRef.current = false;
      setIsDemo(false);
    }
    return () => window.clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.tb + " " + (isDemo ? styles.isDemo : "")}>
        <div className={styles.row}>
          {chips.map((c) => (
            <span
              key={c.id}
              className={
                styles.chip +
                (selected === c.id ? " " + styles.chipSelected : "") +
                (c.exiting ? " " + styles.chipExit : "")
              }
            >
              {c.text}
            </span>
          ))}
          <input
            type="text" className={styles.input} aria-label="태그 입력, 빈 칸에서 백스페이스를 두 번 누르면 마지막 칩이 지워진다"
            placeholder="태그 입력" value={draft} onChange={onInput} onKeyDown={onKeyDown}
          />
        </div>
        <p className={styles.meta}>{hint}</p>
        <p className={styles.sr} role="status">{live}</p>
      </div>
    </main>
  );
}
