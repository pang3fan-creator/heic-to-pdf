import { createBlogArticlePage } from "@/components/blog/createBlogArticlePage";

const page = createBlogArticlePage({
  namespace: "blog.combineHeicToPdf",
  blogPath: "/blog/combine-heic-to-pdf",
  ogImageUrl: "https://heicpdf.to/images/blog/combine-heic-to-pdf-og.png",
  ogImageWidth: 1200,
  ogImageHeight: 630,
});

export const generateMetadata = page.generateMetadata;
export default page.BlogArticlePage;
