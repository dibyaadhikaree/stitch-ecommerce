"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { StoreCategory } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  categories: StoreCategory[];
  active: string;
  onChange: (slug: string) => void;
  total: number;
  sort: string;
  onSortChange: (sort: string) => void;
};

type Pill = { label: string; value: string };

export default function CategoryBar({
  categories,
  active,
  onChange,
  total,
  sort,
  onSortChange,
}: Props) {
  const pills: Pill[] = [
    { label: "ALL", value: "all" },
    ...categories
      .filter((c) => c.productCount == null || c.productCount > 0)
      .map((c) => ({ label: c.name.toUpperCase(), value: c.slug })),
  ];

  return (
    <div
      className={cn("sticky z-30 flex items-center")}
      style={{
        top: "var(--rych-navbar-offset, 60px)",
        height: 48,
        padding: "0 24px",
        background: "rgba(17, 17, 17, 0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: "0.5px solid var(--rych-border)",
        gap: 16,
        transition: "top 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
      }}
    >
      {/* Scrollable pill row */}
      <div
        className="flex items-center flex-1 min-w-0 overflow-x-auto"
        style={{ gap: 8, scrollbarWidth: "none" }}
      >
        {pills.map((pill) => {
          const isActive = active === pill.value;
          return (
            <button
              key={pill.value}
              onClick={() => {
                if (pill.value === "all") {
                  if (active !== "all") onChange("all");
                } else {
                  const next = active === pill.value ? "all" : pill.value;
                  onChange(next);
                }
              }}
              className="relative shrink-0 overflow-hidden"
              style={{
                border: "0.5px solid var(--rych-border2)",
                padding: "6px 16px",
                borderRadius: 2,
                fontSize: 10,
                letterSpacing: "0.1em",
                background: "transparent",
                cursor: "pointer",
                transition: "border-color 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  const el = e.currentTarget;
                  el.style.borderColor = "var(--rych-parchment)";
                  el.style.color = "var(--rych-parchment)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  const el = e.currentTarget;
                  el.style.borderColor = "var(--rych-border2)";
                  el.style.color = "var(--rych-ash)";
                }
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0"
                  style={{
                    background: "var(--rych-parchment)",
                    borderRadius: 2,
                  }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                />
              )}
              <span
                className="relative z-10"
                style={{
                  color: isActive ? "var(--rych-bg)" : "var(--rych-ash)",
                }}
              >
                {pill.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Item count */}
      <span
        className="shrink-0"
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          color: "var(--rych-ash)",
        }}
      >
        {total} items
      </span>

      {/* Sort selector */}
      <div
        className="relative shrink-0"
        style={{ display: "flex", alignItems: "center", gap: 4 }}
      >
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--rych-ash)",
            fontFamily: "var(--rych-font-sans)",
            fontSize: 11,
            letterSpacing: "0.08em",
            cursor: "pointer",
            outline: "none",
            appearance: "none",
            WebkitAppearance: "none",
            paddingRight: 20,
          }}
        >
          <option
            value="newest"
            style={{ background: "#111111", color: "#F0EDE6" }}
          >
            New arrivals
          </option>
          <option
            value="price_asc"
            style={{ background: "#111111", color: "#F0EDE6" }}
          >
            Price: low to high
          </option>
          <option
            value="price_desc"
            style={{ background: "#111111", color: "#F0EDE6" }}
          >
            Price: high to low
          </option>
        </select>
        <ChevronDown
          size={14}
          style={{
            position: "absolute",
            right: 0,
            color: "var(--rych-ash)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
