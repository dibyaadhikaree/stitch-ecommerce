"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export default function ConfirmationPage() {
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const router = useRouter();
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const didRead = useRef(false);

  useEffect(() => {
    if (didRead.current) return;
    didRead.current = true;
    const stored = sessionStorage.getItem("stitch-order-number");
    if (!stored) {
      router.replace("/");
      return;
    }
    sessionStorage.removeItem("stitch-order-number");
    setOrderNumber(stored);
  }, []);

  const dur = (base: number) => (reduced ? 0 : base);

  if (!orderNumber) return null;

  return (
    <div
      onClick={() => setRevealed(true)}
      style={{
        minHeight: "100vh",
        background: "var(--stitch-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        cursor: revealed ? "default" : "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          maxWidth: 480,
          textAlign: "center",
        }}
      >
        {/* "Order placed" label — always shows on mount */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: dur(0.5), delay: dur(0.1), ease: EASE }}
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--stitch-ash)",
          }}
        >
          Order placed
        </motion.span>

        {/* Order number — clip-path sweep, always plays on mount */}
        <div style={{ overflow: "hidden" }}>
          <motion.h1
            initial={{ clipPath: "inset(100% 0 0 0)" }}
            animate={{ clipPath: "inset(0% 0 0 0)" }}
            transition={{ duration: dur(0.8), delay: dur(0.2), ease: EASE }}
            style={{
              fontFamily: "var(--stitch-font-display)",
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 300,
              color: "var(--stitch-parchment)",
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              margin: 0,
            }}
          >
            #{orderNumber}
          </motion.h1>
        </div>

        {/* Tap hint — fades out once revealed */}
        <AnimatePresence>
          {!revealed && (
            <motion.span
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur(0.4), delay: dur(1.2), ease: EASE }}
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--stitch-smoke)",
                userSelect: "none",
              }}
            >
              — tap to continue —
            </motion.span>
          )}
        </AnimatePresence>

        {/* Description + links — only fade in after user taps */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: reduced ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur(0.5), ease: EASE }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 24,
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--stitch-ash)",
                  margin: 0,
                  fontFamily: "var(--stitch-font-sans)",
                }}
              >
                We&apos;ll confirm your order and reach out on the number
                provided. Cash on delivery — please have the exact amount ready.
              </p>

              <div style={{ display: "flex", gap: 32 }}>
                <Link
                  href="/shop"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--stitch-parchment)",
                    textDecoration: "none",
                  }}
                >
                  CONTINUE SHOPPING
                </Link>
                <Link
                  href="/"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--stitch-parchment)",
                    textDecoration: "none",
                  }}
                >
                  BACK TO HOME
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
