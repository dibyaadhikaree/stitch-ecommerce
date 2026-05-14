"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "@/lib/cart-store";
import { formatNPR } from "@/lib/utils";
import { placeOrder, validatePromoCode, getSettings } from "@/lib/api";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--stitch-surface)",
  border: "0.5px solid var(--stitch-border)",
  color: "var(--stitch-parchment)",
  borderRadius: 0,
  padding: "12px",
  fontSize: 13,
  outline: "none",
  fontFamily: "var(--stitch-font-sans)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--stitch-ash)",
  marginBottom: 6,
};

type SubmitState = "idle" | "loading" | "success";
type PromoState = "idle" | "checking" | "applied" | "error";

type AppliedPromo = {
  code: string;
  discount: number;
  finalTotal: number;
};

export default function CheckoutPage() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const items = useCartStore((s) => s.items);
  const cartTotal = useCartStore((s) => s.totalPrice());

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Kathmandu");
  const [note, setNote] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");

  // Promo state
  const [promoInput, setPromoInput] = useState("");
  const [promoState, setPromoState] = useState<PromoState>("idle");
  const [promoError, setPromoError] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);

  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: getSettings,
    staleTime: 300_000,
  });

  const dur = (base: number) => (reduced ? 0 : base);

  const sectionVariants = {
    hidden: { opacity: 0, y: reduced ? 0 : 24 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: dur(0.5), delay: dur(i * 0.1), ease: EASE },
    }),
  };

  async function handleApplyPromo() {
    const code = promoInput.trim();
    if (!code) return;
    setPromoError("");
    setPromoState("checking");
    try {
      const result = await validatePromoCode(code, cartTotal);
      setAppliedPromo({
        code: code.toUpperCase(),
        discount: result.discount,
        finalTotal: result.finalTotal,
      });
      setPromoState("applied");
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : "Invalid promo code");
      setPromoState("error");
    }
  }

  function handleRemovePromo() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoState("idle");
    setPromoError("");
  }

  async function handlePlaceOrder() {
    setError("");
    if (!name.trim()) {
      setError("Full name is required");
      return;
    }
    if (!phone.trim()) {
      setError("Phone number is required");
      return;
    }
    if (!address.trim()) {
      setError("Address is required");
      return;
    }
    if (!city.trim()) {
      setError("City is required");
      return;
    }
    if (items.length === 0) {
      setError("Your cart is empty");
      return;
    }

    setSubmitState("loading");
    try {
      const result = await placeOrder({
        customerName: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        note: note.trim() || undefined,
        promoCode: appliedPromo?.code,
        items,
      });
      sessionStorage.setItem("stitch-order-number", result.orderNumber);
      useCartStore.getState().clearCart();
      router.push("/checkout/confirmation");
    } catch (err) {
      setSubmitState("idle");
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  if (items.length === 0 && submitState === "idle") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--stitch-bg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--stitch-ash)",
          }}
        >
          Your cart is empty
        </p>
        <Link
          href="/shop"
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--stitch-parchment)",
            textDecoration: "none",
            borderBottom: "0.5px solid var(--stitch-parchment)",
            paddingBottom: 2,
          }}
        >
          BACK TO SHOP
        </Link>
      </div>
    );
  }

  const displayTotal = appliedPromo ? appliedPromo.finalTotal : cartTotal;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--stitch-bg)",
        padding: "80px 24px 80px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          gap: 48,
        }}
      >
        {/* Section 1 — Order summary */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <h2
            style={{
              fontFamily: "var(--stitch-font-display)",
              fontSize: "clamp(20px, 4vw, 28px)",
              fontWeight: 300,
              color: "var(--stitch-parchment)",
              marginBottom: 24,
              letterSpacing: "-0.01em",
            }}
          >
            Order Summary
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {items.map((item, idx) => (
              <div
                key={item.variantId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 0",
                  borderBottom:
                    idx < items.length - 1
                      ? "0.5px solid var(--stitch-border)"
                      : "none",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    background: "var(--stitch-lift)",
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 12,
                      letterSpacing: "0.04em",
                      color: "var(--stitch-parchment)",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.name}
                  </p>
                  <p
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--stitch-smoke)",
                      margin: "2px 0 0",
                    }}
                  >
                    {item.size} · qty {item.quantity}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.04em",
                    color: "var(--stitch-parchment)",
                    flexShrink: 0,
                  }}
                >
                  {formatNPR(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals block */}
          <div
            style={{
              paddingTop: 20,
              borderTop: "0.5px solid var(--stitch-border)",
              marginTop: 4,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* Subtotal row — always visible */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "baseline",
                gap: 16,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--stitch-ash)",
                }}
              >
                Subtotal
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: "var(--stitch-ash)",
                  letterSpacing: "0.02em",
                }}
              >
                {formatNPR(cartTotal)}
              </span>
            </div>

            {/* Discount row — animates in when promo applied */}
            <AnimatePresence>
              {appliedPromo && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "baseline",
                    gap: 16,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--stitch-ash)",
                    }}
                  >
                    Discount ({appliedPromo.code})
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--stitch-ash)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    – {formatNPR(appliedPromo.discount)}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Total row */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "baseline",
                gap: 16,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--stitch-ash)",
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontFamily: "var(--stitch-font-display)",
                  fontSize: "clamp(20px, 3vw, 26px)",
                  fontWeight: 300,
                  color: "var(--stitch-parchment)",
                  letterSpacing: "-0.01em",
                }}
              >
                {formatNPR(displayTotal)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Section 2 — Delivery details */}
        <motion.div
          custom={1}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <h2
            style={{
              fontFamily: "var(--stitch-font-display)",
              fontSize: "clamp(20px, 4vw, 28px)",
              fontWeight: 300,
              color: "var(--stitch-parchment)",
              marginBottom: 24,
              letterSpacing: "-0.01em",
            }}
          >
            Delivery Details
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98XXXXXXXX"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, area"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Delivery Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any instructions for delivery"
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
          </div>
        </motion.div>

        {/* Section 3 — Promo code */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          {/* Input + apply row */}
          <div style={{ display: "flex", gap: 0 }}>
            <input
              type="text"
              value={promoInput}
              onChange={(e) => {
                setPromoInput(e.target.value.toUpperCase());
                if (promoState === "error") {
                  setPromoError("");
                  setPromoState("idle");
                }
              }}
              disabled={promoState === "applied"}
              placeholder="Promo code"
              style={{
                ...inputStyle,
                flex: 1,
                opacity: promoState === "applied" ? 0.5 : 1,
              }}
            />
            <button
              type="button"
              onClick={promoState === "applied" ? undefined : handleApplyPromo}
              disabled={
                promoState === "checking" ||
                promoState === "applied" ||
                !promoInput.trim()
              }
              style={{
                background: "transparent",
                border: "0.5px solid var(--stitch-border2)",
                color: "var(--stitch-ash)",
                fontFamily: "var(--stitch-font-sans)",
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "0 16px",
                cursor:
                  promoState === "checking" ||
                  promoState === "applied" ||
                  !promoInput.trim()
                    ? "default"
                    : "pointer",
                opacity: !promoInput.trim() ? 0.4 : 1,
                transition: "opacity 0.2s",
                flexShrink: 0,
                borderLeft: "none",
              }}
            >
              {promoState === "checking" ? "..." : "APPLY"}
            </button>
          </div>

          {/* Applied badge */}
          <AnimatePresence>
            {promoState === "applied" && appliedPromo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
                style={{
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--stitch-ash)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {appliedPromo.code} — {formatNPR(appliedPromo.discount)} off
                </span>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--stitch-smoke)",
                    fontSize: 14,
                    lineHeight: 1,
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                  aria-label="Remove promo code"
                >
                  ×
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          {promoState === "error" && promoError && (
            <p
              style={{
                fontSize: 11,
                color: "var(--stitch-smoke)",
                marginTop: 8,
                letterSpacing: "0.04em",
              }}
            >
              {promoError}
            </p>
          )}
        </motion.div>

        {/* Section 4 — Place order */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          {storeSettings?.shippingNote && (
            <p
              style={{
                fontFamily: "var(--stitch-font-sans)",
                fontSize: 11,
                color: "var(--stitch-smoke)",
                fontStyle: "italic",
                marginBottom: 16,
              }}
            >
              {storeSettings.shippingNote}
            </p>
          )}

          <div
            onClick={submitState === "idle" ? handlePlaceOrder : undefined}
            style={{
              width: "100%",
              padding: "18px 0",
              background: "var(--stitch-linen)",
              color: "#111111",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "var(--stitch-font-sans)",
              textAlign: "center",
              cursor: submitState === "idle" ? "pointer" : "default",
              opacity: submitState === "loading" ? 0.5 : 1,
              transition: "opacity 0.2s",
              userSelect: "none",
            }}
          >
            {submitState === "loading"
              ? "PLACING ORDER..."
              : "PLACE ORDER — COD"}
          </div>

          {error && (
            <p
              style={{
                fontSize: 11,
                color: "var(--stitch-ash)",
                marginTop: 12,
                letterSpacing: "0.04em",
              }}
            >
              {error}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
