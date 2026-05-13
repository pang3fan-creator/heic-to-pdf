import { getTranslations } from "next-intl/server";
import Navbar from "@/components/Navbar";
import ConversionContainer from "@/components/ConversionContainer";
import HeroSection from "@/components/HeroSection";
import HowToSection from "@/components/HowToSection";
import AboutSection from "@/components/AboutSection";
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
  const faqItems = faqT.raw("items") as Array<{ q: string; a: string }>;
  const howtoSteps = howtoT.raw("steps") as Array<{ num: number; title: string; desc: string }>;
  const schemaDescription =
    "Easily convert your Apple HEIC photos to high-quality PDF documents. No registration required. Supports batch, Dropbox & Google Drive. 100% privacy guaranteed.";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://heicpdf.to",
        name: "HEICPDF.TO - HEIC to PDF Converter",
        url: "https://heicpdf.to",
        description: schemaDescription,
        operatingSystem: "All",
        applicationCategory: ["Multimedia", "Utilities"],
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "Convert HEIC to PDF",
          "Batch conversion up to 20 images",
          "Dropbox & Google Drive support",
          "Page arrangement and customization",
          "100% browser-based processing",
        ],
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
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
