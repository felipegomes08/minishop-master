import { useEffect } from "react";
import { initPixel, trackPageView } from "@/lib/fbPixel";
import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSolutionSection from "@/components/landing/ProblemSolutionSection";
import VirtualTryOnSection from "@/components/landing/VirtualTryOnSection";
import PhotoImporterSection from "@/components/landing/PhotoImporterSection";
import AIInsightsSection from "@/components/landing/AIInsightsSection";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import CatalogSection from "@/components/landing/CatalogSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <LandingHeader />
      <HeroSection />
      <ProblemSolutionSection />
      <VirtualTryOnSection />
      <PhotoImporterSection />
      <AIInsightsSection />
      <FeaturesGrid />
      <CatalogSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <FinalCTASection />
      <LandingFooter />
    </div>
  );
}
