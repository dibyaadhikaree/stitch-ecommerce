"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import IntroScreen from "@/components/home/IntroScreen";
import HeroSection from "@/components/home/HeroSection";
import ProductScrollSection from "@/components/home/ProductScrollSection";
import CollectionsStrip from "@/components/home/CollectionsStrip";
import { getHomepage } from "@/lib/api";

export default function Home() {
  const [introComplete, setIntroComplete] = useState(
    () =>
      typeof window !== "undefined" &&
      !!sessionStorage.getItem("rych-intro-done"),
  );

  const { data: homepage } = useQuery({
    queryKey: ["homepage"],
    queryFn: getHomepage,
  });

  const data = homepage;

  const firstSlide = data?.heroSlides?.[0];

  return (
    <>
      <AnimatePresence>
        {!introComplete && (
          <IntroScreen key="intro" onComplete={() => setIntroComplete(true)} />
        )}
      </AnimatePresence>

      <HeroSection
        introComplete={introComplete}
        nextSectionId="product-scroll-section"
        heroSlide={firstSlide}
      />
      <ProductScrollSection
        id="product-scroll-section"
        products={data?.featuredProducts ?? []}
      />
      <CollectionsStrip />
    </>
  );
}
