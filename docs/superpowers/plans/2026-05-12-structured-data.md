# 首页结构化数据 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在首页注入 WebApplication + HowTo + FAQPage 三种 JSON-LD 结构化数据

**Architecture:** 在 `[locale]/layout.tsx` 的服务端组件中，通过 `getTranslations` 获取 FAQ 和 HowTo 的翻译文本，组装成一个包含 `@graph` 的 JSON-LD 对象，序列化后以 `<script type="application/ld+json">` 注入到 `<head>` 中。

**Tech Stack:** Next.js (server component), next-intl (`getTranslations`), JSON-LD (Schema.org)

---

### Task 1: 修改布局文件注入 JSON-LD

**Files:**
- Modify: `src/app/[locale]/layout.tsx`

**改动说明：**
- 恢复 `getTranslations` 导入（之前被移除）
- 在 layout 组件中获取 faq 和 howto 命名空间的翻译
- 组装 JSON-LD 对象并注入到 `<head>` 中

- [ ] **Step 1: 恢复 `getTranslations` 导入并添加新导入**

在 `src/app/[locale]/layout.tsx` 中将导入行改为：

```tsx
import { getMessages, getTranslations } from "next-intl/server";
```

- [ ] **Step 2: 在 layout 组件中获取翻译数据并构建 JSON-LD**

在 `const messages = await getMessages();` 之后，添加：

```tsx
const faqT = await getTranslations({ locale, namespace: "faq" });
const howtoT = await getTranslations({ locale, namespace: "howto" });

const faqItems = faqT.raw("items") as Array<{ q: string; a: string }>;
const howtoSteps = howtoT.raw("steps") as Array<{ num: number; title: string; desc: string }>;

const description =
  "Easily convert your Apple HEIC photos to high-quality PDF documents. No registration required. Supports batch, Dropbox & Google Drive. 100% privacy guaranteed.";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://heicpdf.to",
      name: "HEICPDF.TO - HEIC to PDF Converter",
      url: "https://heicpdf.to",
      description,
      operatingSystem: "All",
      applicationCategory: ["Multimedia", "Utilities"],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
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
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
      inLanguage: locale,
    },
  ],
};
```

- [ ] **Step 3: 在 `<head>` 中注入 JSON-LD script 标签**

在现有的 themeScript `<script>` 标签之后添加：

```tsx
<head>
  <script dangerouslySetInnerHTML={{ __html: themeScript }} />
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
  />
</head>
```

- [ ] **Step 4: 验证构建**

运行 `npm run build`，确保无 TS 错误和构建错误。

- [ ] **Step 5: 提交**

```bash
git add src/app/\[locale\]/layout.tsx
git commit -m "feat: add structured data (WebApplication + HowTo + FAQPage) to homepage"
```

### 验证方法

1. `npm run dev` 启动
2. 打开浏览器，查看页面源代码（`查看源代码`）
3. 搜索 `application/ld+json`，确认 script 标签存在
4. 将 JSON-LD 内容粘贴到 [Google Rich Results Test](https://search.google.com/test/rich-results) 验证
5. 确认三个 Schema 类型都正确解析：WebApplication、HowTo、FAQPage
