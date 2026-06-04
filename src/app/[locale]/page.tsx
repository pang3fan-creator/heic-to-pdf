import { getTranslations } from "next-intl/server";
import Navbar from "@/components/Navbar";
import ConversionContainer from "@/components/ConversionContainer";
import HeroSection from "@/components/HeroSection";
import HowToSection from "@/components/HowToSection";
import AboutSection from "@/components/AboutSection";
import GuideSection from "@/components/GuideSection";
import FaqSection from "@/components/FaqSection";
import Footer from "@/components/Footer";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const faqT = await getTranslations({ locale, namespace: "faq" });
  const howtoT = await getTranslations({ locale, namespace: "howto" });
  const heroT = await getTranslations({ locale, namespace: "hero" });
  const faqItems = faqT.raw("items") as Array<{ q: string; a: string }>;
  const howtoSteps = howtoT.raw("steps") as Array<{ num: number; title: string; desc: string }>;
  const schemaDescription = heroT("schemaDescription");
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://heicpdf.to",
        name: "HEICPDF.TO - HEIC to PDF Converter",
        url: "https://heicpdf.to",
        description: schemaDescription,
        image: {
          "@type": "ImageObject",
          url: "https://heicpdf.to/og-image.png",
          width: 1200,
          height: 630,
        },
        operatingSystem: ["iOS", "MacOS", "Android", "Windows", "Web Browser"],
        applicationCategory: ["Multimedia", "Utilities"],
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: heroT.raw("features") as string[],
        inLanguage: locale,
      },
      {
        "@type": "HowTo",
        name: howtoT("title"),
        description: howtoT("description"),
        step: howtoSteps.map((step) => ({
          "@type": "HowToStep",
          position: step.num,
          name: step.title,
          text: step.desc,
        })),
        inLanguage: locale,
      },
      {
        "@type": "FAQPage",
        "@id": "https://heicpdf.to/#faq",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
        inLanguage: locale,
      },
    ],
  };

  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main>
        <HeroSection>
          <ConversionContainer />
        </HeroSection>
        <HowToSection />
        <AboutSection />
        <GuideSection />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
