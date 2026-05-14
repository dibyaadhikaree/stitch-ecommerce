import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getProducts, getSettings } from "@/lib/api";
import Accordion from "@/components/product/Accordion";
import ImageSlider from "@/components/product/ImageSlider";
import ProductInfo from "@/components/product/ProductInfo";
import PurchasePanel from "@/components/product/PurchasePanel";
import RelatedScroll from "@/components/product/RelatedScroll";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { product } = await getProductBySlug(slug);
    const image =
      product.media?.find((m) => m.isPrimary)?.url ?? product.media?.[0]?.url;
    return {
      title: product.name,
      description: `${product.name} — NPR ${product.sellingPrice}. Premium minimal fashion by STITCH.`,
      openGraph: {
        title: product.name,
        images: image ? [{ url: image }] : [],
      },
    };
  } catch {
    return { title: "Product not found" };
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  let product;
  let relatedProducts: import("@/lib/api").StoreProduct[] = [];
  let sizeGuideContent = "";
  let shippingNote = "";
  let returnPolicyContent = "";

  try {
    const { slug } = await params;
    const res = await getProductBySlug(slug);
    product = res.product;

    const settings = await getSettings();
    if (product.category?.slug && settings?.sizeGuide) {
      sizeGuideContent = settings.sizeGuide[product.category.slug] ?? "";
    }
    shippingNote = settings?.shippingNote ?? "";
    returnPolicyContent = settings?.returnPolicy ?? "";

    const { products: allProducts = [] } = await getProducts({ limit: 48 });
    relatedProducts = allProducts.filter((p) => p.slug !== slug);
  } catch {
    notFound();
  }

  const primaryImage =
    product.media.find((m) => m.isPrimary)?.url ??
    product.media[0]?.url ??
    "/images/product-placeholder.jpg.png";

  return (
    <main
      style={{
        backgroundColor: "var(--rych-bg)",
        color: "var(--rych-parchment)",
        paddingTop: "60px",
      }}
    >
      <style>{`
        @media (max-width: 767px) {
          .pdp-grid {
            grid-template-columns: 1fr !important;
          }

          .pdp-col-center {
            order: -1;
            height: 70vw !important;
            min-height: 70vw !important;
            position: relative !important;
            top: auto !important;
          }

          .pdp-col-left {
            border-right: none !important;
            padding: 32px 24px !important;
          }

          .pdp-col-right {
            border-left: none !important;
            border-top: 0.5px solid var(--rych-border);
            padding: 32px 24px !important;
          }

          .pdp-below-fold {
            padding: 60px 24px !important;
          }
        }
      `}</style>
      <section
        className="pdp-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr 1fr",
          minHeight: "calc(100vh - 60px)",
          width: "100%",
          background: "var(--rych-bg)",
          position: "relative",
          borderBottom: "0.5px solid var(--rych-border)",
        }}
      >
        <div
          className="pdp-col-left"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRight: "0.5px solid var(--rych-border)",
            padding: "96px 32px 48px 40px",
          }}
        >
          <ProductInfo
            name={product.name}
            category={product.category}
            description={undefined}
            productCollection={
              (product as { productCollection?: string; collection?: string })
                .productCollection ??
              (product as { collection?: string }).collection
            }
          />
        </div>

        <div
          className="pdp-col-center"
          style={{
            height: "calc(100vh - 60px)",
            position: "sticky",
            top: "60px",
            overflow: "hidden",
          }}
        >
          <ImageSlider
            media={
              product.media.length > 0
                ? product.media.map((item) => ({
                    url: item.url,
                    isPrimary: item.isPrimary,
                  }))
                : [
                    {
                      url: "/images/product-placeholder.jpg.png",
                      isPrimary: true,
                    },
                  ]
            }
            productName={product.name}
          />
        </div>

        <div
          className="pdp-col-right"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderLeft: "0.5px solid var(--rych-border)",
            padding: "96px 40px 48px 32px",
          }}
        >
          <PurchasePanel
            productId={product._id}
            productName={product.name}
            primaryImage={primaryImage}
            sellingPrice={product.sellingPrice}
            marketPrice={product.marketPrice}
            variants={product.variants}
            shippingNote={shippingNote}
            returnPolicy={returnPolicyContent}
          />
        </div>
      </section>

      <section
        className="pdp-below-fold"
        style={{
          borderTop: "0.5px solid var(--rych-border)",
          padding: "60px 40px",
          width: "100%",
        }}
      >
        <div style={{ marginBottom: 48 }}>
          <RelatedScroll products={relatedProducts} />
        </div>

        <div>
          <Accordion title="Care" defaultOpen>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.04em",
                color: "var(--rych-ash)",
                lineHeight: 1.9,
              }}
            >
              Machine wash cold on gentle cycle. Do not tumble dry - lay flat to
              dry. Iron on low heat. Do not bleach. Dry clean if preferred.
            </div>
          </Accordion>

          <Accordion title="Shipping & Returns">
            <pre
              style={{
                fontFamily: "var(--rych-font-sans)",
                fontSize: 10,
                letterSpacing: "0.04em",
                color: "var(--rych-ash)",
                lineHeight: 1.9,
                whiteSpace: "pre-line",
                margin: 0,
              }}
            >
              {returnPolicyContent ||
                "Free delivery on orders above Rs. 2,500. Standard delivery 3-5 business days. Returns accepted within 7 days of delivery — item must be unworn with tags attached. Cash on delivery available across Nepal."}
            </pre>
          </Accordion>

          <Accordion title="Size Guide">
            <pre
              style={{
                fontFamily: "var(--rych-font-sans)",
                fontSize: 12,
                lineHeight: 1.9,
                color: "var(--rych-ash)",
                whiteSpace: "pre-line",
                margin: 0,
              }}
            >
              {sizeGuideContent || "Size guide coming soon."}
            </pre>
          </Accordion>
        </div>
      </section>
    </main>
  );
}
