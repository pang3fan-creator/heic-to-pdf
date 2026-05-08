# 图片格式扩展设计 — 支持 JPEG/PNG/WebP

## Context

首页的 HEIC-to-PDF 功能目前仅支持 HEIC/HEIF 格式。用户希望扩展支持 JPEG、PNG、WebP 三种常见图片格式，实现"多格式统一转 PDF"。

## 整体架构

```
文件选择 → getFileType() 格式路由
  ├─ HEIC → heic-worker(Worker解码) → RGBA
  ├─ JPEG → createImageBitmap → Canvas → RGBA
  ├─ PNG  → createImageBitmap → Canvas → RGBA
  └─ WebP → createImageBitmap → Canvas → RGBA
       ↓
  统一 RGBA → 缩略图/预览渲染（现有逻辑无需改动）
       ↓
  PDF 生成
  ├─ HEIC → Canvas→PNG → embedPng
  ├─ JPEG → 直接嵌入原始字节 → embedJpg（无损）
  ├─ PNG  → 直接嵌入原始字节 → embedPng（无损）
  └─ WebP → Canvas→PNG → embedPng
```

## 涉及的文件

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src/lib/conversion-types.ts` | 修改 | 新增 ImageFormat 枚举、PdfImageInput 接口 |
| `src/lib/image-decoder.ts` | **新增** | 统一解码入口，封装格式路由 |
| `src/lib/heic-worker.ts` | 不改 | 现有 Worker 逻辑不变 |
| `src/lib/pdf-generator.ts` | 修改 | buildPdf 支持直接嵌入 JPEG/PNG |
| `src/hooks/useHeicConversion.ts` | 修改 | 解码循环根据格式路由、PDF 生成传原始字节 |
| `src/components/DropZone.tsx` | 修改 | accept 属性扩展、isHeicFile 替换 |
| `src/components/ConversionContainer.tsx` | 不改 | 无需改动 |
| `src/components/EditorOverlay.tsx` | 不改 | 无需改动 |

## 实施步骤

### Step 1: 新增 ImageFormat 类型和辅助函数

**文件**: `src/lib/conversion-types.ts`

- 新增枚举 `ImageFormat`: `"heic" | "jpeg" | "png" | "webp"`
- 新增函数 `getFileType(file: File): ImageFormat | "unsupported"`（替代 `isHeicFile`）
- 新增接口 `PdfImageInput`:
  ```typescript
  type PdfImageInput = {
    format: ImageFormat
    data: Uint8Array   // JPEG/PNG=原始字节, HEIC/WebP=Canvas编码的PNG字节
    width: number
    height: number
  }
  ```
- 新增常量 `SUPPORTED_FORMATS` 和文件扩展名映射
- 新增常量 `MAX_FILE_SIZE` 保持 50MB（作为后期可调配置项）

### Step 2: 新增 image-decoder.ts

**文件**: `src/lib/image-decoder.ts`

- 导出函数 `decodeImage(file: File, format: ImageFormat, signal?: AbortSignal)`
- 返回统一结构 `{ rgbaBuffer: Uint8Array, width: number, height: number }`
- HEIC 路径：启动 Worker，复用 `heic-worker.ts` 的解码消息协议
- JPEG/PNG/WebP 路径：
  1. `createImageBitmap(file)` 获取位图
  2. 在离屏 Canvas 上绘制位图
  3. `ctx.getImageData()` 读取 RGBA
  4. 返回统一格式数据

### Step 3: 修改 DropZone.tsx

- `accept` 属性从 `".heic,.HEIC,.heif,.HEIF"` 扩展为 `".heic,.HEIC,.heif,.HEIF,.jpg,.jpeg,.PNG,.png,.webp,.WEBP"`
- 文件过滤回调从 `isHeicFile` 替换为 `getFileType(file) !== "unsupported"`
- 文件名展示位置适应更长的扩展名

### Step 4: 修改 useHeicConversion.ts

- **文件选择** (`selectFiles` / `addMoreFiles`): 过滤条件换为 `getFileType`
- **解码阶段** (`decodePendingFiles`):
  - 移除 `isHeicFile` 检查
  - 对每个文件调用 `getFileType(file)` 获取格式
  - 统一调用 `decodeImage(file, format)` 获得 RGBA 数据
  - Worker 只用于 HEIC 的解码层（内部路由）
- **PDF 生成阶段** (`startConversion`):
  - HEIC：保持现有 Canvas→PNG 路径
  - WebP：Canvas→PNG 路径
  - JPEG：`file.arrayBuffer()` 获取原始字节
  - PNG：`file.arrayBuffer()` 获取原始字节
- **取消**：传入 `AbortSignal` 给 `decodeImage` 以支持中途取消
- 输出文件名从 `HEIC_Converted.pdf` 改为 `my-images.pdf`

### Step 5: 修改 pdf-generator.ts

- `buildPdf` 函数参数从 `Uint8Array[]`（纯 PNG 字节）改为 `PdfImageInput[]`
- 对每张图片：
  - `format === "jpeg"` → `pdfDoc.embedJpg(data)`
  - `format === "png"` → `pdfDoc.embedPng(data)`
  - 其他 → `pdfDoc.embedPng(data)`（HEIC/WebP 已在外部转成 PNG）

### Step 6: 清理

- 移除废弃的 `isHeicFile` 函数
- 更新各文件 import 路径

## 验证

1. **HEIC 原有流程不受影响** — 上传 .heic 文件，缩略图、预览、转 PDF 一切正常
2. **JPEG 支持** — 上传 .jpg 文件，缩略图正常显示，PDF 文件体积 = 原始 JPEG 大小（无损直接嵌入）
3. **PNG 支持** — 上传 .png 文件，同上无损嵌入
4. **WebP 支持** — 上传 .webp 文件，正常解码并嵌入
5. **混合作业** — 同时上传 HEIC + JPEG + PNG + WebP，PDF 顺序正确，每种格式正常渲染
6. **文件大小限制** — 超过 50MB 的文件被拒绝
7. **格式过滤** — 非支持格式（如 .gif, .bmp）正常提示不支持

## 付费扩展点

在 `conversion-types.ts` 中预留：

- `SingleFileSizeLimit`：当前 50MB，后期可做成按订阅等级调整
- `PdfSecurityOptions`：密码保护、权限控制
- `OutputFileName`：允许用户自定义输出文件名
