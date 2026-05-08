# HEIC to PDF UI/UX Improvements

## Context

转换引擎功能已实现并通过验证，但 UI 组件（ConversionSettings、PreviewDialog、ConversionContainer 的 selected/converting/error 状态）均使用内联样式，未利用已有的设计系统 CSS 变量和类。用户反馈 UI "太丑"，需要全面提升视觉品质。

## Scope

改进以下 4 个 UI 区域，不修改业务逻辑：

1. **ConversionSettings** — 从原生 radio 改为卡片式选择器
2. **ConversionContainer (selected/converting/error states)** — 状态视觉统一
3. **PreviewDialog** — 大幅预览 + 响应式布局
4. **CSS 类扩展** — 在 globals.css 中添加新的 UI 组件类

## Design Decisions

### 1. ConversionSettings: 卡片式选择器

**当前**: 原生 `<input type="radio">` 组件，仅使用 `accentColor` 改变颜色

**改进**:
- 每个选项渲染为独立卡片，使用 CSS 变量 (`--accent`, `--border`, `--accent-soft`, `--radius-sm`)
- 选中态: `border: 2px solid var(--accent)` + `background: var(--accent-soft)`
- 未选中态: `border: 1px solid var(--border)` + 半透明(0.7)
- hover 态: 轻微上移 + 边框亮起
- 响应式: flex-wrap 布局，移动端纵向堆叠

**CSS 类**: 新增 `.settings-group` / `.setting-option` / `.setting-option.active`

### 2. ConversionContainer 状态改进

**Selected 状态**:
- 文件 chip 沿用已有 `.file-chip` 类
- 设置卡片包裹在 `.settings-card` 容器中
- Convert 按钮使用渐变背景 + hover 上移动画

**Converting 状态**:
- 文件状态区分：已完成(绿色 ✓ + `.done`) / 处理中(旋转动画 + `.active`) / 等待中(半透明 `.pending`)
- 进度信息增强：显示 "Processing X of N" + 已处理大小
- 进度条使用已有 `.progress-track` / `.progress-bar` + 渐变背景
- Cancel 按钮统一样式

**Error 状态**:
- 红色卡片容器: `background: rgba(231,76,60,0.08)` + `border: 1px solid rgba(231,76,60,0.2)`
- 圆形错误图标容器
- 双按钮: "← Back" 重置 + "↻ Try Again" 重试

### 3. PreviewDialog: 大幅预览 + 响应式

**桌面端 (>900px)**:
- 全屏暗色模态框 (oklch(0 0 0 / 50%) + backdrop-filter: blur)
- 左侧缩略图导航栏 (100px 宽，垂直列表)
- 中央大幅预览区 (flex: 1)，图片宽高上限 260x350px
- 底部信息栏: 文件数 · 页数 · 大小 · skipped 提示
- 下载/继续转换按钮

**移动端 (<640px)**:
- 全屏覆盖 (inset: 0)
- 预览图使用 `aspect-ratio: 3/4` + `width: 100%` 自适应
- 底部控制栏: 圆点指示器 + 翻页按钮 (触摸友好)
- 下载按钮全宽

**CSS 类**: 新增 `.preview-overlay` / `.preview-modal` / `.preview-thumbnav` / `.preview-main` / `.preview-controls`

### 4. CSS 变量利用

所有新组件严格使用已有 CSS 变量:
- `--bg`, `--surface`, `--fg`, `--muted`, `--border`
- `--accent`, `--accent-soft`
- `--radius`, `--radius-sm`
- `--font-display`, `--font-body`

## File Changes

| File | Change |
|------|--------|
| `src/app/globals.css` | 新增 `.settings-card`, `.setting-option`, `.setting-option.active`, `.preview-overlay`, `.preview-modal`, `.preview-thumbnav`, `.preview-main`, `.preview-controls`, `.error-card`, `.file-chip.done`, `.file-chip.active`, `.file-chip.pending` 等 CSS 类 |
| `src/components/ConversionSettings.tsx` | 用卡片式选择器替换原生 radio；使用 CSS 类替代内联样式 |
| `src/components/ConversionContainer.tsx` | 移除内联样式，用 CSS 类替换；selected/converting/error 状态使用新样式类 |
| `src/components/PreviewDialog.tsx` | 完全重写：左侧缩略图导航 + 中央大幅预览 + 响应式适配 |

## UX Flow

```
idle → [dropzone] → selected → [convert] → converting → [success] → preview
                                                          → [error] → error → [try again] → selected
                                                                           → [back] → idle
                     preview → [download/download PDF]
                     preview → [convert more] → idle
                     preview → [close] → idle
```

## Responsive Breakpoints

- **>900px**: 桌面端全功能布局（左侧缩略图栏 + 中央预览）
- **640-900px**: 缩略图栏折叠为底部圆点指示器
- **<640px**: 移动端全屏预览，全宽按钮

## Future Considerations (Out of Scope)

- 拖拽文件排序
- 缩略图懒加载 (大文件场景)
- 键盘快捷键 (←/→ 翻页)
