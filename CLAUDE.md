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
├── app/auth/                 # OAuth 回调页（非 locale 路由，需排除 middleware）
├── components/
│   ├── ConversionContainer.tsx # 状态机调度（idle/editor/converting/complete）
│   ├── EditorOverlay.tsx      # 全屏编辑器（缩略图+排序+预览）
│   ├── PreviewModal.tsx       # 大图预览弹窗
│   ├── DropZone.tsx           # 首页拖拽上传区
│   ├── GlobalDropOverlay.tsx  # 全局拖拽覆盖层
│   ├── HeroSection.tsx        # 首页主视觉
│   └── CompletePage.tsx       # 完成页面（手动下载 + Save to Dropbox）
├── hooks/
│   ├── useHeicConversion.ts   # 核心状态机（解码/转换/下载）
│   └── __tests__/
├── lib/
│   ├── conversion-types.ts    # 类型定义 + 常量
│   ├── heic-worker.ts         # libheif Web Worker（HEIC→RGBA）
│   ├── image-decoder.ts       # 统一图片解码层（HEIC→Worker, 其他→createImageBitmap）
│   ├── pdf-generator.ts       # pdf-lib PDF 生成
│   ├── preview-renderer.ts    # Canvas PDF 页面预览渲染
│   ├── zip-utils.ts           # JSZip 打包 + 冲突安全命名
│   ├── dropbox-utils.ts       # Dropbox Chooser（导入）
│   ├── dropbox-auth.ts        # PKCE OAuth + 直接上传 API
│   └── __tests__/
├── middleware.ts             # next-intl 路由中间件（matcher 排除 /auth/ 等）
└── types/libheif-js.d.ts     # libheif 类型声明
```

## 常见坑点

### next-intl 路由规则 (关键!)

- `/` → 英文首页，直接展示
- `/en` → 英文首页，重定向到 `/`
- 不要在 `[locale]` 目录下直接创建 `en/` 文件夹
- `usePathname()` 返回的路径包含语言前缀（如 `/es/about`），解析时需过滤
- 过滤语言段: `segments.filter((s, i) => i !== 0 || !SUPPORTED_LOCALES.includes(s))`
- **非 locale 路径**（如 `/auth/*`）需要在 `middleware.ts` 的 matcher 中显式排除，且需要自己的 layout（含 `<html>`/`<body>` 标签）

### 多语言 URL 拼接

```markdown
错误: /${locale}/path → 产生 /frpath
错误: /${locale === "en" ? "" : locale}/path → 产生 //path
正确: 使用 buildUrl(locale, "/path") 从 @/lib/url 导入
```

### 图片格式与解码

- 支持格式：`.heic/.heif`、`.jpg/.jpeg`、`.png`、`.webp`
- HEIC → libheif Web Worker 解码，返回 RGBA Uint8Array
- JPEG/PNG/WebP → 浏览器 `createImageBitmap` + Canvas 解码，返回同样 RGBA 格式
- 解码层统一入口在 `src/lib/image-decoder.ts`
- 缩略图尺寸 300px max，预览尺寸 800px max，在 `useHeicConversion.ts` 中缩放
- Canvas 渲染需处理 `devicePixelRatio`：`canvas.width = displayW * dpr; ctx.scale(dpr, dpr)`
- **ImageBitmap 守卫**：rAF 回调中必须检查 `bitmapRef.current !== bitmap`，否则 `drawImage` 报 "image source is detached"

### PDF 生成

- HEIC/WebP → Canvas 编码 PNG → `embedPng()`
- JPEG → 直接嵌入原始字节 → `embedJpg()`（无损，无需重编）
- PNG → 直接嵌入原始字节 → `embedPng()`（无损）
- 用 `pdf-lib` 库，纯浏览器端生成

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

### 全屏覆盖层滚动锁定

- EditorOverlay / CompletePage 等全屏 fixed 覆盖层打开时，需锁定 body 滚动
- `document.body.style.overflow = 'hidden'`
- 计算滚动条宽度 `window.innerWidth - document.documentElement.clientWidth`，补偿到 `paddingRight` 防止页面抖动
- useEffect cleanup 中恢复原始 overflow 和 paddingRight

### Dropbox 集成

- **环境变量**：`.env.local` 中配置 `NEXT_PUBLIC_DROPBOX_APP_KEY`
- **导入**：Dropbox Chooser API（`Dropbox.choose()`）直接返回 File 对象
- **导出**：Saver API 不支持 `blob:` URL，须用 PKCE OAuth + `/files/upload` 直接上传
- **OAuth 弹窗**：`window.open()` 而非页面跳转，避免丢失内存中的 PDF blob
- **弹窗通信**：回调页通过 `window.opener.postMessage()` 通知父窗口结果

### Split Button 下拉菜单

- 三个位置使用：DropZone（Browse）、EditorOverlay（Add Photos）、CompletePage（Download）
- 交互：鼠标悬停展开（`onMouseEnter`）、150ms 延迟关闭（`onMouseLeave` + `setTimeout`）
- 点击 ▾ 箭头切换 pinned 状态，锁定后鼠标移出不收起

### CompletePage / Merge 功能

- **完成页**：转换完成后不再自动下载/自动重置，用户手动 Start Over
- complete 状态中 `blobType: "pdf" | "zip"` 区分输出类型
- **Merge 关**：`npm install jszip`，`resolvePdfNames()` 处理同名冲突（1.jpg→1.pdf, 1.png→1-1.pdf）
- **单张图**：无论 merge 开关如何，直接下载 PDF（不打包 zip）
- Merge 开关通过 `settingsRef.merge` 持久化，跨编辑器会话保持

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
