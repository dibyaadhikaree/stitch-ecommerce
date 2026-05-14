"use client";

import { useQuery } from "@tanstack/react-query";
import { getCollections } from "@/lib/api";
import type { StoreCollection } from "@/lib/api";
import CollectionsGrid from "./CollectionsGrid";

function SkeletonTile() {
  return (
    <div
      style={{
        aspectRatio: "1",
        backgroundColor: "var(--rych-lift)",
        borderRadius: 0,
      }}
    />
  );
}

export default function CollectionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: getCollections,
    staleTime: 60000,
  });

  const collections: StoreCollection[] = data ?? [];

  console.log(collections, "in collection page");

  if (isLoading) {
    return (
      <main style={{ background: "var(--rych-bg)", minHeight: "100vh" }}>
        <div
          style={{
            padding: "88px 24px 24px",
            borderBottom: "0.5px solid var(--rych-border)",
          }}
        >
          <span
            className="font-display"
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "var(--rych-ash)",
              textTransform: "uppercase",
            }}
          >
            Collections
          </span>
        </div>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          style={{
            padding: "24px",
            gap: "1px",
            backgroundColor: "var(--rych-border)",
          }}
        >
          {[...Array(4)].map((_, i) => (
            <SkeletonTile key={i} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "var(--rych-bg)", minHeight: "100vh" }}>
      <div
        style={{
          padding: "88px 24px 24px",
          borderBottom: "0.5px solid var(--rych-border)",
        }}
      >
        <span
          className="font-display"
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: "var(--rych-ash)",
            textTransform: "uppercase",
          }}
        >
          Collections
        </span>
      </div>
      {collections.length === 0 ? (
        <div
          style={{
            padding: "80px 24px",
            textAlign: "center",
            color: "var(--rych-ash)",
          }}
        >
          <p
            className="font-sans"
            style={{
              fontSize: 14,
              color: "var(--rych-ash)",
            }}
          >
            No collections yet
          </p>
        </div>
      ) : (
        <CollectionsGrid collections={collections} />
      )}
    </main>
  );
}
