import { createBlogArticlePage } from "@/components/blog/createBlogArticlePage";

const page = createBlogArticlePage({
  namespace: "blog.heicToPdfIphone",
  blogPath: "/blog/heic-to-pdf-iphone",
  ogImageUrl: "https://heicpdf.to/images/blog/heic-to-pdf-iphone-og.png",
  ogImageWidth: 1200,
  ogImageHeight: 630,
});

export const generateMetadata = page.generateMetadata;
export default page.BlogArticlePage;
