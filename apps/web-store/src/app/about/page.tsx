"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { getSettings } from "@/lib/api";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const EASE = [0.76, 0, 0.24, 1] as const;
const EASE_STANDARD = [0.25, 0.1, 0.25, 1] as const;

export default function AboutPage() {
  const reduced = useReducedMotion();
  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: getSettings,
  });

  const aboutHeadline = settings?.aboutHeadline ?? "WE ARE STITCH WEARS";
  const aboutBody =
    settings?.aboutBody ?? "NEPAL'S AUTHENTIC AND PREMIUM BRAND";
  const aboutImageUrl = settings?.aboutImageUrl ?? "";
  const instagramHandle = settings?.instagramHandle ?? "stitchwears";
  const tiktokHandle = settings?.tiktokHandle ?? "";
  const whatsappNumber = settings?.whatsappNumber ?? "";

  const duration = (value: number) => (reduced ? 0 : value);

  // Social links to display
  const socialLinks: Array<{ label: string; href: string; handle: string }> =
    [];
  if (instagramHandle) {
    socialLinks.push({
      label: `@${instagramHandle}`,
      href: `https://instagram.com/${instagramHandle.replace(/^@/, "")}`,
      handle: instagramHandle,
    });
  }
  if (tiktokHandle) {
    socialLinks.push({
      label: `@${tiktokHandle}`,
      href: `https://tiktok.com/@${tiktokHandle.replace(/^@/, "")}`,
      handle: tiktokHandle,
    });
  }
  if (whatsappNumber) {
    socialLinks.push({
      label: "WHATSAPP",
      href: `https://wa.me/${whatsappNumber.replace(/[^\d+]/g, "")}`,
      handle: "whatsapp",
    });
  }

  return (
    <main style={{ background: "var(--stitch-bg)" }}>
      {/* Section 1 — Hero */}
      <section
        style={{ height: "100vh", position: "relative", overflow: "hidden" }}
      >
        {/* Background image with overlay */}
        {aboutImageUrl && (
          <Image
            src={aboutImageUrl}
            alt="About STITCH"
            fill
            className="object-cover"
            priority
          />
        )}
        {!aboutImageUrl && (
          <div
            style={{
              backgroundColor: "var(--stitch-lift)",
              width: "100%",
              height: "100%",
            }}
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, transparent 0%, var(--stitch-bg) 40%)",
          }}
        />

        {/* Centered text content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 60,
          }}
        >
          {/* Label */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: duration(0.4) }}
            style={{
              fontSize: 10,
              fontFamily: "var(--stitch-font-sans)",
              letterSpacing: "0.2em",
              color: "var(--stitch-ash)",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            ABOUT
          </motion.div>

          {/* Headline with clip-path reveal */}
          {aboutHeadline && (
            <motion.h1
              initial={{
                clipPath: "inset(100% 0 0 0)",
              }}
              animate={{
                clipPath: "inset(0% 0 0 0)",
              }}
              transition={{
                duration: duration(0.9),
                ease: EASE,
              }}
              style={{
                fontFamily: "var(--stitch-font-display)",
                fontWeight: 300,
                fontSize: "clamp(40px, 6vw, 80px)",
                color: "var(--stitch-parchment)",
                textAlign: "center",
                maxWidth: 700,
                lineHeight: 1.05,
                marginBottom: 0,
              }}
            >
              {aboutHeadline}
            </motion.h1>
          )}
        </div>
      </section>

      {/* Section 2 — Body text */}
      <section
        style={{
          maxWidth: 600,
          marginLeft: "auto",
          marginRight: "auto",
          padding: "80px 24px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            duration: duration(0.6),
            ease: EASE_STANDARD,
          }}
          viewport={{ amount: 0.3, once: true }}
          style={{
            fontFamily: "var(--stitch-font-sans)",
            fontSize: 15,
            lineHeight: 1.9,
            color: "var(--stitch-ash)",
            whiteSpace: "pre-line",
          }}
        >
          {aboutBody}
        </motion.div>
      </section>

      {/* Section 3 — Follow strip */}
      {socialLinks.length > 0 && (
        <section
          style={{
            width: "100%",
            borderTop: "0.5px solid var(--stitch-border)",
            padding: "48px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 40,
              flexWrap: "wrap",
            }}
          >
            {socialLinks.map((link) => (
              <Link
                key={link.handle}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "var(--stitch-font-sans)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--stitch-ash)",
                  textDecoration: "none",
                  transition: "color 200ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--stitch-parchment)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--stitch-ash)";
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
