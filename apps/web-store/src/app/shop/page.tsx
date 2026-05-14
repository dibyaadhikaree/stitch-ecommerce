"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts, getCategories, type StoreProduct } from "@/lib/api";
import { ProductCard } from "@/components/shop/ProductCard";
import CategoryBar from "@/components/shop/CategoryBar";

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [allProducts, setAllProducts] = useState<StoreProduct[]>([]);

  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["products", { category: activeCategory === "all" ? undefined : activeCategory, sort }, page],
    queryFn: () =>
      getProducts({
        category: activeCategory === "all" ? undefined : activeCategory,
        sort,
        page,
        limit: 24,
      }),
  });

  useEffect(() => {
    if (data?.products) {
      setAllProducts((prev) =>
        page === 1 ? data.products : [...prev, ...data.products],
      );
    }
  }, [data, page]);

  const handleCategoryChange = (slug: string) => {
    setAllProducts([]);
    setPage(1);
    setActiveCategory(slug);
  };

  const handleSortChange = (newSort: string) => {
    setAllProducts([]);
    setPage(1);
    setSort(newSort);
  };

  const categories = catData ?? [];
  const totalProducts = data?.total ?? allProducts.length;
  const totalPages = data?.pages ?? 1;
  const isEmpty = !isLoading && allProducts.length === 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--rych-bg)" }}>
      {/* Page header */}
      <div style={{ padding: "80px 24px 0" }}>
        <span
          className="font-display uppercase"
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: "var(--rych-ash)",
          }}
        >
          SHOP
        </span>
      </div>

      {/* Category pill bar */}
      <CategoryBar
        categories={categories}
        active={activeCategory}
        onChange={handleCategoryChange}
        total={totalProducts}
        sort={sort}
        onSortChange={handleSortChange}
      />

      {/* Product grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 px-6 lg:px-10 py-10">
        {allProducts.map((product, i) => (
          <ProductCard key={product._id} product={product} index={i} />
        ))}

        {/* Skeleton placeholders on initial load */}
        {isLoading &&
          allProducts.length === 0 &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div
                className="aspect-[4/5] bg-surface"
                style={{ borderRadius: 2 }}
              />
              <div
                className="bg-surface"
                style={{
                  height: 13,
                  marginTop: 12,
                  borderRadius: 2,
                  width: "60%",
                }}
              />
              <div
                className="bg-surface"
                style={{
                  height: 12,
                  marginTop: 6,
                  borderRadius: 2,
                  width: "30%",
                }}
              />
            </div>
          ))}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div
          className="flex flex-col items-center justify-center"
          style={{ padding: "80px 24px", color: "var(--rych-ash)" }}
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

      {/* Load more */}
      {!isLoading && page < totalPages && (
        <div className="flex justify-center" style={{ padding: "16px 0 64px" }}>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={isFetching}
            style={{
              border: "0.5px solid var(--rych-border2)",
              color: isFetching ? "var(--rych-smoke)" : "var(--rych-ash)",
              background: "transparent",
              fontSize: 10,
              letterSpacing: "0.2em",
              padding: "12px 32px",
              borderRadius: 2,
              cursor: isFetching ? "not-allowed" : "pointer",
              transition: "border-color 0.2s, color 0.2s",
              textTransform: "uppercase",
            }}
            onMouseEnter={(e) => {
              if (!isFetching) {
                e.currentTarget.style.borderColor = "var(--rych-parchment)";
                e.currentTarget.style.color = "var(--rych-parchment)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isFetching) {
                e.currentTarget.style.borderColor = "var(--rych-border2)";
                e.currentTarget.style.color = "var(--rych-ash)";
              }
            }}
          >
            {isFetching ? "LOADING..." : "LOAD MORE"}
          </button>
        </div>
      )}
    </div>
  );
}
