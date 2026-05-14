"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { Search, ShoppingBag, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "@/lib/cart-store";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import SearchOverlay from "@/components/layout/SearchOverlay";
import { getHomepage, getCategories } from "@/lib/api";

const MOBILE_NAV_LINKS = [
  { label: "SHOP", href: "/shop" },
  { label: "COLLECTIONS", href: "/collections" },
  { label: "ABOUT", href: "/about" },
  { label: "CONTACT", href: "/contact" },
];

export default function Navbar() {
  const [hidden, setHidden] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const lastScrollY = useRef(0);
  const { scrollY } = useScroll();
  const openCart = useCartStore((s) => s.openCart);
  const itemCount = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.quantity, 0),
  );
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();

  const { data: homepage } = useQuery({
    queryKey: ["homepage"],
    queryFn: getHomepage,
    staleTime: 60000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 120000,
  });
  const homepageData = (homepage as any)?.item ?? homepage;
  const announcement = homepageData?.announcementBar;

  const dur = (base: number) => (reduced ? 0 : base);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (
      announcement?.isActive === true &&
      announcement?.text &&
      !sessionStorage.getItem("rych-bar-dismissed")
    ) {
      setShowBar(true);
    }
  }, [announcement]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 80 && latest > lastScrollY.current) {
      setHidden(true);
    } else if (latest < lastScrollY.current) {
      setHidden(false);
    }
    lastScrollY.current = latest;
  });

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--rych-navbar-offset",
      hidden ? "0px" : "60px",
    );

    return () => {
      document.documentElement.style.setProperty(
        "--rych-navbar-offset",
        "60px",
      );
    };
  }, [hidden]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const dismissBar = () => {
    sessionStorage.setItem("rych-bar-dismissed", "1");
    setShowBar(false);
  };

  const handleCartClick = () => {
    if (isMenuOpen) setIsMenuOpen(false);
    openCart();
  };

  const handleMobileNav = (href: string) => {
    setIsMenuOpen(false);
    setTimeout(() => router.push(href), 200);
  };

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: hidden ? "-100%" : "0%" }}
        transition={{
          opacity: { duration: 0.6, ease: "easeOut" },
          y: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
        }}
        onMouseLeave={() => setShowDropdown(false)}
      >
        {/* Announcement bar */}
        <AnimatePresence>
          {showBar && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 36, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center px-8 overflow-hidden"
              style={{ background: "var(--rych-surface)" }}
            >
              <span
                style={{
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--rych-ash)",
                }}
              >
                {announcement?.link ? (
                  <Link
                    href={announcement.link}
                    className="transition-colors duration-200 hover:text-parchment"
                  >
                    {announcement.text}
                  </Link>
                ) : (
                  announcement?.text
                )}
              </span>
              <button
                onClick={dismissBar}
                aria-label="Dismiss announcement"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-smoke hover:text-ash transition-colors duration-200"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main nav bar */}
        <div
          className="h-[60px] flex items-center justify-between px-6 md:px-10"
          style={{
            background: "rgba(17,17,17,0.95)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderBottom: "0.5px solid var(--rych-border)",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            className="font-display"
            style={{
              fontSize: 18,
              letterSpacing: "0.18em",
              color: "var(--rych-parchment)",
            }}
          >
            STITCH
          </Link>

          {/* Nav links — desktop only */}
          <nav className="hidden md:flex items-center gap-8">
            <div onMouseEnter={() => setShowDropdown(true)}>
              <NavLink href="/shop" label="SHOP" />
            </div>
            <NavLink href="/collections" label="COLLECTIONS" />
            <NavLink href="/about" label="ABOUT" />
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-5">
            <button
              aria-label="Search"
              onClick={() => setIsSearchOpen(true)}
              className="text-ash hover:text-parchment transition-colors duration-200"
            >
              <Search size={20} />
            </button>

            {/* Hamburger — mobile only */}
            <button
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setIsMenuOpen((v) => !v)}
              className="md:hidden relative flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  width: 18,
                  height: 1,
                  background: "var(--rych-parchment)",
                  transform: isMenuOpen
                    ? "translateY(0px) rotate(45deg)"
                    : "translateY(-4px)",
                  transition: "transform 200ms var(--rych-ease)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  width: 18,
                  height: 1,
                  background: "var(--rych-parchment)",
                  transform: isMenuOpen
                    ? "translateY(0px) rotate(-45deg)"
                    : "translateY(4px)",
                  transition: "transform 200ms var(--rych-ease)",
                }}
              />
            </button>

            <button
              onClick={handleCartClick}
              aria-label="Open cart"
              className="relative text-ash hover:text-parchment transition-colors duration-200"
            >
              <ShoppingBag size={20} />
              {mounted && itemCount > 0 && (
                <span
                  className="absolute -top-[6px] -right-[6px] w-4 h-4 rounded-full flex items-center justify-center"
                  style={{
                    background: "var(--rych-parchment)",
                    color: "var(--rych-bg)",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Shop dropdown */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute left-0 right-0"
              style={{
                background: "var(--rych-surface)",
                borderLeft: "0.5px solid var(--rych-border)",
                borderRight: "0.5px solid var(--rych-border)",
                borderBottom: "0.5px solid var(--rych-border)",
              }}
            >
              <div className="px-10 py-6">
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <CategoryTile
                        key={cat._id}
                        href={`/shop?category=${cat.slug}`}
                        label={cat.name.toUpperCase()}
                        count={cat.productCount}
                        onClick={() => setShowDropdown(false)}
                      />
                    ))
                  ) : (
                    <CategoryTile
                      key="all"
                      href="/shop"
                      label="All products"
                      count={0}
                      onClick={() => setShowDropdown(false)}
                      muted
                    />
                  )}
                </div>
                <Link
                  href="/shop"
                  onClick={() => setShowDropdown(false)}
                  className="inline-block text-ash hover:text-parchment transition-colors duration-200"
                  style={{
                    fontSize: 13,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Browse all →
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Mobile fullscreen menu overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { duration: dur(0.35), ease: [0.25, 0.1, 0.25, 1] },
            }}
            exit={{
              opacity: 0,
              transition: { duration: dur(0.25), ease: [0.25, 0.1, 0.25, 1] },
            }}
            className="md:hidden fixed flex flex-col"
            style={{
              top: 0,
              left: 0,
              width: "100vw",
              height: "100dvh",
              background: "var(--rych-bg)",
              zIndex: 60,
            }}
          >
            {/* Top row */}
            <div
              className="h-[60px] flex items-center justify-between px-6 flex-shrink-0"
              style={{ borderBottom: "0.5px solid var(--rych-border)" }}
            >
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className="font-display"
                style={{
                  fontSize: 18,
                  letterSpacing: "0.18em",
                  color: "var(--rych-parchment)",
                }}
              >
                STITCH
              </Link>
              <button
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
                className="text-ash hover:text-parchment transition-colors duration-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 flex flex-col justify-center px-6 gap-3">
              {MOBILE_NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: dur(0.4),
                    delay: reduced ? 0 : 0.15 + i * 0.06,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  <button
                    onClick={() => handleMobileNav(link.href)}
                    className="font-display block text-left"
                    style={{
                      fontSize: "clamp(32px, 8vw, 48px)",
                      fontWeight: 300,
                      color: "var(--rych-parchment)",
                      letterSpacing: "-0.01em",
                      textDecoration: "none",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {link.label}
                  </button>
                </motion.div>
              ))}
            </nav>

            {/* Social links */}
            <div className="flex items-center gap-6 px-6 pb-10 flex-shrink-0">
              <Link
                href="#"
                className="font-sans"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--rych-ash)",
                  textDecoration: "none",
                }}
              >
                INSTAGRAM
              </Link>
              <Link
                href="#"
                className="font-sans"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--rych-ash)",
                  textDecoration: "none",
                }}
              >
                TIKTOK
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function NavLink({ href, label }: { href: string; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      className="relative inline-block"
      style={{
        fontSize: 13,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: hovered ? "var(--rych-parchment)" : "var(--rych-ash)",
        transition: "color 0.2s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
      <motion.span
        className="absolute left-0 bottom-[-2px] h-px w-full block origin-left"
        style={{ background: "var(--rych-parchment)" }}
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      />
    </Link>
  );
}

function CategoryTile({
  href,
  label,
  count,
  onClick,
  muted = false,
}: {
  href: string;
  label: string;
  count: number;
  onClick: () => void;
  muted?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block p-4 transition-colors duration-200"
      style={{
        background: hovered ? "var(--rych-border)" : "var(--rych-lift)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className="block"
        style={{
          fontSize: 13,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: muted ? "var(--rych-ash)" : "var(--rych-parchment)",
        }}
      >
        {label}
      </span>
      {count > 0 && (
        <span
          className="block mt-1"
          style={{ fontSize: 12, color: "var(--rych-smoke)" }}
        >
          {count} items
        </span>
      )}
    </Link>
  );
}
