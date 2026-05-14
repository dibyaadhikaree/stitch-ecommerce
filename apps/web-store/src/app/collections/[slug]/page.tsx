import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollections, getProducts } from "@/lib/api";
import CollectionProductSection from "./CollectionProductSection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { products } = await getProducts({ collection: slug });
    const title =
      slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
    return {
      title,
      description: `${products.length} styles in this collection — STITCH.`,
    };
  } catch {
    return { title: "Collection — STITCH" };
  }
}

export default async function CollectionSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const collections = await getCollections();

  const collection = collections.find((c) => c.slug === slug);

  if (!collection) notFound();

  // Pass slug — store API resolves slug → collection name for productCollection filter
  const { products = [] } = await getProducts({ collection: slug, limit: 48 });

  if (products.length === 0) {
    return (
      <main style={{ background: "var(--stitch-bg)", minHeight: "100vh" }}>
        <div
          style={{
            padding: "120px 24px 24px",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(32px, 5vw, 56px)",
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              color: "var(--stitch-parchment)",
              marginBottom: 24,
            }}
          >
            {collection.name}
          </h1>
          <p
            className="font-sans"
            style={{
              fontSize: 13,
              color: "var(--stitch-ash)",
              marginBottom: 40,
            }}
          >
            No products in this collection yet.
          </p>
          <a
            href="/collections"
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "var(--stitch-ash)",
              textTransform: "uppercase",
              textDecoration: "none",
              transition: "color 200ms",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--stitch-parchment)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--stitch-ash)")
            }
          >
            Back to Collections
          </a>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "var(--stitch-bg)", minHeight: "100vh" }}>
      <CollectionProductSection collection={collection} products={products} />
    </main>
  );
}
