"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/api";

const SHOP_LINKS = [
  { label: "Shop All", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "Tops", href: "/shop?category=tops" },
  { label: "Bottoms", href: "/shop?category=bottoms" },
];

const STITCH_LINKS = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p
        className="text-smoke mb-4"
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </p>
      <div className="flex flex-col gap-3">
        {links.map((l) => (
          <Link
            key={l.href + l.label}
            href={l.href}
            className="text-ash hover:text-parchment transition-colors duration-200"
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Footer() {
  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: getSettings,
    staleTime: 300000,
  });

  const followLinks: { label: string; href: string }[] = [];
  if (settings?.instagramHandle) {
    followLinks.push({
      label: "Instagram →",
      href: `https://instagram.com/${settings.instagramHandle.replace("@", "")}`,
    });
  }
  if (settings?.tiktokHandle) {
    followLinks.push({
      label: "TikTok →",
      href: `https://tiktok.com/@${settings.tiktokHandle.replace("@", "")}`,
    });
  }
  if (settings?.whatsappNumber) {
    followLinks.push({
      label: "WhatsApp →",
      href: `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`,
    });
  }

  const footerTagline = settings?.footerTagline ?? "";

  return (
    <footer
      style={{
        background: "var(--stitch-surface)",
        borderTop: "0.5px solid var(--stitch-border)",
      }}
    >
      <div className="px-6 md:px-10 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        <FooterColumn title="Shop" links={SHOP_LINKS} />
        <FooterColumn title="STITCH" links={STITCH_LINKS} />
        {followLinks.length > 0 && (
          <FooterColumn title="Follow" links={followLinks} />
        )}
      </div>

      {footerTagline && (
        <div
          style={{
            textAlign: "center",
            fontFamily: "var(--stitch-font-sans)",
            fontSize: 11,
            color: "var(--stitch-smoke)",
            letterSpacing: "0.08em",
            paddingBottom: 16,
          }}
        >
          {footerTagline}
        </div>
      )}

      {/* Bottom strip */}
      <div
        className="px-6 md:px-10 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
        style={{ borderTop: "0.5px solid var(--stitch-border)" }}
      >
        <span
          className="text-ash"
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          STITCH Studio
        </span>
        <span
          className="text-smoke"
          style={{ fontSize: 10, letterSpacing: "0.06em" }}
        >
          eSewa · Khalti · COD · Bank Transfer
        </span>
      </div>
    </footer>
  );
}
