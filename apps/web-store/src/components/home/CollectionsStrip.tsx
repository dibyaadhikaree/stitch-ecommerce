"use client";

import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { getCollections, type StoreCollection } from "@/lib/api";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export default function CollectionsStrip() {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });
  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: getCollections,
    staleTime: 60000,
  });

  return (
    <section
      ref={containerRef}
      style={{ display: "flex", height: "60vh", overflow: "hidden" }}
    >
      {collections.length === 0
        ? Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              style={{
                flex: "0 0 33.333333%",
                position: "relative",
                overflow: "hidden",
                background: "var(--stitch-lift)",
              }}
            >
              {i < 2 && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "1px",
                    height: "100%",
                    backgroundColor: "var(--stitch-border)",
                    zIndex: 1,
                  }}
                />
              )}
            </div>
          ))
        : collections.map((col, i) => (
            <CollectionTile
              key={col.slug}
              collection={col}
              index={i}
              total={collections.length}
              isInView={isInView}
              reduced={reduced}
            />
          ))}
    </section>
  );
}

function CollectionTile({
  collection,
  index,
  total,
  isInView,
  reduced,
}: {
  collection: StoreCollection;
  index: number;
  total: number;
  isInView: boolean;
  reduced: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 20 }}
      animate={
        isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: reduced ? 0 : 20 }
      }
      transition={{
        duration: reduced ? 0 : 0.6,
        delay: reduced ? 0 : index * 0.1,
        ease: EASE,
      }}
      whileHover="tileHover"
      style={{
        flex: `0 0 ${100 / total}%`,
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <Link
        href={`/collections/${collection.slug}`}
        style={{ display: "block", height: "100%" }}
      >
        {/* Background — TODO: Replace with real collection image */}
        <motion.div
          variants={{ tileHover: { scale: 1.06 } }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{
            position: "absolute",
            inset: 0,
            background: collection.coverImage
              ? undefined
              : "var(--stitch-lift)",
            backgroundImage: collection.coverImage
              ? `linear-gradient(to top, rgba(13, 13, 13, 0.68), rgba(13, 13, 13, 0.18)), url('${collection.coverImage}')`
              : undefined,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        />

        {/* Right border separator */}
        {index < total - 1 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "1px",
              height: "100%",
              backgroundColor: "var(--stitch-border)",
              zIndex: 1,
            }}
          />
        )}

        {/* Text overlay — bottom-left */}
        <motion.div
          variants={{ tileHover: { y: -4 } }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontFamily: "var(--stitch-font-display)",
              fontSize: "24px",
              fontWeight: 300,
              color: "var(--stitch-parchment)",
            }}
          >
            {collection.name}
          </span>
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "0.12em",
              color: "var(--stitch-ash)",
              marginTop: "6px",
              textTransform: "uppercase",
            }}
          >
            Explore →
          </span>
        </motion.div>
      </Link>
    </motion.div>
  );
}
