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
待补充
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

### Middleware 配置 (关键!)

- API 路由必须在 matcher 中保留（Clerk auth 需要），但可跳过 intl 中间件处理
- 使用 `createRouteMatcher` 判断路由类型，对 API 路由直接 return 跳过 intl
- 示例：`if (isAuthOnlyRoute(req)) return;`

### `CSP` 配置

- 在 `next.config.ts` 的 `async headers()` 中配置
- 开发环境修改后需要重启服务器才能生效
- 使用浏览器控制台检查被阻止的资源

### `Vercel Fluid Active CPU` 

- middleware.ts 是 CPU 消耗大户，API 路由应跳过 intl 处理
- 使用 `import { cache } from "react"` 包装数据库查询函数

### 博客系统

- 使用 MDX (Markdown + JSX)
- **next-mdx-remote/rsc 不支持 import**：组件必须通过 `mdx-components.tsx` 注册
- **静态文件避开动态路由**：`/blog/[slug]` 会捕获 `/blog/image.png`，图片放 `public/images/`

### AdSense 样式注入问题 (关键!)

- AdSense 脚本会向容器注入 `style="height: auto !important;"`，破坏 `h-screen` 布局
- 内联 `!important` > CSS 类 `!important`，无法用 CSS 覆盖
- 解决方案：用 MutationObserver 实时移除注入的样式，参考 `components/PageLayout.tsx`

### Vercel Hobby 版超时限制 (关键!)

- **Node.js Runtime**: 10 秒执行时间上限（硬性限制）
- **Edge Runtime**: 30 秒执行时间
- 流式响应只能延长响应时间，无法绕过执行时间限制
- `AI API` 路由应使用 `export const runtime = "edge"` 获取更长执行时间

### `Supabase` 异步操作 (关键!)

- query builder 不支持 `.catch()` 方法链
- 异步更新需用 `void (async () => { await ... })()` 包装
- 示例：`void (async () => { await supabase.from('table').update({...}) })()`

### 测试文件位置

- 测试文件放在 `lib/*.test.ts`
- 使用 Vitest，运行命令 `npm run test`

## SEO 规范

### 基础配置

- 每个路由使用 Metadata API 动态生成 TDK
- 结构化数据: WebApplication, FAQPage, HowTo
- Editorial Policy 页面说明公式来源 (ACOG/NHS)

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
