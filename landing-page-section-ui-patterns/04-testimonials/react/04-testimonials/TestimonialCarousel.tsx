import { useEffect, useRef } from "react";
import styles from "./TestimonialCarousel.module.scss";

// 자동 진행 값이 타이머로 계속 늘어나며 카드 위치를 다음 카드로 보간한다. 포인터가 올라와 있는 동안은 그 값이 늘지 않는다.
// 계산 겹: 자동 진행 값(interval) -> translateX 보간. 실사용 포인터 리스너 있음(데모 재생 자체는 고정 시퀀스).
const REVIEWS = [
  { quote: "설치가 정말 쉬웠어요", name: "김민지" },
  { quote: "고객 지원이 빨라요", name: "박서준" },
  { quote: "디자인이 깔끔해요", name: "이하늘" },
];

export default function TestimonialCarousel() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    const track = trackRef.current;
    if (!carousel || !track) return;

    const count = track.children.length;
    let index = 0;
    let timer: number | null = null;
    let live = false;

    function render() {
      track!.style.transform = "translateX(" + index * -100 + "%)";
    }

    function advance() {
      index = (index + 1) % count;
      render();
    }

    function stop() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function start() {
      stop();
      timer = window.setInterval(advance, 2600);
    }

    function goLive() {
      if (live) return;
      live = true;
      track!.classList.remove(styles["is-demo"]);
      render();
      start();
    }

    function onEnter() {
      goLive();
      stop();
    }

    function onLeave() {
      if (live) start();
    }

    carousel.addEventListener("pointerenter", onEnter);
    carousel.addEventListener("pointerleave", onLeave);
    return () => {
      stop();
      carousel.removeEventListener("pointerenter", onEnter);
      carousel.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={carouselRef} className={styles.carousel}>
        <div ref={trackRef} className={`${styles.track} ${styles["is-demo"]}`}>
          {REVIEWS.map((r) => (
            <blockquote key={r.name} className={styles["t-card"]}>
              <p className={styles["t-card__quote"]}>{r.quote}</p>
              <p className={styles["t-card__name"]}>{r.name}</p>
            </blockquote>
          ))}
        </div>
      </div>
    </main>
  );
}
