"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export default function Accordion({
  title,
  children,
  defaultOpen = false,
}: Props) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderTop: "0.5px solid var(--stitch-border)" }}>
      <button
        type="button"
        className={cn("flex w-full items-center justify-between")}
        onClick={() => setOpen((value) => !value)}
        style={{ padding: "18px 0" }}
      >
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.12em",
            color: "var(--stitch-ash)",
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
          style={{ fontSize: 14, color: "var(--stitch-smoke)" }}
        >
          +
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 0 18px" }}>{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
