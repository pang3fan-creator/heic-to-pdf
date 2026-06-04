# 首页结构化数据设计方案

## 方式：在布局中注入 JSON-LD `<script>` 标签

在 `src/app/[locale]/layout.tsx` 中新增一个 `<script type="application/ld+json">` 标签，内容通过 `@graph` 组织三种 Schema。

## 三种 Schema 设计

### 1. WebApplication（工具本体）

```json
{
  "@type": "WebApplication",
  "@id": "https://heicpdf.to",
  "name": "HEICPDF.TO - HEIC to PDF Converter",
  "url": "https://heicpdf.to",
  "description": "Easily convert your Apple HEIC photos to high-quality PDF documents...",
  "operatingSystem": "All",
  "applicationCategory": ["Multimedia", "Utilities"],
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "featureList": ["Convert HEIC to PDF", "Batch conversion up to 20 images", "Dropbox & Google Drive support", "Page customization", "100% browser-based processing"],
  "inLanguage": "en"
}
```

### 2. HowTo（四个步骤）

```json
{
  "@type": "HowTo",
  "name": "How to convert HEIC to PDF",
  "description": "Four simple steps to convert your HEIC photos to PDF",
  "step": [
    { "@type": "HowToStep", "position": 1, "name": "Select photos", "text": "..." },
    { "@type": "HowToStep", "position": 2, "name": "Arrange & customize", "text": "..." },
    { "@type": "HowToStep", "position": 3, "name": "Export PDF", "text": "..." },
    { "@type": "HowToStep", "position": 4, "name": "Done", "text": "..." }
  ],
  "inLanguage": "en"
}
```

### 3. FAQPage（常见问题）

```json
{
  "@type": "FAQPage",
  "@id": "https://heicpdf.to/#faq",
  "mainEntity": [
    { "@type": "Question", "name": "...", "acceptedAnswer": { "@type": "Answer", "text": "..." } }
  ],
  "inLanguage": "en"
}
```

## 文本来源

FAQ 和 HowTo 的文本从翻译文件（`messages/en.json`）动态获取，使用 `getTranslations` server-side 读取后组装 JSON-LD，再通过 `<script dangerouslySetInnerHTML>` 注入布局的 `<head>` 中。

## 涉及文件

- `src/app/[locale]/layout.tsx` — 新增 script 标签

## 下一步

确认设计没问题后，我会制定实现计划。
