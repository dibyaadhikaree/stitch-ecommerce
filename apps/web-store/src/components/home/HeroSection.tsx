"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getHomepage } from "@/lib/api";

type HeroSlideData = {
  imageUrl?: string;
  videoUrl?: string;
  headline?: string;
};
type Props = {
  introComplete: boolean;
  nextSectionId?: string;
  heroSlide?: HeroSlideData;
};

const EASE_STD: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export default function HeroSection({
  introComplete,
  nextSectionId = "product-scroll-section",
  heroSlide: heroSlideProp,
}: Props) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [showHeroImage, setShowHeroImage] = useState(reduced);
  const [videoReady, setVideoReady] = useState(false);

  const { data: homepageData } = useQuery({
    queryKey: ["homepage"],
    queryFn: getHomepage,
  });

  // The API returns { item: { heroSlides: [...] } }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawSlide = (homepageData as any)?.item?.heroSlides?.[0];
  const resolvedSlide: HeroSlideData | undefined =
    heroSlideProp ??
    (rawSlide
      ? {
          imageUrl: rawSlide.image as string | undefined,
          videoUrl: (rawSlide.videoUrl as string | undefined) || undefined,
          headline: rawSlide.title as string | undefined,
        }
      : undefined);

  const apiVideoUrl = resolvedSlide?.videoUrl;
  const apiImageUrl = resolvedSlide?.imageUrl;
  const hasApiData = !!(apiVideoUrl || apiImageUrl);
  const sectionRef = useRef<HTMLElement>(null);
  const isTransitioningRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);

  const { scrollY } = useScroll();
  // Image moves at 0.4x scroll speed: 300px scroll → -120px translation
  const parallaxY = useTransform(scrollY, [0, 300], [0, -120]);

  const dur = (base: number) => (reduced ? 0 : base);
  const effectiveIntroComplete = mounted && introComplete;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const scrollToNextSection = () => {
      if (isTransitioningRef.current) {
        return;
      }

      const nextSection = document.getElementById(nextSectionId);

      if (!nextSection) {
        return;
      }

      isTransitioningRef.current = true;
      nextSection.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
      window.setTimeout(
        () => {
          isTransitioningRef.current = false;
        },
        reduced ? 0 : 1100,
      );
    };

    const shouldTakeOverScroll = () => {
      const rect = section.getBoundingClientRect();
      return window.scrollY <= 4 && Math.abs(rect.top) <= 4;
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0 || !shouldTakeOverScroll()) {
        return;
      }

      event.preventDefault();
      scrollToNextSection();
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const startY = touchStartYRef.current;
      const currentY = event.touches[0]?.clientY;

      if (
        startY === null ||
        currentY === undefined ||
        startY - currentY < 24 ||
        !shouldTakeOverScroll()
      ) {
        return;
      }

      event.preventDefault();
      touchStartYRef.current = null;
      scrollToNextSection();
    };

    section.addEventListener("wheel", handleWheel, { passive: false });
    section.addEventListener("touchstart", handleTouchStart, { passive: true });
    section.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      section.removeEventListener("wheel", handleWheel);
      section.removeEventListener("touchstart", handleTouchStart);
      section.removeEventListener("touchmove", handleTouchMove);
    };
  }, [nextSectionId, reduced]);

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Background image with parallax — extra height at bottom prevents gap during scroll */}
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: -160,
          y: reduced ? 0 : parallaxY,
        }}
      >
        {hasApiData ? (
          apiVideoUrl ? (
            // API video — looping
            <>
              <video
                autoPlay
                muted
                playsInline
                loop
                preload="auto"
                poster={apiImageUrl ?? "/images/hero-placeholder.jpg"}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              >
                <source src={apiVideoUrl} type="video/mp4" />
              </video>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.695)",
                  pointerEvents: "none",
                }}
              />
            </>
          ) : (
            // API image only — static background
            <Image
              src={apiImageUrl!}
              alt="STITCH Studio"
              fill
              priority
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
          )
        ) : (
          // No API data — existing placeholder behaviour
          <>
            <motion.div
              initial={false}
              animate={
                showHeroImage
                  ? {
                      opacity: 1,
                      scale: 1,
                    }
                  : {
                      opacity: videoReady ? 0 : 1,
                      scale: 1.08,
                    }
              }
              transition={{
                duration: reduced ? 0 : 1.4,
                ease: EASE_STD,
              }}
              style={{
                position: "absolute",
                inset: 0,
              }}
            >
              <Image
                src="/images/hero-placeholder.jpg"
                alt="STITCH Studio"
                fill
                priority
                sizes="100vw"
                style={{ objectFit: "cover" }}
              />
            </motion.div>
            {!showHeroImage && (
              <div>
                <video
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  poster="/images/hero-placeholder.jpg"
                  onLoadedData={() => setVideoReady(true)}
                  onEnded={() => setShowHeroImage(true)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 1.5,
                  }}
                >
                  <source src="/images/landingvid.mp4?v=2" type="video/mp4" />
                </video>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.695)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, transparent 40%, rgba(17,17,17,0.5) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Bottom-left text block */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          padding: "48px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Season label */}
        <motion.span
          initial={false}
          animate={effectiveIntroComplete ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: dur(0.6), delay: dur(0.2), ease: EASE_STD }}
          style={{
            fontSize: "10px",
            letterSpacing: "0.2em",
            color: "var(--stitch-ash)",
            textTransform: "uppercase",
          }}
        >
          SS 2026
        </motion.span>

        {/* Headline — clip-path sweep up */}
        <div style={{ overflow: "hidden" }}>
          <motion.h1
            initial={false}
            animate={
              effectiveIntroComplete
                ? { clipPath: "inset(0% 0 0 0)" }
                : { clipPath: "inset(100% 0 0 0)" }
            }
            transition={{ duration: dur(0.8), delay: dur(0.4), ease: EASE_STD }}
            style={{
              fontFamily: "var(--stitch-font-display)",
              fontSize: "clamp(40px, 6vw, 80px)",
              fontWeight: 300,
              color: "var(--stitch-parchment)",
              lineHeight: 1.1,
            }}
          >
            {resolvedSlide?.headline ?? "New Season"}
          </motion.h1>
        </div>

        {/* CTA */}
        <motion.div
          initial={false}
          animate={effectiveIntroComplete ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: dur(0.6), delay: dur(0.7), ease: EASE_STD }}
        >
          <Link
            href="/shop"
            style={{
              fontSize: "11px",
              letterSpacing: "0.14em",
              color: "var(--stitch-parchment)",
              textDecoration: "none",
              borderBottom: "1px solid var(--stitch-parchment)",
              paddingBottom: "4px",
            }}
          >
            SHOP NOW →
          </Link>
        </motion.div>
      </div>

      {/* Bottom-right scroll hint */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          padding: "48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span
          style={{
            writingMode: "vertical-rl",
            fontSize: "9px",
            letterSpacing: "0.2em",
            color: "var(--stitch-smoke)",
            textTransform: "uppercase",
          }}
        >
          SCROLL
        </span>
        <motion.span
          animate={reduced ? {} : { scaleY: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{
            display: "block",
            width: "1px",
            height: "40px",
            backgroundColor: "var(--stitch-smoke)",
            transformOrigin: "top",
          }}
        />
      </div>
    </section>
  );
}
