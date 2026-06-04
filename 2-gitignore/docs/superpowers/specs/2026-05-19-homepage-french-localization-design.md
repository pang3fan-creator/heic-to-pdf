# 首页法语本地化方案

## 背景

法语首页目前除导航栏和页脚外，全部内容显示英文。需要通过**本地化重写**（而非逐字翻译）将首页核心内容用法语重新创作。

## 范围

本次覆盖 **6 个命名空间**（`blog` 暂不处理）：

| 命名空间 | 内容 | 策略 |
|---------|------|------|
| `hero` | 标题、5 功能点、上传区文案 | 简洁法语营销标题，"HEIC en PDF" 关键词 |
| `editor` | 编辑器 UI、排序、设置、完成状态 | 动词式短文案，如 "Convertir en PDF" |
| `converter` | 进度提示、错误信息 | 简短法语提示 |
| `howto` | 标题、描述、4 步骤 | 英文为提纲，法语重写步骤描述 |
| `about` | 说明、4 段理由、表格 | 自然法语长文，保留营销调性 |
| `faq` | 标题、描述、6 条问答 | 法语常见问答，关键词融入 |

## 实施方式

- 保留英文 `en.json` 的键结构不变
- 修改 `messages/fr.json`，为 6 个命名空间添加法语内容
- 不修改任何组件代码（组件已从翻译文件读取内容）
- 结构化数据（WebApplication/HowTo/FAQPage）因已绑定翻译，随内容自动法语化

## 关键词规范

- **"HEIC to PDF"** → **"HEIC en PDF"**（法语关键词，月搜索 8100）
- **"batch conversion"** → **"conversion par lot"**
- 保留专有名词：HEICPDF.TO, WebAssembly, libheif, pdf-lib, Dropbox, Google Drive

## 涉及文件

| 文件 | 操作 |
|------|------|
| `messages/fr.json` | 添加 hero / editor / converter / howto / about / faq 命名空间 |

**不涉及修改：** 任何组件代码（`page.tsx`、`HeroSection.tsx` 等）

## 验证方式

1. `npm run build` — 构建通过
2. 浏览器测试 `/fr/` 首页：
   - Hero 标题、功能点、上传区为法语
   - 编辑器 UI 为法语
   - 4 步骤指南为法语
   - About 部分 4 段理由为法语
   - FAQ 6 条为法语（含 "HEIC en PDF"）
   - 结构化数据 `inLanguage: "fr"`，内容为法语
3. 浏览器测试 `/`（英文版不受影响）
