"use client";

import { useAuthStore } from "@/lib/auth-store";
import { SettingsView } from "@/components/views/settings-view";

export default function SettingsPage() {
  const { token } = useAuthStore();
  if (!token) return null;
  return <SettingsView token={token} />;
}
