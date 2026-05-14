"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import Link from "next/link";
import type { StoreProduct } from "@/lib/api";
import { cn, formatNPR } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Props = {
  products: StoreProduct[];
};

const CARD_WIDTH = 200;

export default function RelatedScroll({ products }: Props) {
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const [paused, setPaused] = useState(false);

  if (!products || products.length === 0) {
    return null;
  }

  const items = useMemo(
    () => [...products, ...products, ...products],
    [products],
  );
  const totalWidth = products.length * CARD_WIDTH;

  useEffect(() => {
    if (reduced || paused) {
      controls.stop();
      return;
    }

    controls.set({ x: 0 });
    controls.start({
      x: -totalWidth,
      transition: {
        duration: products.length * 3,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
      },
    });
  }, [controls, paused, reduced, totalWidth, products.length]);

  return (
    <section className={cn("w-full")} style={{ padding: "0 20px" }}>
      <div
        style={{
          marginBottom: 20,
          fontFamily: "var(--stitch-font-sans)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--stitch-ash)",
        }}
      >
        YOU MAY LIKE
      </div>

      <div className={cn("scroll-fade-mask w-full overflow-hidden")}>
        <motion.div
          animate={controls}
          className={cn("flex")}
          onHoverStart={() => setPaused(true)}
          onHoverEnd={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          style={{ gap: 16, width: "max-content" }}
        >
          {items.map((product, index) => {
            const image =
              product.media?.find((m) => m.isPrimary)?.url ??
              product.media?.[0]?.url ??
              "";
            return (
              <div
                key={`${product._id}-${index}`}
                style={{ width: CARD_WIDTH - 16, flex: "0 0 auto" }}
              >
                <Link
                  href={`/shop/${product.slug}`}
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <div
                    style={{
                      aspectRatio: "4/5",
                      width: "100%",
                      overflow: "hidden",
                      marginBottom: 8,
                    }}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          background: "var(--stitch-lift)",
                          width: "100%",
                          height: "100%",
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--stitch-font-sans)",
                      fontSize: 11,
                      fontWeight: 300,
                      color: "var(--stitch-parchment)",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      marginBottom: 2,
                    }}
                  >
                    {product.name}
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--stitch-font-sans)",
                        fontSize: 11,
                        color: "var(--stitch-ash)",
                      }}
                    >
                      {formatNPR(product.sellingPrice)}
                    </span>
                    {product.marketPrice &&
                      product.marketPrice > product.sellingPrice && (
                        <span
                          style={{
                            fontFamily: "var(--stitch-font-sans)",
                            fontSize: 10,
                            color: "var(--stitch-smoke)",
                            textDecoration: "line-through",
                          }}
                        >
                          {formatNPR(product.marketPrice)}
                        </span>
                      )}
                  </div>
                </Link>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
