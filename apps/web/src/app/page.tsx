"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { LoginPage } from "@/components/views/login-page";

export default function Home() {
  const router = useRouter();
  const { token, hydrated } = useAuthStore();

  useEffect(() => {
    if (hydrated && token) {
      router.replace("/dashboard");
    }
  }, [hydrated, token, router]);

  if (!hydrated) return <div className="min-h-screen bg-[#080808]" />;
  if (token) return <div className="min-h-screen bg-[#080808]" />;
  return <LoginPage />;
}
