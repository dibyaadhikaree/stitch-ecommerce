import { Suspense } from "react";
import { OrderCreatePage } from "@/components/views/order-create-page";

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080808]" />}>
      <OrderCreatePage />
    </Suspense>
  );
}
