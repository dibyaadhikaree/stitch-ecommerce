"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSettings,
  updateSettings,
  getCategories,
  type PaymentStatus,
  type Settings,
  type Category,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/admin/primitives";

const PAYMENT_METHOD_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cod", label: "COD" },
  { value: "esewa", label: "eSewa" },
  { value: "khalti", label: "Khalti" },
];

const DEFAULT_SETTINGS: Settings = {
  shopName: "STITCH Studio",
  currency: "NPR",
  lowStockThreshold: 5,
  acceptedPaymentMethods: ["cash", "bank_transfer", "cod", "esewa", "khalti"],
  aboutHeadline: "",
  aboutBody: "",
  aboutImageUrl: "",
  instagramHandle: "",
  tiktokHandle: "",
  whatsappNumber: "",
  sizeGuide: {},
  seoTitle: "STITCH",
  seoDescription: "Premium minimal fashion.",
  footerTagline: "",
  shippingNote: "",
  returnPolicy: "",
};

function normalizeSettings(settings?: Partial<Settings> | null): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    currency: "NPR",
    acceptedPaymentMethods: Array.isArray(settings?.acceptedPaymentMethods)
      ? settings.acceptedPaymentMethods
      : DEFAULT_SETTINGS.acceptedPaymentMethods,
    sizeGuide: settings?.sizeGuide ?? DEFAULT_SETTINGS.sizeGuide,
  };
}

export function SettingsView({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [settingsDraft, setSettingsDraft] = useState<Settings | null>(null);
  const [sizeGuideDraft, setSizeGuideDraft] = useState<Record<
    string,
    string
  > | null>(null);
  const [sizeGuideSaved, setSizeGuideSaved] = useState(false);
  const [storefrontSaved, setStorefrontSaved] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings(token),
    staleTime: 30_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(token),
    staleTime: 60_000,
  });

  const activeSettings = normalizeSettings(
    settingsDraft ?? settingsQuery.data?.item,
  );
  const activeSizeGuide = sizeGuideDraft ?? activeSettings.sizeGuide ?? {};

  const settingsMutation = useMutation({
    mutationFn: (payload: Settings) => updateSettings(token, payload),
    onSuccess: async () => {
      setSettingsDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const storefrontMutation = useMutation({
    mutationFn: (payload: Settings) => updateSettings(token, payload),
    onSuccess: async () => {
      setSettingsDraft(null);
      setStorefrontSaved(true);
      setTimeout(() => setStorefrontSaved(false), 2000);
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const sizeGuideMutation = useMutation({
    mutationFn: (payload: Record<string, string>) =>
      updateSettings(token, { ...activeSettings, sizeGuide: payload }),
    onSuccess: async () => {
      setSizeGuideDraft(null);
      setSizeGuideSaved(true);
      setTimeout(() => setSizeGuideSaved(false), 2000);
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const seoTitleLen = (activeSettings.seoTitle ?? "").length;
  const seoDescLen = (activeSettings.seoDescription ?? "").length;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="rounded-[30px]">
        <CardHeader>
          <CardTitle>Store settings</CardTitle>
          <CardDescription>
            Keep the app aligned with the way the business actually runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <FormField label="Store name">
            <Input
              value={activeSettings.shopName}
              onChange={(e) =>
                setSettingsDraft((current) => ({
                  ...(current ?? activeSettings),
                  shopName: e.target.value,
                }))
              }
            />
          </FormField>

          <FormField label="Currency">
            <Input
              value="NPR"
              disabled
              className="cursor-not-allowed opacity-70"
            />
          </FormField>

          <FormField label="Default low-stock threshold">
            <Input
              type="number"
              min="0"
              value={String(activeSettings.lowStockThreshold)}
              onChange={(e) =>
                setSettingsDraft((current) => ({
                  ...(current ?? activeSettings),
                  lowStockThreshold: Number(e.target.value || 0),
                }))
              }
            />
          </FormField>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Accepted payment methods</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {PAYMENT_METHOD_OPTIONS.map((option) => {
                const checked = activeSettings.acceptedPaymentMethods.includes(
                  option.value,
                );
                return (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 rounded-[18px] border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSettingsDraft((current) => {
                          const base = current ?? activeSettings;
                          return {
                            ...base,
                            acceptedPaymentMethods: e.target.checked
                              ? [...base.acceptedPaymentMethods, option.value]
                              : base.acceptedPaymentMethods.filter(
                                  (method) => method !== option.value,
                                ),
                          };
                        })
                      }
                      className="h-4 w-4 rounded border-border bg-background"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => settingsMutation.mutate(activeSettings)}
            disabled={
              settingsMutation.isPending ||
              !activeSettings.acceptedPaymentMethods.length
            }
          >
            {settingsMutation.isPending
              ? "Saving settings..."
              : "Save settings"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[30px]">
        <CardHeader>
          <CardTitle>Workflow principles</CardTitle>
          <CardDescription>
            These rules keep the admin system clean as the business scales.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            "Use inventory stock-in for repeat stock of the same design instead of creating another product.",
            "Only create a new product when the design is actually different.",
            "Add a new variant when the product is the same but a new size or color appears.",
            "Cancelled and returned orders can now reverse stock so lifecycle handling is safer.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-[22px] border border-border/70 bg-background/70 p-4 text-sm leading-7 text-muted-foreground"
            >
              {item}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[30px] xl:col-span-2">
        <CardHeader>
          <CardTitle>Storefront content</CardTitle>
          <CardDescription>
            All customer-facing static content — the single place to edit About,
            social links, policies, and SEO.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* 1. About page */}
          <div className="space-y-4">
            <p className="text-sm font-semibold">About page</p>
            <FormField label="About headline">
              <Input
                value={activeSettings.aboutHeadline ?? ""}
                onChange={(e) =>
                  setSettingsDraft((current) => ({
                    ...(current ?? activeSettings),
                    aboutHeadline: e.target.value,
                  }))
                }
              />
            </FormField>
            <FormField label="About body text">
              <Textarea
                value={activeSettings.aboutBody ?? ""}
                onChange={(e) =>
                  setSettingsDraft((current) => ({
                    ...(current ?? activeSettings),
                    aboutBody: e.target.value,
                  }))
                }
                rows={6}
              />
            </FormField>
            <FormField label="About image URL">
              <Input
                value={activeSettings.aboutImageUrl ?? ""}
                onChange={(e) =>
                  setSettingsDraft((current) => ({
                    ...(current ?? activeSettings),
                    aboutImageUrl: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Cloudinary or direct URL
              </p>
            </FormField>
          </div>

          {/* 2. Social + contact */}
          <div className="space-y-4 border-t border-border/50 pt-6">
            <p className="text-sm font-semibold">Social + contact</p>
            <FormField label="Instagram handle">
              <Input
                value={activeSettings.instagramHandle ?? ""}
                onChange={(e) =>
                  setSettingsDraft((current) => ({
                    ...(current ?? activeSettings),
                    instagramHandle: e.target.value,
                  }))
                }
                placeholder="@rychstudio"
              />
            </FormField>
            <FormField label="TikTok handle">
              <Input
                value={activeSettings.tiktokHandle ?? ""}
                onChange={(e) =>
                  setSettingsDraft((current) => ({
                    ...(current ?? activeSettings),
                    tiktokHandle: e.target.value,
                  }))
                }
                placeholder="@rychstudio"
              />
            </FormField>
            <FormField label="WhatsApp number">
              <Input
                value={activeSettings.whatsappNumber ?? ""}
                onChange={(e) =>
                  setSettingsDraft((current) => ({
                    ...(current ?? activeSettings),
                    whatsappNumber: e.target.value,
                  }))
                }
                placeholder="977-98XXXXXXXX"
              />
            </FormField>
          </div>

          {/* 3. Policies */}
          <div className="space-y-4 border-t border-border/50 pt-6">
            <p className="text-sm font-semibold">Policies</p>
            <p className="text-xs text-muted-foreground -mt-1">
              Plain text. Shown on the storefront as-is.
            </p>
            <FormField label="Shipping note">
              <Textarea
                value={activeSettings.shippingNote ?? ""}
                onChange={(e) =>
                  setSettingsDraft((current) => ({
                    ...(current ?? activeSettings),
                    shippingNote: e.target.value,
                  }))
                }
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Shown in checkout and PDP
              </p>
            </FormField>
            <FormField label="Return policy">
              <Textarea
                value={activeSettings.returnPolicy ?? ""}
                onChange={(e) =>
                  setSettingsDraft((current) => ({
                    ...(current ?? activeSettings),
                    returnPolicy: e.target.value,
                  }))
                }
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Shown in PDP accordion
              </p>
            </FormField>
          </div>

          {/* 4. SEO */}
          <div className="space-y-4 border-t border-border/50 pt-6">
            <p className="text-sm font-semibold">SEO</p>
            <FormField label="Site title">
              <div className="flex items-center gap-3">
                <Input
                  value={activeSettings.seoTitle ?? ""}
                  onChange={(e) =>
                    setSettingsDraft((current) => ({
                      ...(current ?? activeSettings),
                      seoTitle: e.target.value,
                    }))
                  }
                  className="flex-1"
                />
                <span
                  className={`shrink-0 text-xs ${seoTitleLen > 60 ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {seoTitleLen} / 60
                </span>
              </div>
            </FormField>
            <FormField label="Meta description">
              <div className="flex items-start gap-3">
                <Textarea
                  value={activeSettings.seoDescription ?? ""}
                  onChange={(e) =>
                    setSettingsDraft((current) => ({
                      ...(current ?? activeSettings),
                      seoDescription: e.target.value,
                    }))
                  }
                  rows={2}
                  className="flex-1"
                />
                <span
                  className={`mt-2 shrink-0 text-xs ${seoDescLen > 160 ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {seoDescLen} / 160
                </span>
              </div>
            </FormField>
          </div>

          <Button
            className="w-full"
            onClick={() => storefrontMutation.mutate(activeSettings)}
            disabled={storefrontMutation.isPending}
          >
            {storefrontSaved
              ? "Saved"
              : storefrontMutation.isPending
                ? "Saving..."
                : "Save storefront content"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[30px] xl:col-span-2">
        <CardHeader>
          <CardTitle>Size guide</CardTitle>
          <CardDescription>
            Add size guide content for each product category.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs text-muted-foreground">
            Use plain text. Each size on a new line. e.g: S: 36cm chest
          </p>

          {categoriesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading categories...
            </p>
          ) : categoriesQuery.data?.items ? (
            <div className="space-y-4">
              {categoriesQuery.data.items.map((category: Category) => (
                <FormField key={category.slug} label={category.name}>
                  <Textarea
                    value={activeSizeGuide[category.slug] ?? ""}
                    onChange={(e) =>
                      setSizeGuideDraft((current) => ({
                        ...(current ?? activeSizeGuide),
                        [category.slug]: e.target.value,
                      }))
                    }
                    placeholder={`Size guide for ${category.name}`}
                    rows={4}
                  />
                </FormField>
              ))}
            </div>
          ) : null}

          <Button
            className="w-full"
            onClick={() => sizeGuideMutation.mutate(activeSizeGuide)}
            disabled={sizeGuideMutation.isPending}
          >
            {sizeGuideSaved
              ? "Saved"
              : sizeGuideMutation.isPending
                ? "Saving..."
                : "Save size guides"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
