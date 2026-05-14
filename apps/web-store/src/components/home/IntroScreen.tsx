"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Transition } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Props = { onComplete: () => void };

const EASE_STD: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const EASE_WIPE: [number, number, number, number] = [0.76, 0, 0.24, 1];

export default function IntroScreen({ onComplete }: Props) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(true);
  const [phase, setPhase] = useState(0);
  const [lineVisible, setLineVisible] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (sessionStorage.getItem("stitch-intro-done")) {
      setShow(false);
      onComplete();
      return;
    }

    if (reduced) {
      sessionStorage.setItem("stitch-intro-done", "1");
      setShow(false);
      onComplete();
      return;
    }

    setPhase(1);

    const tLine = setTimeout(() => setLineVisible(true), 600);
    const t1 = setTimeout(() => setPhase(2), 800);
    const t2 = setTimeout(() => setPhase(3), 1800);
    const t3 = setTimeout(() => {
      sessionStorage.setItem("stitch-intro-done", "1");
      setShow(false);
      onComplete();
    }, 2800);

    return () => {
      clearTimeout(tLine);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted || !show) return null;

  const textAnimate =
    phase === 0
      ? { opacity: 0, scale: 0.85 }
      : phase === 1
        ? { opacity: 1, scale: 1.0 }
        : phase === 2
          ? { opacity: 1, scale: 1.18 }
          : { opacity: 0, scale: 1.4 };

  const textTransition: Transition =
    phase <= 1
      ? { duration: 0.8, ease: EASE_STD }
      : phase === 2
        ? { duration: 1.0, ease: "linear" }
        : { duration: 1.0, ease: EASE_STD };

  const overlayAnimate =
    phase === 3
      ? { clipPath: "inset(0% 0% 100% 0%)" }
      : { clipPath: "inset(0% 0% 0% 0%)" };

  const overlayTransition: Transition =
    phase === 3 ? { duration: 1.0, ease: EASE_WIPE } : { duration: 0 };

  return (
    <motion.div
      animate={overlayAnimate}
      transition={overlayTransition}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "var(--stitch-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
      }}
    >
      <motion.h1
        initial={{ opacity: 0, scale: 0.85 }}
        animate={textAnimate}
        transition={textTransition}
        style={{
          fontFamily: "var(--stitch-font-display)",
          fontSize: "clamp(56px, 10vw, 120px)",
          fontWeight: 300,
          letterSpacing: "0.22em",
          color: "var(--stitch-parchment)",
          lineHeight: 1,
        }}
      >
        STITCH
      </motion.h1>

      <motion.span
        animate={{ opacity: lineVisible && phase < 3 ? 1 : 0 }}
        transition={{ duration: 0.4, ease: EASE_STD }}
        style={{
          display: "block",
          width: "60px",
          height: "1px",
          backgroundColor: "var(--stitch-border2)",
        }}
      />
    </motion.div>
  );
}
