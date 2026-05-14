"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn, formatNPR } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type ProductCardData = {
  _id: string;
  name: string;
  slug: string;
  sellingPrice: number;
  marketPrice?: number;
  category: { name: string; slug: string };
  media: {
    url: string;
    isPrimary: boolean;
    tag?: string;
    sortOrder?: number;
  }[];
  variants: { _id: string; size: string; stock: number }[];
};

interface ProductCardProps {
  product: ProductCardData;
  index?: number;
  className?: string;
}

export function ProductCard({
  product,
  index = 0,
  className,
}: ProductCardProps) {
  const reduced = useReducedMotion();
  const cardRef = React.useRef<HTMLDivElement>(null);
  const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [tiltStyle, setTiltStyle] = React.useState<React.CSSProperties>({});
  const [showSecond, setShowSecond] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const sortedMedia = [...product.media].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  const primaryImage =
    sortedMedia.find((m) => m.isPrimary)?.url ??
    sortedMedia[0]?.url ??
    "/images/product-placeholder.jpg.png";

  // Prefer back-tagged image as secondary; fall back to second sorted image
  const secondaryImage =
    sortedMedia.find((m) => m.tag === "back")?.url ??
    sortedMedia[1]?.url ??
    "/images/product-placeholder.jpg.png";

  const isSoldOut = product.variants.every((v) => v.stock === 0);
  const isOnSale =
    product.marketPrice != null &&
    product.marketPrice > product.sellingPrice &&
    product.marketPrice > 0;

  // Scroll-reveal mount animation
  React.useEffect(() => {
    const delay = reduced ? 0 : (index % 3) * 80;
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [index, reduced]);

  // --- 3D TILT ---
  const handleMouseMove = (e: React.MouseEvent) => {
    if (reduced || !cardRef.current) return;
    if ("ontouchstart" in window) return;
    const { left, top, width, height } =
      cardRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    const rX = ((y - height / 2) / (height / 2)) * -5;
    const rY = ((x - width / 2) / (width / 2)) * 5;
    setTiltStyle({
      transform: `perspective(900px) rotateX(${rX}deg) rotateY(${rY}deg) scale3d(1.025,1.025,1.025)`,
      transition: "transform 0.1s ease-out",
    });
  };

  const handleMouseEnter = () => {
    // Start 0.8s timer — if hover stays, swap to second image
    hoverTimerRef.current = setTimeout(() => {
      setShowSecond(true);
    }, 800);
  };

  const handleMouseLeave = () => {
    // Cancel timer and reset everything
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setShowSecond(false);
    setTiltStyle({
      transform:
        "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
      transition: "transform 0.55s cubic-bezier(0.25,0.1,0.25,1)",
    });
  };

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const imgTransition = reduced ? "none" : "opacity 0.5s ease";

  return (
    <div
      className={cn("card-link", className)}
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: reduced ? "none" : "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      <Link href={`/shop/${product.slug}`}>
        {/* 3D TILT WRAPPER */}
        <div
          ref={cardRef}
          style={tiltStyle}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* IMAGE — aspect 4:5, no border-radius, clean edges */}
          <div className="relative aspect-[4/5] overflow-hidden">
            {/* PRIMARY IMAGE */}
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
              style={{
                opacity: showSecond ? 0 : 1,
                transition: imgTransition,
              }}
            />

            {/* SECONDARY IMAGE — fades in after 0.8s hover */}
            <Image
              src={secondaryImage}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
              style={{
                opacity: showSecond ? 1 : 0,
                transition: imgTransition,
              }}
            />

            {/* SOLD OUT BADGE */}
            {isSoldOut && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  fontFamily: "var(--stitch-font-sans)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  backgroundColor: "var(--stitch-bg)",
                  opacity: 0.85,
                  color: "var(--stitch-ash)",
                  padding: "3px 7px",
                }}
              >
                SOLD OUT
              </div>
            )}
          </div>

          {/* INFO BLOCK — everything below the image, nothing on it */}
          <div style={{ paddingTop: 10 }}>
            {/* ROW 1: Name left, Price right */}
            <div
              className="flex items-center justify-between"
              style={{ gap: 8 }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 300,
                  color: "var(--stitch-parchment)",
                  lineHeight: 1.4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {product.name}
              </span>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: isOnSale
                      ? "var(--stitch-parchment)"
                      : "var(--stitch-ash)",
                  }}
                >
                  {formatNPR(product.sellingPrice)}
                </span>
                {isOnSale && product.marketPrice != null && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--stitch-smoke)",
                      textDecoration: "line-through",
                    }}
                  >
                    {formatNPR(product.marketPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* ROW 2: Category label */}
            <span
              style={{
                display: "block",
                fontSize: 9,
                color: "var(--stitch-smoke)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginTop: 4,
              }}
            >
              {product.category.name}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default ProductCard;
