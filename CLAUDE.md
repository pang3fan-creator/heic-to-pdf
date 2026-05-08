# `Heic to PDF`

## 技术栈

- **框架**: Next.js (App Router)
- **国际化**: next-intl (en/es/fr...)
- **部署**: Vercel

## `Commands`

```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器 (http://localhost:3000)
npm run build        # 生产环境构建
npm run start        # 启动生产服务器
npm run lint         # 代码检查
npm run test         # 运行测试
npm run test:watch   # 监听模式运行测试
```

## 项目结构

```
src/
├── app/[locale]/page.tsx     # 主页面
├── components/
│   ├── ConversionContainer.tsx # 状态机调度（idle/editor/converting/complete）
│   ├── EditorOverlay.tsx      # 全屏编辑器（缩略图+排序+预览）
│   ├── PreviewModal.tsx       # 大图预览弹窗
│   ├── DropZone.tsx           # 首页拖拽上传区
│   ├── GlobalDropOverlay.tsx  # 全局拖拽覆盖层
│   └── HeroSection.tsx        # 首页主视觉
├── hooks/
│   ├── useHeicConversion.ts   # 核心状态机（解码/转换/下载）
│   └── __tests__/
├── lib/
│   ├── conversion-types.ts    # 类型定义 + 常量
│   ├── heic-worker.ts         # libheif Web Worker（HEIC→RGBA）
│   ├── pdf-generator.ts       # pdf-lib PDF 生成
│   ├── preview-renderer.ts    # Canvas PDF 页面预览渲染
│   └── __tests__/
└── types/libheif-js.d.ts     # libheif 类型声明
```

## 常见坑点

### next-intl 路由规则 (关键!)

- `/` → 英文首页，直接展示
- `/en` → 英文首页，重定向到 `/`
- 不要在 `[locale]` 目录下直接创建 `en/` 文件夹

- `usePathname()` 返回的路径包含语言前缀（如 `/es/about`），解析时需过滤
- 过滤语言段: `segments.filter((s, i) => i !== 0 || !SUPPORTED_LOCALES.includes(s))`

### 多语言 URL 拼接

```markdown
错误: /${locale}/path → 产生 /frpath
错误: /${locale === "en" ? "" : locale}/path → 产生 //path
正确: 使用 buildUrl(locale, "/path") 从 @/lib/url 导入
```

### HEIC 图片渲染 (关键!)

- HEIC 解码在 Web Worker 中完成，返回 `rgbaBuffer: Uint8Array`
- 缩略图：Worker → `ImageData` → `createImageBitmap` → Canvas `drawImage`
- 缩略图尺寸 300px max，预览尺寸 800px max，在 `useHeicConversion.ts` 中缩放
- Canvas 渲染需处理 `devicePixelRatio`：`canvas.width = displayW * dpr; ctx.scale(dpr, dpr)`
- **ImageBitmap 守卫**：rAF 回调中必须检查 `bitmapRef.current !== bitmap`，否则 `drawImage` 报 "image source is detached"
- 用两个 `useEffect` 分别响应文件数据和设置变化，bitmap 通过 `useRef` 缓存

### `.next` 缓存损坏

- 修改 Web Worker 或 pdf-lib 相关代码后，若出现 `MODULE_NOT_FOUND: vendor-chunks/pdf-lib.js`，需清除缓存
- 解决方案：`rm -rf .next/cache` 或 `rm -rf .next` 后重新 `npm run build`

### CSS 模式

- **毛玻璃**：`background: color-mix(in srgb, var(--surface) 60%, transparent); backdrop-filter: blur(20px)`
- **竖向 range slider**：`input[type=range] { writing-mode: vertical-lr; direction: rtl; }` 交换宽高语义
- **CSS tooltip**：`button[title]:hover::after { content: attr(title); position: absolute; left: 100%; ... }`
- 浮层面板使用 `position: absolute; top: 50%; transform: translateY(-50%)` 实现垂直居中

### 主题系统

- 使用 OKLCH 色彩空间，默认暗色模式，亮色模式通过 `[data-theme="light"]` 切换
- 主题变量在 `:root` 中定义，通过 JS 切换 `data-theme` 属性
- 核心变量：`--bg`、`--surface`、`--fg`、`--muted`、`--border`、`--accent`、`--accent-soft`

## SEO 规范

### 基础配置

- 每个路由使用 Metadata API 动态生成 TDK
- 结构化数据: WebApplication, FAQPage, HowTo

### JSON-LD Schema 规范

| 规范           | 说明                                              |
| -------------- | ------------------------------------------------- |
| Schema 类型    | 工具页面用 `WebApplication`，博客用 `BlogPosting` |
| 日期格式       | ISO 8601 含时区 (`2026-03-16T00:00:00+00:00`)     |
| 多语言支持     | Schema 文本从翻译文件获取，`inLanguage` 标识语言  |
| @graph 模式    | 多 Schema 用 `@graph` 组织，配合 `@id` 引用       |
| BreadcrumbList | 只包含实际存在的页面，不支持 `inLanguage` 属性    |
| SearchAction   | 仅当有实际搜索功能时添加                          |

### hreflang 规范

- 所有页面都应包含 x-default 指向默认语言版本
- 使用 `buildUrl(locale, "/path")` 生成 canonical/hreflang URL

### sitemap 维护

新增页面时需同步更新 `src/app/sitemap.ts` 的 `pages` 数组
