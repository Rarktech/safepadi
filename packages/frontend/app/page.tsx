import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/home/Hero";
import { BrandSlider } from "@/components/home/BrandSlider";
import { StorySection } from "@/components/home/StorySection";
import { TrustSection } from "@/components/home/TrustSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { FeaturesBento } from "@/components/home/FeaturesBento";
import { UseCasesSection } from "@/components/home/UseCasesSection";
import { ReviewSection } from "@/components/home/ReviewSection";
import { Testimonials } from "@/components/home/Testimonials";
import { FaqSection } from "@/components/home/Faq";
import { InstantBlock } from "@/components/home/InstantBlock";
import { CtaSection } from "@/components/home/CtaSection";
import { Footer } from "@/components/home/Footer";

export default function Home() {
  return (
    <main style={{ width: "100%", background: "#ffffff", overflowX: "clip" }}>
      <Navbar />
      <Hero />
      <BrandSlider />
      <StorySection />
      <TrustSection />
      <HowItWorks />
      <FeaturesBento />
      <UseCasesSection />
      <ReviewSection />
      <Testimonials />
      <FaqSection />
      <InstantBlock />
      <CtaSection />
      <Footer />
    </main>
  );
}
