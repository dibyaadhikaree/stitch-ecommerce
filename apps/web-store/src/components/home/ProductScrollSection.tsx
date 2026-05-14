"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { formatNPR } from "@/lib/utils";
import { type StoreProduct } from "@/lib/api";

type ProductScrollSectionProps = {
  id?: string;
  products: StoreProduct[];
};

export default function ProductScrollSection({
  id,
  products,
}: ProductScrollSectionProps) {
  console.log(id, products, "id and products on homepage ");

  const sectionRef = useRef<HTMLElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSectionInView = useInView(sectionRef, { amount: 0.6 });
  const userStoppedAutoScrollRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const autoScrollingRef = useRef(false);

  const handleSlideInView = useCallback((index: number) => {
    setActiveSlide(index);
  }, []);

  const isEmpty = products.length === 0;
  const total = products.length;

  useEffect(() => {
    const scrollElement = scrollRef.current;

    if (!scrollElement) {
      return;
    }

    const handleScroll = () => {
      const currentScrollTop = scrollElement.scrollTop;

      if (
        !autoScrollingRef.current &&
        currentScrollTop < lastScrollTopRef.current
      ) {
        userStoppedAutoScrollRef.current = true;
      }

      lastScrollTopRef.current = currentScrollTop;
    };

    scrollElement.addEventListener("scroll", handleScroll);

    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (
      !isSectionInView ||
      !scrollRef.current ||
      userStoppedAutoScrollRef.current
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveSlide((current) => {
        const nextSlide = (current + 1) % total;
        autoScrollingRef.current = true;
        scrollRef.current?.scrollTo({
          top: nextSlide * window.innerHeight,
          behavior: "smooth",
        });
        window.setTimeout(() => {
          autoScrollingRef.current = false;
          if (scrollRef.current) {
            lastScrollTopRef.current = scrollRef.current.scrollTop;
          }
        }, 450);

        return nextSlide;
      });
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [activeSlide, isSectionInView, total]);

  return (
    <section
      id={id}
      ref={sectionRef}
      style={{ position: "relative", overflowX: "hidden" }}
    >
      {/* Scroll-snap container */}
      <div
        ref={scrollRef}
        style={{
          height: "100vh",
          overflowY: "scroll",
          overflowX: "hidden",
          scrollSnapType: "y mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {isEmpty
          ? [0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  scrollSnapAlign: "start",
                  height: "100vh",
                  width: "100%",
                  backgroundColor: "var(--rych-surface)",
                }}
              />
            ))
          : products.map((product, i) => (
              <ProductSlide
                key={product._id}
                product={product}
                index={i}
                scrollRoot={scrollRef}
                onInView={handleSlideInView}
              />
            ))}
      </div>

      {/* Slide counter — absolute over the scroll container */}
      {!isEmpty && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: "48px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "0.1em",
              color: "var(--rych-ash)",
            }}
          >
            {String(activeSlide + 1).padStart(2, "0")}
          </span>
          <span style={{ fontSize: "8px", color: "var(--rych-border2)" }}>
            /
          </span>
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "0.1em",
              color: "var(--rych-smoke)",
            }}
          >
            {String(total).padStart(2, "0")}
          </span>
        </div>
      )}
    </section>
  );
}

function ProductSlide({
  product,
  index,
  scrollRoot,
  onInView,
}: {
  product: StoreProduct;
  index: number;
  scrollRoot: React.RefObject<HTMLDivElement | null>;
  onInView: (index: number) => void;
}) {
  const reduced = useReducedMotion();
  const slideRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((s) => s.addItem);

  const isEven = index % 2 === 0;

  const isInView = useInView(slideRef, {
    root: scrollRoot as React.RefObject<Element>,
    once: true,
    amount: 0.5,
  });

  const isVisible = useInView(slideRef, {
    root: scrollRoot as React.RefObject<Element>,
    amount: 0.5,
  });

  useEffect(() => {
    if (isVisible) onInView(index);
  }, [isVisible, index, onInView]);

  const primaryImage =
    product.media.find((m) => m.isPrimary)?.url ??
    product.media[0]?.url ??
    "/images/product-placeholder.jpg.png";

  const firstAvailable = product.variants.find((v) => v.stock > 0);

  const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
  const dur = reduced ? 0 : 0.7;

  // Stagger container for text lines
  const textContainer = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduced ? 0 : 0.06,
        delayChildren: reduced ? 0 : 0.15,
      },
    },
  };

  const textItem = {
    hidden: { opacity: 0, y: reduced ? 0 : 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : 0.5, ease: EASE },
    },
  };

  const imagePanel = (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
      transition={{ duration: dur, ease: EASE }}
      style={{ flex: 1, minWidth: 0, position: "relative", height: "100%" }}
    >
      {/* TODO: Replace with real product image from product.media */}
      <Image
        src={primaryImage}
        alt={product.name}
        fill
        sizes="50vw"
        style={{ objectFit: "cover" }}
      />
    </motion.div>
  );

  const infoPanel = (
    <motion.div
      initial={{ opacity: 0, x: isEven ? -40 : 40 }}
      animate={
        isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: isEven ? -40 : 40 }
      }
      transition={{ duration: dur, delay: reduced ? 0 : 0.1, ease: EASE }}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px",
        backgroundColor: "var(--rych-bg)",
      }}
    >
      <motion.div
        variants={textContainer}
        initial="hidden"
        animate={isInView ? "show" : "hidden"}
        style={{ maxWidth: "360px", width: "100%" }}
      >
        {/* Category */}
        <motion.p
          variants={textItem}
          style={{
            fontSize: "10px",
            letterSpacing: "0.14em",
            color: "var(--rych-ash)",
            textTransform: "uppercase",
            marginBottom: "12px",
          }}
        >
          {product.category.name}
        </motion.p>

        {/* Name */}
        <motion.h2
          variants={textItem}
          style={{
            fontFamily: "var(--rych-font-display)",
            fontSize: "clamp(28px, 4vw, 52px)",
            fontWeight: 300,
            color: "var(--rych-parchment)",
            lineHeight: 1.1,
            marginBottom: "16px",
          }}
        >
          {product.name}
        </motion.h2>

        {/* Price */}
        <motion.div
          variants={textItem}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              letterSpacing: "0.06em",
              color: "var(--rych-parchment)",
            }}
          >
            {formatNPR(product.sellingPrice)}
          </span>
          {product.marketPrice &&
            product.marketPrice > product.sellingPrice && (
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--rych-smoke)",
                  textDecoration: "line-through",
                }}
              >
                {formatNPR(product.marketPrice)}
              </span>
            )}
        </motion.div>

        {/* Sizes */}
        <motion.div
          variants={textItem}
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "32px",
          }}
        >
          {product.variants.map((v) => (
            <button
              key={v.size}
              disabled={v.stock === 0}
              style={{
                width: "32px",
                height: "32px",
                border: "0.5px solid var(--rych-border2)",
                fontSize: "10px",
                background: "transparent",
                color:
                  v.stock === 0 ? "var(--rych-smoke)" : "var(--rych-parchment)",
                cursor: v.stock === 0 ? "not-allowed" : "pointer",
                letterSpacing: "0.04em",
              }}
            >
              {v.size}
            </button>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div
          variants={textItem}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <Link
            href={`/shop/${product.slug}`}
            className={cn()}
            style={{
              fontSize: "11px",
              letterSpacing: "0.12em",
              color: "var(--rych-ash)",
              textDecoration: "none",
              transition: "color 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLAnchorElement).style.color =
                "var(--rych-parchment)")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLAnchorElement).style.color = "var(--rych-ash)")
            }
          >
            VIEW PRODUCT →
          </Link>

          {firstAvailable && (
            <button
              onClick={() =>
                addItem({
                  productId: product._id,
                  variantId: `${product._id}-${firstAvailable.size}`,
                  name: product.name,
                  sku: `${product.slug}-${firstAvailable.size}`,
                  size: firstAvailable.size,
                  price: product.sellingPrice,
                  image: primaryImage,
                })
              }
              style={{
                alignSelf: "flex-start",
                backgroundColor: "var(--rych-linen)",
                color: "var(--rych-bg)",
                fontSize: "10px",
                letterSpacing: "0.16em",
                padding: "12px 24px",
                border: "none",
                cursor: "pointer",
              }}
            >
              ADD TO CART
            </button>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );

  return (
    <div
      ref={slideRef}
      style={{
        scrollSnapAlign: "start",
        height: "100vh",
        width: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isEven ? (
        <>
          {imagePanel}
          {infoPanel}
        </>
      ) : (
        <>
          {infoPanel}
          {imagePanel}
        </>
      )}
    </div>
  );
}
