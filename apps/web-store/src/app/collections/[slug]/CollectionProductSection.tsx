"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ProductCard } from "@/components/shop/ProductCard";
import CategoryBar from "@/components/shop/CategoryBar";
import type { StoreProduct, StoreCategory, StoreCollection } from "@/lib/api";

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export default function CollectionProductSection({
  collection,
  products,
}: {
  collection: StoreCollection;
  products: StoreProduct[];
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    setMounted(true);
  }, []);

  const dur = (base: number) => (reduced ? 0 : base);

  // Extract unique categories from this collection's products for sub-filtering
  const categories = useMemo((): StoreCategory[] => {
    const seen = new Set<string>();
    const result: StoreCategory[] = [];
    products.forEach((p) => {
      if (p.category && !seen.has(p.category.slug)) {
        seen.add(p.category.slug);
        result.push({
          _id: p.category.slug,
          name: p.category.name,
          slug: p.category.slug,
          productCount: products.filter(
            (product) => product.category?.slug === p.category.slug,
          ).length,
        });
      }
    });
    return result;
  }, [products]);

  const filtered = useMemo(() => {
    const base =
      activeCategory === "all"
        ? products
        : products.filter((p) => p.category?.slug === activeCategory);

    const next = [...base];
    if (sort === "price_asc") {
      next.sort((a, b) => a.sellingPrice - b.sellingPrice);
    } else if (sort === "price_desc") {
      next.sort((a, b) => b.sellingPrice - a.sellingPrice);
    }

    return next;
  }, [activeCategory, products, sort]);

  return (
    <>
      {/* Collection header */}
      <div
        style={{
          padding: "88px 24px 40px",
          borderBottom: "0.5px solid var(--rych-border)",
        }}
      >
        {/* Headline — clip-path sweep-up reveal, same as HeroSection */}
        <div style={{ overflow: "hidden" }}>
          <motion.h1
            initial={false}
            animate={
              mounted
                ? { clipPath: "inset(0% 0 0 0)" }
                : { clipPath: "inset(100% 0 0 0)" }
            }
            transition={{
              duration: dur(0.8),
              delay: dur(0.1),
              ease: EASE,
            }}
            className="font-display text-hero-sm"
            style={{ color: "var(--rych-parchment)", fontWeight: 300 }}
          >
            {collection.name}
          </motion.h1>
        </div>

        {collection.description && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={mounted ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: dur(0.6), delay: dur(0.5), ease: EASE }}
            style={{
              marginTop: 16,
              fontSize: 14,
              color: "var(--rych-ash)",
              maxWidth: 520,
              lineHeight: 1.65,
            }}
          >
            {collection.description}
          </motion.p>
        )}
      </div>

      {/* Category sub-filter — only shown when products span multiple categories */}
      {categories.length > 1 && (
        <CategoryBar
          categories={categories}
          active={activeCategory}
          onChange={(slug) => setActiveCategory(slug)}
          total={filtered.length}
          sort={sort}
          onSortChange={setSort}
        />
      )}

      {/* Product grid — same layout as /shop, stagger comes from ProductCard */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 px-6 lg:px-10 py-10">
          {filtered.map((product, i) => (
            <ProductCard key={product._id} product={product} index={i} />
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: "80px 24px",
            textAlign: "center",
            color: "var(--rych-ash)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            No products found
          </p>
        </div>
      )}
    </>
  );
}
