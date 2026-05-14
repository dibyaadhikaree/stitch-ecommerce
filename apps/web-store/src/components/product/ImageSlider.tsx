"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Props = {
  media: {
    url: string;
    isPrimary: boolean;
    tag?: string;
    sortOrder?: number;
  }[];
  productName: string;
};

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: (duration: number) => ({
    x: 0,
    opacity: 1,
    transition: { duration, ease: EASE },
  }),
  exit: (dir: number, duration: number) => ({
    x: dir > 0 ? "-100%" : "100%",
    opacity: 0,
    transition: { duration, ease: EASE },
  }),
};

export default function ImageSlider({ media, productName }: Props) {
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const items = useMemo(
    () =>
      media.length > 0
        ? [...media].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        : [{ url: "/images/product-placeholder.jpg.png", isPrimary: true }],
    [media],
  );

  const goTo = (index: number) => {
    if (index === current) return;
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  };

  const goPrev = () => {
    const nextIndex = current === 0 ? items.length - 1 : current - 1;
    setDirection(-1);
    setCurrent(nextIndex);
  };

  const goNext = () => {
    const nextIndex = current === items.length - 1 ? 0 : current + 1;
    setDirection(1);
    setCurrent(nextIndex);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const handleTouchStart = (event: React.TouchEvent) => {
    setTouchStart(event.touches[0]?.clientX ?? null);
    setTouchEnd(null);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    setTouchEnd(event.touches[0]?.clientX ?? null);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) <= 50) return;
    if (distance > 0) goNext();
    if (distance < 0) goPrev();
  };

  const centerDuration = reduced ? 0 : 0.55;
  const exitDuration = reduced ? 0 : 0.4;

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden")}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "24px 24px 72px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            overflow: "hidden",
          }}
        />
      </div>
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={current}
          className={cn("absolute")}
          custom={direction}
          initial={reduced ? false : "enter"}
          animate="center"
          exit="exit"
          style={{
            inset: "24px 24px 72px",
          }}
          variants={{
            enter: variants.enter,
            center: () => variants.center(centerDuration),
            exit: (dir: number) => variants.exit(dir, exitDuration),
          }}
        >
          <Image
            src={items[current]?.url ?? "/images/product-placeholder.jpg.png"}
            alt={productName}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className={cn("block object-cover")}
            priority={current === 0}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center center",
              display: "block",
            }}
          />
        </motion.div>
      </AnimatePresence>

      <div
        className={cn("absolute flex items-center justify-center")}
        style={{
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          gap: 8,
        }}
      >
        {items.map((item, index) => {
          const active = index === current;

          return (
            <button
              key={`${item.url}-${index}`}
              type="button"
              aria-label={`View image ${index + 1} of ${items.length}`}
              className={cn("relative overflow-hidden")}
              onClick={() => goTo(index)}
              style={{
                width: 36,
                height: 36,
                opacity: active ? 1 : 0.4,
                border: active
                  ? "0.5px solid var(--stitch-ash)"
                  : "0.5px solid var(--stitch-border)",
                transition: reduced
                  ? "none"
                  : "opacity 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), border-color 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
              }}
              onMouseEnter={(event) => {
                if (active) return;
                event.currentTarget.style.opacity = "0.75";
              }}
              onMouseLeave={(event) => {
                if (active) return;
                event.currentTarget.style.opacity = "0.4";
              }}
            >
              <Image
                src={item.url}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                sizes="36px"
                className={cn("object-cover")}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
