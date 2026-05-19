# 多语言支持方案（页脚语言切换器 + 法语初版）

## 背景

网站目前仅支持英文。需要建立多语言基础设施：在页脚添加语言切换器、自动检测浏览器语言、新增法语支持。

## 整体架构

- **语言检测**：利用 next-intl middleware 的 `Accept-Language` 头部自动检测
- **URL 方案**：`localePrefix: "as-needed"`
  - 英文：保持 `/` 无前缀
  - 其他语言：`/{locale}/...`（如 `/fr/`、`/fr/privacy/`）
- **回退策略**：法语翻译中未覆盖的 key 自动显示英文（通过消息合并机制）

## 修改清单

### 1. 路由配置 — `src/i18n/routing.ts`

```diff
- locales: ["en"],
+ locales: ["en", "fr"],
```

### 2. 法语翻译文件 — `messages/fr.json`

创建包含全站所有 key 的法语消息文件：
- **nav 命名空间**：法语翻译（导航栏品牌名、链接、主题切换）
- **footer 命名空间**：法语翻译（描述、工具列、支持列、版权、标语）
- **其他命名空间**：暂保留英文占位，后续逐步翻译

### 3. URL 备用链接 — `src/lib/url.ts`

`buildAlternates()` 自动将 `fr` 纳入 hreflang 和 canonical 标签。
`sitemap.ts` 需为每个页面生成英语版和法语版两条条目。

### 4. 语言切换器组件 — `src/components/LanguageSwitcher.tsx`

- **视觉**：小型下拉菜单，国旗 emoji + 语言名称（🇬🇧 English / 🇫🇷 Français）
- **位置**：页脚底部，不显眼
- **数据驱动**：从 `routing.locales` 动态生成选项
- **交互**：选择后 `useRouter().replace()` 同页面切换语言
- **扩展性**：未来添加西语/阿语等只需：添加 locale + 翻译文件 + 在 switcher 中注册显示名

### 5. 页脚集成 — `src/components/Footer.tsx`

在页脚末尾区域嵌入 `<LanguageSwitcher />` 组件，与现有版权和徽章布局协调。

### 6. SEO

- hreflang 标签自动为法语页面生成
- sitemap 包含法语页面 URL
- canonical URL 正确反映语言版本

## 不涉及修改

- 首页内容、编辑界面、FAQ、博客等暂不提供法语翻译（后续阶段）
- Navbar 组件不添加语言切换器（仅在页脚放置）
- 云存储 OAuth 页面不影响

## 涉及文件

| 文件 | 操作 |
|------|------|
| `src/i18n/routing.ts` | 添加 `fr` 到 locales |
| `messages/fr.json` | 新建 |
| `src/components/LanguageSwitcher.tsx` | 新建 |
| `src/components/Footer.tsx` | 集成 LanguageSwitcher |
| `src/app/sitemap.ts` | 添加法语页面条目 |
| `src/lib/url.ts` | 无需修改（自动适配 locales 数组） |

## 验证方式

1. 启动 `npm run dev`
2. 法语用户场景：浏览器设置首选语言为法语 → 访问 `/` → 自动跳转 `/fr/` → 导航栏和页脚显示法语
3. 英文用户场景：浏览器设为英文 → 访问 `/` → 显示英文，无 `/en` 前缀
4. 切换器功能：在页脚下拉切换语言 → 当前页面正确切换语言版本
5. 构建验证：`npm run build` 通过
