import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/home/Hero";
import { BrandSlider } from "@/components/home/BrandSlider";
import { TrustSection } from "@/components/home/TrustSection";
import { FeaturesBento } from "@/components/home/FeaturesBento";
import { HowItWorks } from "@/components/home/HowItWorks";
import { FaqSection } from "@/components/home/Faq";
import { CtaSection } from "@/components/home/CtaSection";
import { Footer } from "@/components/home/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <BrandSlider />
      <TrustSection />
      <FeaturesBento />
      <HowItWorks />
      <FaqSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
