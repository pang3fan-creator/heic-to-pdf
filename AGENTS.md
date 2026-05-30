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

## 关键文件

| 区域      | 关键路径                                                     |
| --------- | ------------------------------------------------------------ |
| 页面      | `app/[locale]/page.tsx`（首页）, `app/[locale]/blog/`, `app/[locale]/privacy/`, `app/[locale]/terms/` |
| 组件      | `ConversionContainer`, `EditorOverlay`, `DropZone`, `Navbar`, `Footer`, `Breadcrumb`, `GuideSection` |
| 核心 Hook | `hooks/useHeicConversion.ts`（状态机：解码→转换→下载）       |
| 解码层    | `lib/image-decoder.ts`（HEIC→Worker, 其他→createImageBitmap）, `lib/heic-worker.ts` |
| PDF 生成  | `lib/pdf-generator.ts`（pdf-lib）, `lib/preview-renderer.ts` |
| 云存储    | `lib/cloud/oauth-core.ts`, `lib/cloud/dropbox/`, `lib/cloud/google-drive/` |
| 国际化    | `i18n/routing.ts`, `i18n/request.ts`（deepMerge 回退）, `middleware.ts` |
| SEO       | `app/sitemap.ts`, `app/robots.ts`, `app/llms.txt/route.ts`   |

## 常见坑点

### 多语言注意事项

- **法语关键词**：统一使用 "HEIC en PDF"（月搜索 8100），不使用 "HEIC vers PDF"（590）或 "HEIC to PDF"
- **部分翻译回退**：`request.ts` 中通过 deepMerge 将 fr.json 合并到 en.json，缺失 key 静默回退英文
- **语言切换器**：`routing.ts` 需要 `createNavigation(routing)` 导出 `useRouter`/`usePathname`
- **NEXT_LOCALE cookie**：next-intl 通过此 cookie 持久化用户语言选择，浏览器测试时需清除
- **Meta description**：严格控制在 160 字符以内（SEO 要求）
- **metadata 本地化**：`layout.tsx` 的 `generateMetadata` 中 title.default、description、openGraph、twitter 均需用 `getTranslations` 获取翻译，不可硬编码
- **GuideSection**：首页的 GuideSection 使用独立顶级命名空间 `guideSection`（en.json + fr.json 中定义）

### next-intl 路由规则 (关键!)

- `/` → 英文首页，直接展示
- `/en` → 英文首页，重定向到 `/`
- 不要在 `[locale]` 目录下直接创建 `en/` 文件夹
- `usePathname()` 返回的路径包含语言前缀（如 `/es/about`），解析时需过滤
- 过滤语言段: `segments.filter((s, i) => i !== 0 || !SUPPORTED_LOCALES.includes(s))`
- **非 locale 路径**（如 `/auth/*`）需要在 `middleware.ts` 的 matcher 中显式排除，且需要自己的 layout（含 `<html>`/`<body>` 标签）

### 多语言 URL 拼接

错误: /${locale}/path → 产生 /frpath
错误: /${locale === "en" ? "" : locale}/path → 产生 //path
正确: 使用 buildUrl(locale, "/path") 从 @/lib/url 导入

### 正文内链本地化

- `dangerouslySetInnerHTML` 中的链接不会被 `getLocalizedPath` 处理

- 在翻译正文中用 `{converterHref}` 占位符替换 `href="/"`，page.tsx 组装 article 时 replace 为本地化路径：

  ```ts
  sections: rawArticle.sections.map((s) => ({
    ...s,
    body: s.body.replace(/\{converterHref\}/g, converterHref),
  })),
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

### CSS 模式

- **样式方案**：纯手写 CSS + 内联 `style={{}}`，**未使用 Tailwind CSS**，不要添加 Tailwind 类名
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

### Cloud OAuth（Dropbox / Google Drive）

- **关键坑**：授权成功后需重新调用 `getAccessToken()` 获取新 token
- Google OAuth 页面有 COOP 头，必须用全页面重定向（不能用弹窗）；Dropbox 可用弹窗
- `oauth-core.ts` 实现 BroadcastChannel + localStorage 双备援
- **环境变量**：`NEXT_PUBLIC_DROPBOX_APP_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_API_KEY`
- Google token 通过 `/api/auth/google/token` 服务端代理，`client_secret` 不暴露客户端
- Google 回调 `/auth/google/callback`，dropbox 回调 `/auth/dropbox/callback`（均已在 middleware 排除）

### Split Button 下拉菜单

- 三个位置使用：DropZone（Browse/Download）、EditorOverlay（Add Photos）
- 交互：鼠标悬停展开（`onMouseEnter`）、150ms 延迟关闭（`onMouseLeave` + `setTimeout`）
- 无箭头按钮，无 pinned 状态——悬停即显，移出即收

### Complete 状态 / Merge 功能

- DropZone 内联三态切换（idle→converting→complete），非全屏覆盖层
- **单张图不打包 zip**：无论 merge 开关如何，单文件直接下载 PDF
- `resolvePdfNames()` 处理同名冲突（1.jpg→1.pdf, 1.png→1-1.pdf）

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

| 规范               | 说明                                                         |
| ------------------ | ------------------------------------------------------------ |
| Schema 类型        | 工具页面用 `WebApplication`，博客用 `BlogPosting`            |
| BlogPosting 必填   | headline, image (ImageObject 1200×630), datePublished, author |
| 日期格式           | ISO 8601 含时区 (`2026-03-16T00:00:00+00:00`)                |
| 多语言支持         | Schema 文本从翻译文件获取，`inLanguage` 标识语言             |
| @graph 模式        | 多 Schema 用 `@graph` 组织，配合 `@id` 引用                  |
| @graph 与 @context | `@context` 放在 `@graph` 外层 wrapper 上，graph 内条目不重复添加 |
| BreadcrumbList     | 只包含实际存在的页面，不支持 `inLanguage` 属性               |
| SearchAction       | 仅当有实际搜索功能时添加                                     |
| 全局 Schema 本地化 | `layout.tsx` 的 Organization 需用 `getTranslations()` 动态获取描述，不能硬编码 |
| isPartOf 引用检查  | 引用 `#website` 等 ID 前需确认该 ID 在全局 schema 中存在（当前仅 `#organization`） |

### hreflang 规范

- 所有页面都应包含 x-default 指向默认语言版本
- 使用 `buildUrl(locale, "/path")` 生成 canonical/hreflang URL

### sitemap 维护

新增页面时需同步更新 `src/app/sitemap.ts` 的 `pages` 数组

- sitemap 中每种语言版本的 URL 都需添加 `alternates.languages`（含 hreflang 标签），不只是默认语言
- `lastModified` 使用每页实际修改日期，不用 `new Date()`

### 新增博客文章检查清单

- `messages/en.json` → `blog.<slug>` 命名空间（SEO title ≤46 chars + brand = ≤60，description ~155 chars）
- `messages/fr.json` → 同上，`article.sections` 需完整翻译
- `src/app/[locale]/blog/<slug>/page.tsx` → BLOG_PATH, generateMetadata（BlogPosting + image + OG image + twitter image）, breadcrumb
- `src/app/[locale]/blog/<slug>/page.test.tsx`
- `src/app/sitemap.ts` → pages 数组新增，固定 lastMod 日期
- `messages/en.json` + `fr.json` → `blog.index.posts` 和 `sidebar.mostRead` 各加一条
- `src/app/llms.txt/route.ts` → Useful Links 新增
- 侧边栏 mostRead 只保留真实存在的文章，related 可暂空（模块保留）

### 删除博客文章检查清单

- 删除 `src/app/[locale]/blog/<slug>/` 目录
- `messages/en.json` + `fr.json` → 删除 `blog.<slug>` 命名空间，更新 `blog.index`（posts, mostRead, topics）
- `src/app/sitemap.ts` → 移除对应条目
- `src/app/llms.txt/route.ts` → 移除或替换引用
- 全文 grep `<slug>` 确认无遗留引用

### Open Graph / Twitter Card

- 通过 Next.js Metadata API 的 `openGraph` 和 `twitter` 字段注入，在 `[locale]/layout.tsx` 的 `generateMetadata` 中配置
- OG 图片占位 URL：`https://heicpdf.to/og-image.png`，需在 `public/` 放 1200×630 图片

### llms.txt

- AI 搜索引擎（ChatGPT、Perplexity）使用 `/llms.txt` 获取网站摘要
- 实现方式：Route Handler `src/app/llms.txt/route.ts`，返回 `text/plain`，内联纯文本内容
- middleware matcher 排除 `.*\\..*`（含点号 URL），所以路由不受 next-intl 影响

## Git 操作陷阱

- **简单跨分支修改**：直接 `git checkout target-branch` 编辑提交，不要用 stash——stash 增加了不必要的复杂度，容易丢失工作区内容
- **`git reset --soft` 后 index 内有全部已暂存内容**：此时 `git add` 只是追加暂存，`git commit` 会包含所有已暂存文件，不是只有刚 `git add` 的那个。如需只提交单文件，先 `git restore --staged .` 清空暂存，再 `git add <file>`
- **同 commit 的两个分支间切换**：`git checkout` 会携带未提交的工作区变更（包括 index 和 working tree），注意分支隔离
- **简单场景**：不要用 stash/reset/rebase 等复杂操作，优先用直接编辑 + 提交
