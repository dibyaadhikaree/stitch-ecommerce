"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { StoreCollection } from "@/lib/api";

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export default function CollectionsGrid({
  collections = [],
}: {
  collections?: StoreCollection[];
}) {
  const reduced = useReducedMotion();

  if (collections.length === 0) {
    return (
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
          No collections yet
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      style={{ padding: "24px", gap: "1px", backgroundColor: "var(--rych-border)" }}
    >
      {collections.map((collection, i) => (
        <CollectionTile
          key={collection.slug}
          collection={collection}
          index={i}
          reduced={reduced}
        />
      ))}
    </div>
  );
}

function CollectionTile({
  collection,
  index,
  reduced,
}: {
  collection: StoreCollection;
  index: number;
  reduced: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const delay = reduced ? 0 : (index % 3) * 0.08;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: reduced ? 0 : 20 }}
      animate={
        isInView
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: reduced ? 0 : 20 }
      }
      transition={{ duration: reduced ? 0 : 0.6, delay, ease: EASE }}
      style={{ backgroundColor: "var(--rych-bg)" }}
    >
      <Link
        href={`/collections/${collection.slug}`}
        style={{ display: "block", textDecoration: "none" }}
      >
        {/* Cover image */}
        <div
          style={{
            position: "relative",
            aspectRatio: "4/3",
            backgroundColor: "var(--rych-surface)",
            overflow: "hidden",
          }}
        >
          {collection.coverImage && (
            <motion.img
              src={collection.coverImage}
              alt={collection.name}
              whileHover={{ scale: 1.04 }}
              transition={{ duration: 0.5, ease: EASE }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}
          {/* Bottom gradient */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(17,17,17,0.65) 0%, rgba(17,17,17,0) 55%)",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Text below image */}
        <div
          style={{
            padding: "16px 0 8px",
            backgroundColor: "var(--rych-bg)",
          }}
        >
          <p
            className="font-display"
            style={{
              fontSize: 20,
              fontWeight: 300,
              color: "var(--rych-parchment)",
              marginBottom: collection.description ? 6 : 10,
            }}
          >
            {collection.name}
          </p>
          {collection.description && (
            <p
              style={{
                fontSize: 12,
                color: "var(--rych-ash)",
                lineHeight: 1.55,
                marginBottom: 10,
              }}
            >
              {collection.description}
            </p>
          )}
          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              color: "var(--rych-smoke)",
              textTransform: "uppercase",
            }}
          >
            Explore →
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
