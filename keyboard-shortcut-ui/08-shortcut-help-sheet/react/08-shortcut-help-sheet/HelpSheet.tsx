// HelpSheet — vanilla 판(run/288/demo/08-shortcut-help-sheet/index.html) 의 React 포트.
// ? 로 열고 Esc 로 닫는다. 검색칸에 글자를 넣으면 지금 화면의 단축키만 그 자리에서 걸러진다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HelpSheet.module.scss";

export type HelpSheetProps = {
  /** 격자 미리보기용 2초 자동 루프. 물음표를 누르거나 ? 를 입력하면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
/** useRef<T> 는 T | null 을 돌려주므로 쓰기 전에 null 을 걸러 낸다 */
type InputBox = { current: HTMLInputElement | null };
/** React 이벤트 제네릭이 ambient 에 없어 쓰는 필드만 지역 타입으로 선언한다 */
type ChangeEvt = { target: { value: string } };

type Group = { name: string; items: { what: string; keys: string[] }[] };

const GROUPS: Group[] = [
  { name: "편집", items: [{ what: "굵게", keys: ["Ctrl", "B"] }, { what: "되돌리기", keys: ["Ctrl", "Z"] }] },
  { name: "이동", items: [{ what: "다음 항목", keys: ["J"] }, { what: "맨 위로", keys: ["G", "G"] }] },
];

export default function HelpSheet({
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: HelpSheetProps) {
  const [live, setLive] = useState(demo);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null) as InputBox;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function applySheet(next: boolean) {
    setLive(false);
    setOpen(next);
    if (next && searchRef.current) {
      searchRef.current.focus({ preventScroll: true });
    }
  }

  useEffect(() => {
    function handleDown(e: KeyboardEvent) {
      if (e.isComposing) { return; }
      if (e.key === "?") { e.preventDefault(); applySheet(true); return; }
      if (e.key === "Escape") { applySheet(false); }
    }
    window.addEventListener("keydown", handleDown);
    return () => window.removeEventListener("keydown", handleDown);
  }, []);

  const want = query.trim().toLowerCase();
  const cls = [styles.root, live ? styles.isDemo : "", open ? styles.isOpen : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="question" viewBox="0 0 256 256" fill="currentColor">
            <path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2" />
            <path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" />
          </symbol>
        </defs>
      </svg>
      <div className={cls}>
        <div className={styles.app}>
          <div className={styles.bar}>
            <span className={styles.appName}>문서 편집</span>
            <button
              type="button"
              className={styles.ask}
              aria-expanded={open}
              aria-controls="sheet"
              aria-keyshortcuts="Shift+?"
              onClick={() => applySheet(!open)}
            >
              <svg className={styles.ico} aria-hidden="true"><use href="#question" /></svg>
            </button>
          </div>
          <div className={styles.paper} aria-hidden="true"><i /><i /><i /></div>
          <div className={styles.sheet} id="sheet" role="dialog" aria-modal="true" aria-label="이 화면의 단축키">
            <input
              ref={searchRef}
              className={styles.search}
              type="search"
              placeholder="단축키 찾기"
              aria-label="단축키 찾기"
              value={query}
              onChange={(e: ChangeEvt) => setQuery(e.target.value)}
            />
            <div className={styles.cols}>
              {GROUPS.map((group) => (
                <section className={styles.group} key={group.name}>
                  <p className={styles.groupName}>{group.name}</p>
                  <ul className={styles.list}>
                    {group.items.map((item) => {
                      const text = (item.what + item.keys.join("")).toLowerCase();
                      const hidden = want !== "" && text.indexOf(want) < 0;
                      return (
                        <li className={[styles.item, hidden ? styles.isHidden : ""].filter(Boolean).join(" ")} key={item.what}>
                          <span className={styles.what}>{item.what}</span>
                          <span className={styles.keys}>
                            {item.keys.map((k, ki) => (
                              <kbd className={styles.key} key={String(ki) + k}>{k}</kbd>
                            ))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
