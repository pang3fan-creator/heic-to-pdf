import Navbar from "@/components/Navbar";
import ConversionContainer from "@/components/ConversionContainer";
import HeroSection from "@/components/HeroSection";
import HowToSection from "@/components/HowToSection";
import AboutSection from "@/components/AboutSection";
import FaqSection from "@/components/FaqSection";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection>
          <ConversionContainer />
        </HeroSection>
        <HowToSection />
        <AboutSection />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
