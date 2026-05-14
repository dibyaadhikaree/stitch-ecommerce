import { ProductEditorPage } from "@/components/views/product-editor-page";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ProductEditorPage mode="edit" productId={id} />;
}
