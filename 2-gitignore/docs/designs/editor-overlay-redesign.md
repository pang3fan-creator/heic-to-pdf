# EditorOverlay Redesign — 从全屏覆盖到悬浮卡片

## 目标

将编辑器从全屏固定覆盖（`position: fixed; inset: 0`）改为四边内缩的悬浮卡片式布局，提升视觉美感和透气感。

## 改动点

### 1. 编辑器面板（`.editor-overlay`）
- `position: fixed; inset: 0` → `inset: 16px`
- 新增 `border-radius: 16px`（四角圆角）
- 新增 `overflow: hidden`（子元素不溢出圆角）
- 新增 `box-shadow: 0 8px 32px rgba(0,0,0,0.3)`（悬浮阴影）
- 背景保持 `var(--surface)`（实体色，遮罩靠下层实现）
- 删除 `background: var(--bg)`

### 2. 背景遮罩层（新增 `.editor-backdrop`）
- `position: fixed; inset: 0; z-index: 9999`
- `background: oklch(0% 0 0 / 30%); backdrop-filter: blur(8px)`
- 与编辑器同时出现/消失（`opacity: 0 → 1; transition: 0.35s`）
- 编辑器下层，页面内容上层

### 3. 进入动画增强
- 编辑器：`opacity: 0; transform: scale(0.98)` → `.active` → `opacity: 1; transform: scale(1)`
- 遮罩层：简单 `opacity` 过渡

### 4. 组件改动
- `EditorOverlay.tsx`：新增 `<div className="editor-backdrop">` 遮罩层
- `globals.css`：修改 `.editor-overlay` 样式 + 新增 `.editor-backdrop` 样式

### 5. 不变的部分
- Body 滚动锁定（保留）
- Header / Body / Sidebar 内部布局不变
- 响应式适配（移动端 `max-width: 768px`）保持不变

## 文件清单
- `src/components/EditorOverlay.tsx` — 新增遮罩层 JSX
- `src/app/globals.css` — 修改 `.editor-overlay` + 新增 `.editor-backdrop`
