"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useCartStore } from "@/lib/cart-store";
import { getSettings } from "@/lib/api";
import { cn, formatNPR } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Props = {
  productId: string;
  productName: string;
  primaryImage: string;
  sellingPrice: number;
  marketPrice?: number;
  variants: { _id: string; size: string; stock: number }[];
  shippingNote?: string;
  returnPolicy?: string;
};

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export default function PurchasePanel({
  productId,
  productName,
  primaryImage,
  sellingPrice,
  marketPrice,
  variants,
  shippingNote,
  returnPolicy,
}: Props) {
  const reduced = useReducedMotion();
  const addItem = useCartStore((state) => state.addItem);
  const [mounted, setMounted] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [added, setAdded] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: getSettings,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!added) return;
    const timeout = window.setTimeout(() => setAdded(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [added]);

  const selected = useMemo(
    () => variants.find((variant) => variant._id === selectedVariantId) ?? null,
    [selectedVariantId, variants],
  );

  const duration = (value: number) => (reduced ? 0 : value);

  const handleAddToCart = () => {
    if (!selected || selected.stock < 1) return;

    addItem({
      productId,
      variantId: selected._id,
      name: productName,
      sku: selected.size,
      size: selected.size,
      price: sellingPrice,
      image: primaryImage,
    });
    setAdded(true);
  };

  const threshold = settings?.lowStockThreshold ?? 5;
  const isOnSale = marketPrice && marketPrice > sellingPrice && marketPrice > 0;

  const stockNote = !selected
    ? "Select a size to continue"
    : selected.stock === 0
      ? "This size is sold out"
      : selected.stock <= threshold
        ? `Only ${selected.stock} left`
        : null;

  const shippingCopy =
    shippingNote || "Cash on delivery available across Nepal.";
  const returnCopy =
    returnPolicy || "Returns accepted within 7 days of delivery.";

  return (
    <div className={cn("flex h-full flex-col")}>
      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 8 }}
        animate={mounted ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: duration(0.4), delay: 0.15, ease: EASE }}
      >
        <div
          className={cn("font-display")}
          style={{
            fontSize: 12,
            letterSpacing: "0.1em",
            color: "var(--stitch-smoke)",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Price
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <div
            className={cn("font-sans")}
            style={{
              fontSize: 22,
              fontWeight: 300,
              color: "var(--stitch-parchment)",
              letterSpacing: "0.04em",
            }}
          >
            {formatNPR(sellingPrice)}
          </div>
          {isOnSale ? (
            <div
              className={cn("font-sans")}
              style={{
                fontSize: 15,
                color: "var(--stitch-smoke)",
                textDecoration: "line-through",
                marginLeft: 10,
              }}
            >
              {formatNPR(marketPrice)}
            </div>
          ) : null}
          {isOnSale && (
            <div
              style={{
                fontFamily: "var(--stitch-font-sans)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--stitch-ash)",
                border: "0.5px solid var(--stitch-border)",
                padding: "2px 7px",
                marginLeft: 8,
                whiteSpace: "nowrap",
              }}
            >
              Sale
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scaleX: reduced ? 1 : 0 }}
        animate={mounted ? { opacity: 1, scaleX: 1 } : undefined}
        transition={{ duration: duration(0.5), delay: 0.35, ease: EASE }}
        style={{
          borderTop: "0.5px solid var(--stitch-border)",
          margin: "0 0 22px",
          transformOrigin: "left",
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={mounted ? { opacity: 1 } : undefined}
        transition={{ duration: duration(0.35), delay: 0.4, ease: EASE }}
        style={{
          fontSize: 12,
          letterSpacing: "0.12em",
          color: "var(--stitch-ash)",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        Select size
      </motion.div>

      <div className={cn("flex flex-wrap")} style={{ gap: 6 }}>
        {variants.map((variant, index) => {
          const selectedState = selectedVariantId === variant._id;
          const outOfStock = variant.stock < 1;

          return (
            <motion.button
              key={variant._id}
              type="button"
              initial={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
              animate={mounted ? { opacity: 1, scale: 1 } : undefined}
              transition={{
                duration: duration(0.3),
                delay: reduced ? 0 : 0.45 + index * 0.04,
                ease: EASE,
              }}
              className={cn("relative inline-flex items-center justify-center")}
              onClick={() => {
                if (outOfStock) return;
                setSelectedVariantId(variant._id);
              }}
              disabled={outOfStock}
              style={{
                width: 40,
                height: 40,
                fontSize: 12,
                letterSpacing: "0.06em",
                background: "transparent",
                border: selectedState
                  ? "0.5px solid var(--stitch-ash)"
                  : "0.5px solid var(--stitch-border)",
                color: selectedState
                  ? "var(--stitch-parchment)"
                  : "var(--stitch-ash)",
                opacity: 1,
                cursor: outOfStock ? "default" : "pointer",
                pointerEvents: outOfStock ? "none" : "auto",
                transition: reduced
                  ? "none"
                  : "border-color 0.15s cubic-bezier(0.25, 0.1, 0.25, 1), color 0.15s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
              }}
              onMouseEnter={(event) => {
                if (outOfStock || selectedState) return;
                event.currentTarget.style.borderColor = "var(--stitch-ash)";
              }}
              onMouseLeave={(event) => {
                if (outOfStock || selectedState) return;
                event.currentTarget.style.borderColor = "var(--stitch-border)";
              }}
            >
              <span
                style={{
                  color: outOfStock ? "var(--stitch-border2)" : undefined,
                }}
              >
                {variant.size}
              </span>
              {outOfStock ? (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 0,
                    width: "100%",
                    height: "0.5px",
                    backgroundColor: "var(--stitch-border2)",
                    transform: "rotate(-25deg)",
                  }}
                />
              ) : null}
            </motion.button>
          );
        })}
      </div>

      <div style={{ minHeight: 18, marginTop: 12 }}>
        <AnimatePresence mode="wait">
          {stockNote ? (
            <motion.div
              key={stockNote}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration(0.3), ease: EASE }}
              style={{
                fontFamily: "var(--stitch-font-sans)",
                fontSize: 12,
                letterSpacing: "0.04em",
                color:
                  selected?.stock === 0
                    ? "var(--stitch-smoke)"
                    : "var(--stitch-ash)",
                marginBottom: 20,
              }}
            >
              {stockNote}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        initial={{ opacity: 0, y: reduced ? 0 : 8 }}
        animate={mounted ? { opacity: selected ? 1 : 0.3, y: 0 } : undefined}
        transition={{ duration: duration(0.4), delay: 0.65, ease: EASE }}
        className={cn(
          "relative mt-3 inline-flex w-full items-center justify-center overflow-hidden",
        )}
        onClick={handleAddToCart}
        disabled={!selected || selected.stock < 1}
        style={{
          padding: "15px 0",
          backgroundColor: "var(--stitch-linen)",
          color: "#111111",
          fontSize: 12,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          cursor: !selected || selected.stock < 1 ? "not-allowed" : "pointer",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={added ? "added" : "idle"}
            initial={{ opacity: 0, y: reduced ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -6 }}
            transition={{ duration: duration(0.2), ease: EASE }}
          >
            {added ? "Added to cart ✓" : "Add to cart"}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, scaleX: reduced ? 1 : 0 }}
        animate={mounted ? { opacity: 1, scaleX: 1 } : undefined}
        transition={{ duration: duration(0.5), delay: 0.7, ease: EASE }}
        style={{
          fontSize: 12,
          letterSpacing: "0.06em",
          color: "var(--stitch-smoke)",
          lineHeight: 1.8,
          marginTop: 16,
        }}
      >
        <div>{shippingCopy}</div>
        <div>{returnCopy}</div>
      </motion.div>
    </div>
  );
}
