// DropRejectType — vanilla 판(run/337/demo/07-drop-reject-type/index.html) 의 React 포트.
// dragover 단계에서 이미 e.dataTransfer.items[0].type 을 미리 읽어 허용 접두사와 비교해
// dropEffect 를 'none' 으로 앞당겨 결정한다(드롭 완료 전 판정 = 계산 한 겹). 실제 드롭에서도
// 같은 judge() 로 최종 판정해 튕김/수락 애니메이션을 가른다.
import { useEffect, useRef } from "react";
import styles from "./DropRejectType.module.scss";

export type DropRejectTypeProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "허용 접두사 image/ 로 dragover 단계에서 먼저 판정해 드롭 전에 거부를 미리 표시합니다";
const ARIA_LABEL = "허용 형식 드롭존";

type Box<T> = { current: T };

const ALLOW = "image/";
const BOUNCE_MS = 120;   // 변형: 큐 변형 칩 07(240ms→120ms) 적용값

type FileSpec = { name: string; type: string };
const FILES: FileSpec[] = [
  { name: "photo-01.png", type: "image/png" },
  { name: "report.pdf", type: "application/pdf" },
  { name: "photo-02.jpg", type: "image/jpeg" },
  { name: "notes.txt", type: "text/plain" }
];

function judge(type: string): boolean {
  return type.indexOf(ALLOW) === 0;
}

export default function DropRejectType({
  duration = "120ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: DropRejectTypeProps) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fnameRef = useRef<HTMLElement | null>(null);
  const msgRef = useRef<HTMLParagraphElement | null>(null);
  const tagRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef(0) as Box<number>;
  const bounceTORef = useRef(0) as Box<number>;

  useEffect(() => {
    const zone = zoneRef.current;
    const input = inputRef.current;
    const fnameEl = fnameRef.current;
    const msgEl = msgRef.current;
    const tagEl = tagRef.current;
    if (!zone || !input || !fnameEl || !msgEl || !tagEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let accepted = 0, rejected = 0;

    function announce(f: FileSpec, ok: boolean): void {
      fnameEl!.textContent = f.name;
      tagEl!.textContent = f.type;
      if (ok) {
        accepted++;
        msgEl!.textContent = "수락 — accepted " + accepted + " · rejected " + rejected;
        zone!.classList.add(styles.zoneAccept);
        zone!.classList.remove(styles.zoneRejectLive);
        if (!reduce) {
          zone!.style.animation = "none";
          void zone!.offsetWidth;
          zone!.style.animation = "";
        }
      } else {
        rejected++;
        msgEl!.textContent = "거부 — " + f.type + " 는 " + ALLOW + " 형식이 아닙니다 (accepted " + accepted + " · rejected " + rejected + ")";
        zone!.classList.add(styles.zoneRejectLive);
        zone!.classList.remove(styles.zoneAccept);
        if (!reduce) {
          zone!.classList.remove(styles.bounceRun);
          void zone!.offsetWidth;
          zone!.classList.add(styles.bounceRun);
          window.clearTimeout(bounceTORef.current);
          bounceTORef.current = window.setTimeout(() => zone!.classList.remove(styles.bounceRun), BOUNCE_MS);
        }
      }
    }

    function intake(f: FileSpec): void {
      announce(f, judge(f.type));
    }

    function virtualFile(spec: FileSpec): File {
      try { return new File([new Blob(["x"])], spec.name, { type: spec.type }); }
      catch (e) { return new File([], spec.name); }
    }

    // dragover 단계 사전 판정 — 드롭 완료 전에 type 을 읽어 dropEffect 를 미리 결정
    function onOver(e: DragEvent): void {
      e.preventDefault();
      zone!.classList.add(styles.zoneOver);
      const items = e.dataTransfer && e.dataTransfer.items;
      if (items && items.length && items[0].type) {
        const ok = judge(items[0].type);
        zone!.classList.toggle(styles.zonePrecheckReject, !ok);
        if (e.dataTransfer) e.dataTransfer.dropEffect = ok ? "copy" : "none";
      }
    }
    function onLeave(): void {
      zone!.classList.remove(styles.zoneOver, styles.zonePrecheckReject);
    }
    function onDrop(e: DragEvent): void {
      e.preventDefault();
      zone!.classList.remove(styles.zoneOver, styles.zonePrecheckReject);
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) intake({ name: f.name, type: f.type });
    }
    function onChange(): void {
      const f = input!.files && input!.files[0];
      if (f) intake({ name: f.name, type: f.type });
      input!.value = "";
    }
    zone.addEventListener("dragover", onOver as EventListener);
    zone.addEventListener("dragleave", onLeave);
    zone.addEventListener("drop", onDrop as EventListener);
    input.addEventListener("change", onChange);

    let cur = -1;
    if (reduce) {
      intake(FILES[0]);
    } else {
      let nextAt = 0;
      const step = (now: number): void => {
        if (now >= nextAt) {
          nextAt = now + 620;
          cur = (cur + 1) % FILES.length;
          intake(FILES[cur]);
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(bounceTORef.current);
      zone.removeEventListener("dragover", onOver as EventListener);
      zone.removeEventListener("dragleave", onLeave);
      zone.removeEventListener("drop", onDrop as EventListener);
      input.removeEventListener("change", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.rt}>
        <p className={styles.hint} id="rtHintReact">{HINT}</p>
        <div
          className={styles.zone}
          ref={zoneRef}
          role="button"
          tabIndex={0}
          aria-describedby="rtHintReact"
          aria-label={ARIA_LABEL}
        >
          <input type="file" accept="image/*" className={styles.file} ref={inputRef} aria-label="파일 선택" />
          <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M208 56v144a8 8 0 0 1-8 8H56a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8h144a8 8 0 0 1 8 8" opacity=".2" />
              <path d="M208.49 191.51L136.53 128l71.96-63.51a8 8 0 0 0-10.98-11.64L128 116.53L59.51 52.85a8 8 0 0 0-10.98 11.64L120.53 128l-71.96 63.51a8 8 0 1 0 10.6 12l.38-.34L128 139.47l68.49 63.71a8 8 0 0 0 11.34-.55a8 8 0 0 0-.34-11.12Z" />
            </g>
          </svg>
          <p className={styles.msg} ref={msgRef} aria-live="polite" />
          <p className={styles.meta}>
            <span className={styles.fileName} ref={fnameRef}>photo-01.png</span>
            <span className={styles.tag} ref={tagRef} style={{ color }}>image/png</span>
          </p>
        </div>
      </div>
    </main>
  );
}
