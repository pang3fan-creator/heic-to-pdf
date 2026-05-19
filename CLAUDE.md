# `Heic to PDF`

## 技术栈

- **框架**: Next.js (App Router)
- **国际化**: next-intl（支持 en + fr，部分翻译回退机制）
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

## 浏览器测试

- `agent-browser` CLI 已安装（`~/.agent-browser/browsers` 含 Chrome）。UI 问题优先用 `agent-browser open <url>` + `agent-browser snapshot -i` + `agent-browser eval` 验证视觉效果而非推算
- `npx playwright` 也可用（浏览器在 `~/Library/Caches/ms-playwright/`）
- **预先存在的测试失败**：`src/app/[locale]/blog/how-to-convert-heic-to-pdf/page.test.tsx` 因 vitest 中 `next/navigation` 模块解析问题失败，非代码改动引起

## 项目结构

```
src/
├── app/[locale]/page.tsx     # 主页面
├── app/auth/                 # OAuth 回调页（非 locale 路由，需排除 middleware）
├── components/
│   ├── ConversionContainer.tsx # 状态机调度（idle/editor/converting/complete）
│   ├── EditorOverlay.tsx      # 全屏编辑器（缩略图+排序+预览）
│   ├── PreviewModal.tsx       # 大图预览弹窗
│   ├── DropZone.tsx           # idle+converting+complete 三态合一
│   ├── GlobalDropOverlay.tsx  # 全局拖拽覆盖层
│   ├── Navbar.tsx             # 顶部导航栏（含主题切换）
│   ├── Footer.tsx             # 页脚（含语言切换器）
│   ├── LanguageSwitcher.tsx   # 语言切换下拉菜单
│   ├── Breadcrumb.tsx         # 面包屑导航
│   └── __tests__/             # 组件单元测试
├── hooks/
│   ├── useHeicConversion.ts   # 核心状态机（解码/转换/下载）
│   └── __tests__/
├── lib/
│   ├── cloud/
│   │   ├── types.ts             # CloudProvider, OAuthConfig, TokenStore
│   │   ├── oauth-core.ts        # PKCE生成、popup管理、token管理
│   │   ├── dropbox/{config,auth}.ts
│   │   └── google-drive/{config,auth,utils}.ts
│   ├── conversion-types.ts    # 类型定义 + 常量
│   ├── heic-worker.ts         # libheif Web Worker（HEIC→RGBA）
│   ├── image-decoder.ts       # 统一图片解码层（HEIC→Worker, 其他→createImageBitmap）
│   ├── pdf-generator.ts       # pdf-lib PDF 生成
│   ├── preview-renderer.ts    # Canvas PDF 页面预览渲染
│   ├── dropbox-utils.ts       # Dropbox Chooser（导入）
│   ├── dropbox-auth.ts        # PKCE OAuth + 直接上传 API
│   └── __tests__/
├── app/sitemap.ts             # sitemap 生成
├── app/robots.ts              # robots.txt 生成
├── i18n/routing.ts            # 国际化路由配置（locales、pathnames）
├── middleware.ts               # next-intl 路由中间件（matcher 排除 /auth/ 等）
├── types/libheif-js.d.ts       # libheif 类型声明
└── types/css.d.ts               # CSS 模块类型声明（`declare module "*.css"`）
```

## 常见坑点

### 多语言注意事项

- **法语关键词**：统一使用 "HEIC en PDF"（月搜索 8100），不使用 "HEIC vers PDF"（590）或 "HEIC to PDF"
- **部分翻译回退**：`request.ts` 中通过 deepMerge 将 fr.json 合并到 en.json，缺失 key 静默回退英文
- **语言切换器**：`routing.ts` 需要 `createNavigation(routing)` 导出 `useRouter`/`usePathname`
- **NEXT_LOCALE cookie**：next-intl 通过此 cookie 持久化用户语言选择，浏览器测试时需清除
- **Meta description**：严格控制在 160 字符以内（SEO 要求）
- **metadata 本地化**：`layout.tsx` 的 `generateMetadata` 中 title.default、description、openGraph、twitter 均需用 `getTranslations` 获取翻译，不可硬编码
- **首页组件硬编码**：`GlobalDropOverlay.tsx`（Drop images anywhere）、`Navbar.tsx`（aria-label）、`Footer.tsx`（aria-label）可能有硬编码英文，需用翻译替换
- **GuideSection**：首页的 GuideSection 使用 `blog.howToConvertHeicToPdf.guideSection` 命名空间，首页翻译时需额外覆盖此命名空间
- **结构化数据**：隐私/条款等法律页面也需添加 WebPage + BreadcrumbList 的 JSON-LD

### next-intl 路由规则 (关键!)

- `/` → 英文首页，直接展示
- `/en` → 英文首页，重定向到 `/`
- 不要在 `[locale]` 目录下直接创建 `en/` 文件夹
- `usePathname()` 返回的路径包含语言前缀（如 `/es/about`），解析时需过滤
- 过滤语言段: `segments.filter((s, i) => i !== 0 || !SUPPORTED_LOCALES.includes(s))`
- **非 locale 路径**（如 `/auth/*`）需要在 `middleware.ts` 的 matcher 中显式排除，且需要自己的 layout（含 `<html>`/`<body>` 标签）

### 翻译文本前缀

- 翻译值的文本可能已包含前缀字符（如 `"startOver": "← Start Over"`），JSX 中不要再重复添加 `&larr;`，否则会显示双箭头

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
- 修改布局/服务端组件后也可能触发：`rm -rf .next/cache` 后重新 `npm run build`

### favicon 404

- `next.config.ts` 中通过 `async redirects()` 将 `/favicon.ico` 301 重定向到已有图标文件（如 `/favicon-32x32.png`）

### CSS 模式

- **样式方案**：纯手写 CSS + 内联 `style={{}}`，**未使用 Tailwind CSS**，不要添加 Tailwind 类名
- **毛玻璃**：`background: color-mix(in srgb, var(--surface) 60%, transparent); backdrop-filter: blur(20px)`
- **竖向 range slider**：`input[type=range] { writing-mode: vertical-lr; direction: rtl; }` 交换宽高语义
- **CSS tooltip**：`button[title]:hover::after { content: attr(title); position: left: 100%; ... }`
- 浮层面板使用 `position: absolute; top: 50%; transform: translateY(-50%)` 实现垂直居中
- **CSS 作用域陷阱**：`.drop-zone .split-btn-wrap` 会匹配 drop-zone 下所有实例。不同状态（idle/converting/complete）切换时需用 extra class（`.drop-zone.complete-mode .split-btn-wrap`）覆盖旧规则
- **flex 按钮对齐**：同一 flex 容器内多个按钮需用相同 `display: inline-flex; align-items: center; line-height`，且考虑 border 占用的高度（`padding` 补偿）

### 主题系统

- 使用 OKLCH 色彩空间，默认暗色模式，亮色模式通过 `[data-theme="light"]` 切换
- 主题变量在 `:root` 中定义，通过 JS 切换 `data-theme` 属性
- 核心变量：`--bg`、`--surface`、`--fg`、`--muted`、`--border`、`--accent`、`--accent-soft`

### 全屏覆盖层滚动锁定

- EditorOverlay 全屏 fixed 覆盖层打开时，需锁定 body 滚动
- `document.body.style.overflow = 'hidden'`
- 计算滚动条宽度 `window.innerWidth - document.documentElement.clientWidth`，补偿到 `paddingRight` 防止页面抖动
- useEffect cleanup 中恢复原始 overflow 和 paddingRight

### Cloud OAuth 弹窗通信

- 某些 provider（如 Google）的 OAuth 页面设置 `Cross-Origin-Opener-Policy`，破坏弹窗通信
- 方案：`oauth-core.ts` 实现 BroadcastChannel + localStorage 轮询双备援
- `notifyOpener()` 同时使用 BroadcastChannel 和 `window.opener.postMessage()`
- `openOAuthPopup()` 首次检测到 COOP 后不再访问 `popup.closed`，减少 console 噪声
- **关键坑**：授权成功后需重新调用 `getAccessToken()` 获取新 token（`uploadTo*` 函数容易遗漏）

### Dropbox 集成

- **环境变量**：`.env.local` → `NEXT_PUBLIC_DROPBOX_APP_KEY`
- **OAuth 层**：通过 `src/lib/cloud/dropbox/auth.ts` 适配，核心在 `oauth-core.ts`
- **导入**：Dropbox Chooser API（`Dropbox.choose()`）
- **导出**：PKCE OAuth + `/files/upload`
- **弹窗**：`window.open()` 弹窗模式

### Google Drive 集成

- **环境变量**：`NEXT_PUBLIC_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`（服务端） + `NEXT_PUBLIC_GOOGLE_API_KEY`
- **OAuth**：使用全页面重定向而非弹窗（Google 的 OAuth 页面设置 COOP 头）
- **Token 交换**：通过 `proxyUrl: "/api/auth/google/token"` 服务端代理转发，`client_secret` 不暴露到客户端。服务端使用 `undici` 的 `ProxyAgent`，支持 `HTTPS_PROXY` 环境变量（本地开发需要科学上网时设置）
- **导入**：Google Picker API（需启用 Google Picker API + Google Drive API）
- **API Key 要求**：`NEXT_PUBLIC_GOOGLE_API_KEY` 必须设置，且 Key 的 API 限制须包含以上两个 API
- **Picker 视图**：使用 `DocsView().setMimeTypes(...)` 过滤文件类型
- **上传**：multipart 格式（元数据 JSON + 文件 blob）
- **回调路由**：`/auth/google/callback`（已在 middleware matcher 中排除）

### Split Button 下拉菜单

- 三个位置使用：DropZone（Browse/Download）、EditorOverlay（Add Photos）
- 交互：鼠标悬停展开（`onMouseEnter`）、150ms 延迟关闭（`onMouseLeave` + `setTimeout`）
- 无箭头按钮，无 pinned 状态——悬停即显，移出即收

### Complete 状态 / Merge 功能

- **完成页**：不再全屏固定覆盖层，改在 DropZone 内联显示（idle→converting→complete 三态在 DropZone 内切换）
- **云存储状态**：使用统一的 `cloudStatus`（`provider + status`）管理各网盘上传状态
- complete 状态中 `blobType: "pdf" | "zip"` 区分输出类型
- **Merge 关**：`npm install jszip`，`resolvePdfNames()` 处理同名冲突（1.jpg→1.pdf, 1.png→1-1.pdf）
- **单张图**：无论 merge 开关如何，直接下载 PDF（不打包 zip）
- Merge 开关通过 `settingsRef.merge` 持久化，跨编辑器会话保持

### 安全响应头 / CSP

- `next.config.ts` 的 `async headers()` 注入 CSP 等响应头，`next-intl` 插件兼容
- CSP 关键允许项：`img-src 'self' blob: data:`（PDF 预览 blob URL）、`script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'`（HEIC WebAssembly）、`connect-src 'self' https://*.dropboxapi.com https://www.googleapis.com`（云存储 API）
- 修改 CSP 后需 `npm run build` 验证构建

## SEO 规范

### 基础配置

- 每个路由使用 Metadata API 动态生成 TDK
- 使用 `title.template` 自动追加品牌后缀：`title: { template: "%s | HEICPDF.TO", default: "..." }`
- Meta title（含品牌后缀）应控制在 40-60 字符之间

### JSON-LD Schema 规范

- **注入位置**：全局 Organization schema 在 `layout.tsx` 的 `<head>` 注入；页面级 schema（WebApplication/FAQPage/WebPage/BlogPosting）在各 `page.tsx` 的 `<main>` 前注入

| 规范           | 说明                                              |
| -------------- | ------------------------------------------------- |
| Schema 类型    | 工具页面用 `WebApplication`，博客用 `BlogPosting` |
| 日期格式       | ISO 8601 含时区 (`2026-03-16T00:00:00+00:00`)     |
| 多语言支持     | Schema 文本从翻译文件获取，`inLanguage` 标识语言  |
| @graph 模式    | 多 Schema 用 `@graph` 组织，配合 `@id` 引用       |
| @graph 与 @context | `@context` 放在 `@graph` 外层 wrapper 上，graph 内条目不重复添加 |
| BreadcrumbList | 只包含实际存在的页面，不支持 `inLanguage` 属性    |
| SearchAction   | 仅当有实际搜索功能时添加                          |
| 全局 Schema 本地化 | `layout.tsx` 的 Organization 需用 `getTranslations()` 动态获取描述，不能硬编码 |
| isPartOf 引用检查 | 引用 `#website` 等 ID 前需确认该 ID 在全局 schema 中存在（当前仅 `#organization`） |

### hreflang 规范

- 所有页面都应包含 x-default 指向默认语言版本
- 使用 `buildUrl(locale, "/path")` 生成 canonical/hreflang URL

### sitemap 维护

新增页面时需同步更新 `src/app/sitemap.ts` 的 `pages` 数组
- sitemap 中每种语言版本的 URL 都需添加 `alternates.languages`（含 hreflang 标签），不只是默认语言

### Open Graph / Twitter Card

- 通过 Next.js Metadata API 的 `openGraph` 和 `twitter` 字段注入，在 `[locale]/layout.tsx` 的 `generateMetadata` 中配置
- OG 图片占位 URL：`https://heicpdf.to/og-image.png`，需在 `public/` 放 1200×630 图片

### llms.txt

- AI 搜索引擎（ChatGPT、Perplexity）使用 `/llms.txt` 获取网站摘要
- 实现方式：Route Handler `src/app/llms.txt/route.ts`，返回 `text/plain`，内联纯文本内容
- middleware matcher 排除 `.*\\..*`（含点号 URL），所以路由不受 next-intl 影响
