"use client";

import { useEffect, useRef, useState } from "react";

/** True when the visitor asked their device for less motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Becomes true once the element has been on screen (and stays true). */
export function useSeen<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

/**
 * Wraps a section: once it scrolls into view, children marked [data-reveal]
 * rise in (stagger them with style={{ "--wk-delay": "120ms" }}). Without
 * JavaScript or with reduced motion, everything is simply visible.
 */
export function Reveal({
  as: Tag = "div",
  className,
  children,
  id,
}: {
  as?: "div" | "section" | "ul" | "ol";
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  const [ref, seen] = useSeen<HTMLElement>(0.15);
  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      id={id}
      className={className}
      data-shown={seen ? "" : undefined}
    >
      {children}
    </Tag>
  );
}

/** Cycles through 0..count-1 every `ms` while on screen (paused for reduced motion). */
export function useCycle(count: number, ms: number, active: boolean) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active || reduced) return;
    const t = setInterval(() => setI((n) => (n + 1) % count), ms);
    return () => clearInterval(t);
  }, [active, reduced, count, ms]);
  return reduced ? count - 1 : i;
}
