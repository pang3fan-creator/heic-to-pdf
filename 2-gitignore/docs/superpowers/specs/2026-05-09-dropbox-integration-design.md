# Dropbox 集成设计 — 文件导入与导出

## Context

当前用户只能从本地上传图片。增加 Dropbox 支持，用户可以：
- **导入**：从 Dropbox 选择图片导入编辑器
- **导出**：转换完成后将 PDF/zip 保存到 Dropbox

同时改造完成状态页面，从自动下载 + 自动重置改为稳定展示、用户自主选择操作。

## 整体架构

```
                  导入 (Chooser API)                  导出 (Saver API)
                  ────────────────                   ──────────────

  Homepage DropZone           Editor Add Photos           CompletePage
  ┌─────────────────┐        ┌──────────────────┐       ┌──────────────────┐
  │                 │        │                  │       │                  │
  │ [Browse ▾]      │        │ [+ Add ▾]        │       │ [Download ▾]     │
  │  ├ From device  │        │  ├ From device   │       │  ├ To device     │
  │  └ From Dropbox │        │  └ From Dropbox  │       │  └ Save to DBX   │
  │                 │        │                  │       │                  │
  └──────┬──────────┘        └──────┬───────────┘       └──────┬───────────┘
         │                          │                          │
         ▼                          ▼                          ▼
  Dropbox.choose()           Dropbox.choose()           Dropbox.save()
         │                          │                          │
         ▼                          ▼                          │
  fetch → File对象          fetch → File对象                   │
         │                          │                          │
         ▼                          ▼                          │
  selectFiles()             addMoreFiles()                     │
         │                          │                          │
         └──────────────────────────┘                          │
                        │                                      │
                  转换流程 (复用)                                │
                        │                                      │
                        └──────────────────────────────────────┘
                                   │
                             完成页面
```

## 涉及文件

| 文件 | 改动类型 |
|------|---------|
| `src/lib/dropbox-utils.ts` | **新建** — 封装 Dropbox Chooser + Saver |
| `src/components/CompletePage.tsx` | **新建** — 完成页面组件 |
| `src/components/ConversionContainer.tsx` | 修改 — 新增 complete 分支渲染 |
| `src/components/DropZone.tsx` | 修改 — Browse 按钮改为 Split Button 下拉 |
| `src/components/EditorOverlay.tsx` | 修改 — Add Photos 按钮同理 |
| `src/components/GlobalDropOverlay.tsx` | 不改 — 拖拽仍然只支持本地文件 |
| `src/hooks/useHeicConversion.ts` | 修改 — 取消自动下载 + 取消 1.5s 自动重置 |
| `src/app/globals.css` | 修改 — Split Button + CompletePage 样式 |
| `messages/en.json` | 修改 — 新增翻译 |
| `.env.local` | **新建** — `NEXT_PUBLIC_DROPBOX_APP_KEY` |
| `next.config.ts` | 修改 — 添加 Dropbox CDN 到 CSP |

## 1. Dropbox SDK 加载

通过动态创建 `<script>` 标签加载 Dropbox API：

```typescript
// src/lib/dropbox-utils.ts

let sdkLoaded = false;

export async function ensureDropboxSdk(): Promise<void> {
  if (sdkLoaded || typeof Dropbox !== "undefined") {
    sdkLoaded = true;
    return;
  }
  return new Promise((resolve) => {
    const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
    if (!appKey) {
      resolve(); // silently skip if no key
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.dropbox.com/static/api/2/dropins.js";
    script.id = "dropboxjs";
    script.setAttribute("data-app-key", appKey);
    script.onload = () => { sdkLoaded = true; resolve(); };
    document.body.appendChild(script);
  });
}
```

**App Key 配置：**
- 用户在 Dropbox Developer Console 创建 App → 获取 App Key
- 配置到 `.env.local`：`NEXT_PUBLIC_DROPBOX_APP_KEY=xxxxx`
- Chooser 和 Saver 共用同一个 Key

## 2. 导入 — Dropbox Chooser

```typescript
/**
 * Open Dropbox file picker and return selected files as File objects.
 */
export function pickFromDropbox(): Promise<File[]> {
  return new Promise((resolve, reject) => {
    ensureDropboxSdk().then(() => {
      if (typeof Dropbox === "undefined" || !Dropbox.choose) {
        reject(new Error("Dropbox SDK not available"));
        return;
      }
      Dropbox.choose({
        success: async (files: DropboxChooserFile[]) => {
          try {
            const results = await Promise.all(
              files.map(async (f) => {
                const resp = await fetch(f.link, { mode: "cors" });
                const blob = await resp.blob();
                return new File([blob], f.name, { type: f.type || blob.type });
              }),
            );
            resolve(results);
          } catch (err) {
            reject(err);
          }
        },
        cancel: () => resolve([]), // user cancelled → empty
        linkType: "direct",
        multiselect: true,
        extensions: imageExtensions, // defined from SUPPORTED_EXTENSIONS
      });
    });
  });
}
```

**注意：** `fetch(f.link, { mode: "cors" })` 需要 Dropbox 的 direct link 支持 CORS。Dropbox Chooser 的 direct link 默认允许跨域。

## 3. 导出 — Dropbox Saver

```typescript
/**
 * Save a Blob to Dropbox via Saver API.
 * Returns true if saved, false if cancelled.
 */
export function saveToDropbox(blob: Blob, filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    ensureDropboxSdk().then(() => {
      const url = URL.createObjectURL(blob);
      Dropbox.save({
        files: [{ url, name: filename }],
        success: () => { URL.revokeObjectURL(url); resolve(true); },
        cancel: () => { URL.revokeObjectURL(url); resolve(false); },
      });
    });
  });
}
```

## 4. Split Button — 下拉按钮

按钮设计：主体按钮（点击触发默认操作）+ 右侧小箭头（点击展开下拉菜单）。

**HTML 结构：**
```html
<div class="split-btn-wrap">
  <button class="split-btn-main" onClick={defaultAction}>
    Browse Files
  </button>
  <button class="split-btn-arrow" onClick={toggleDropdown} aria-label="More options">
    ▾
  </button>
  {isOpen && (
    <div className="split-btn-dropdown">
      <button onClick={() => { close(); fromDevice(); }}>From your device</button>
      <button onClick={() => { close(); fromDropbox(); }}>From Dropbox</button>
    </div>
  )}
</div>
```

**交互逻辑：**
- 点击主按钮（`Browse Files` / `Add Photos` / `Download`）→ 触发默认操作
- 点击 ▾ 箭头 → 展开/收起下拉菜单
- 点击菜单外部 → 收起菜单
- 选中菜单项 → 执行对应操作 + 收起菜单

**三处使用：**

| 位置 | 默认操作 | 下拉选项 |
|------|---------|---------|
| DropZone (首页) | 打开本地文件选择器 | From your device / From Dropbox |
| EditorOverlay (编辑器) | 打开本地文件选择器 | From your device / From Dropbox |
| CompletePage (完成页) | 下载到本地 | Download to device / Save to Dropbox |

## 5. 完成页面 — CompletePage

**状态机变化：**

`useHeicConversion` 的 `startConversion`：
- 取消自动下载（不再 `createObjectURL` + `click`）
- 取消 1.5s 自动重置
- 只设置 `complete` 状态，保留 `blob` 供手动操作

**UI 布局：**
```
┌──────────────────────────────────────┐
│  ✓  Conversion Complete!             │
│                                      │
│  文件处理结果列表                      │
│  ┌─ file1.heic  ────────  2.1 MB ✓ ─┐│
│  ├─ photo2.jpg  ────────  1.3 MB ✓ ─┤│
│  └─ image3.png  ────────  0.8 MB ✓ ─┘│
│                                      │
│  输出文件：my-images.pdf  (3.2 MB)    │
│                                      │
│    [ Download ▾ ]  [ Start Over ]     │
│                                      │
│  dropdown:                            │
│  ├ Download to device                 │
│  └ Save to Dropbox                    │
└──────────────────────────────────────┘
```

**渲染方式：** 在 ConversionContainer 中新增 `"complete"` 分支，使用条件渲染渲染 CompletePage 组件。

## 6. 现有流程调整

**useHeicConversion.ts 改动：**
- 删除自动下载代码（`URL.createObjectURL` + `click` + `revokeObjectURL`）
- 删除 1.5s 自动重置（不再自动回到 idle）
- 保留 `complete` 状态设置不变

**ConversionContainer.tsx 改动：**
- 在 `"complete"` 分支渲染 CompletePage
- CompletePage 接收 `blob`, `blobType`, `sizeBytes`, `files`, `onReset` 等属性

## 7. 验证

1. **导入 — 本地设备**：点击 Browse → 打开本地文件选择器（行为不变）
2. **导入 — Dropbox**：点击 ▾ → From Dropbox → 弹出 Dropbox 登录窗口 → 选择文件 → 文件出现在编辑器
3. **导出 — 下载**：转换完成后 → 点击 Download → 下载到本地
4. **导出 — Dropbox**：点击 ▾ → Save to Dropbox → 弹出 Dropbox 保存窗口 → 选择位置 → 保存成功
5. **Dropbox App Key 缺失**：按钮正常渲染，但 Dropbox 选项应提示未配置或静默忽略
6. **完成页稳定性**：完成后不自动跳转，可多次下载或保存
7. **Start Over**：点击后回到首页 idle 状态
