import StoreHeader from "@/components/store/StoreHeader";
import HeroBanner from "@/components/store/HeroBanner";
import CategoriesSection from "@/components/store/CategoriesSection";
import FeaturedProducts from "@/components/store/FeaturedProducts";
import BenefitsSection from "@/components/store/BenefitsSection";
import TestimonialsSection from "@/components/store/TestimonialsSection";
import TrustSection from "@/components/store/TrustSection";
import FAQSection from "@/components/store/FAQSection";
import NewsletterSection from "@/components/store/NewsletterSection";
import StoreFooter from "@/components/store/StoreFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <HeroBanner />
      <CategoriesSection />
      <FeaturedProducts />
      <BenefitsSection />
      <TrustSection />
      <TestimonialsSection />
      <FAQSection />
      <NewsletterSection />
      <StoreFooter />
    </div>
  );
};

export default Index;
