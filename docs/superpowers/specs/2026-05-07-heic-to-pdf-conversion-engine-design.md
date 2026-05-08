# HEIC to PDF 转换引擎设计

## Context

项目 `heicpdf.to` 已完成 Next.js 脚手架搭建和首页 UI 开发（含 Hero、拖拽区、步骤说明、FAQ、页脚等模块），部署并绑定了 `heicpdf.to` 域名。

当前 DropZone 中的进度条使用模拟动画，尚无实际的 HEIC 解码和 PDF 生成逻辑。本文档定义浏览器端 HEIC → PDF 转换引擎的完整设计方案，覆盖架构、数据流、内存管理、PDF 预览、错误处理和测试策略。

## 技术选型

| 层 | 方案 | 版本 | 理由 |
|----|------|------|------|
| HEIC 解码 | `libheif-js/wasm-bundle` | ^1.19.8 | 活跃维护的 HEIC WASM 解码方案，支持获取 RGBA 像素 |
| PDF 生成 | `pdf-lib` | ^1.17.1 | 零依赖，无损图像嵌入，支持增量添加页面 |
| RGBA → PNG/JPEG | 浏览器原生 Canvas API | 内置 | Worker 传回 RGBA，主线程用 Canvas.toBlob() 编码，零额外依赖 |
| 并发环境 | Web Worker | 原生 | WASM 解码计算密集，Worker 执行避免阻塞主线程 UI |
| 测试框架 | Vitest | 待安装 | 配合 TypeScript，与项目已有工具链一致 |

### 排除方案

- **heic2any**：只输出 JPEG/PNG Blob，不保留原始数据，额外压缩导致质量损失
- **jspdf**：浏览器优先，图像嵌入会重新编码，PDF 控制力不如 pdf-lib

## 架构概览

```
用户选择/拖放 HEIC 文件
        │
        ▼
[ConversionContainer — Client Orchestrator]  ← 新增
  ├── DropZone（文件选择/拖放）
  ├── ConversionSettings（纸张/边距/方向）
  ├── useHeicConversion Hook（状态机 + Worker 控制）
  └── PreviewDialog（PDF 预览 + 下载）
        │
        ▼
[Worker — heic-worker.ts]
  串行解码：HEIC → RGBA（Transfer to main thread）
        │
        ▼
[主线程 Canvas 管道]
  ┌ 循环每张图 ───────────────────────────────────────┐
  │ ① 收到 Worker RGBA buffer                         │
  │ ② Canvas.putImageData → toBlob('image/png')       │
  │ ③ pdfDoc.embedPng(pngBytes) → addPage → drawImage  │
  │ ④ Canvas 缩略 → toBlob('image/jpeg', 0.6)          │
  │ ⑤ 保留缩略图用于预览，释放 RGBA + 全尺寸 PNG        │
  └──────────────────────────────────────────────────┘
        │
        ▼
[预览 + 下载]
  - PreviewDialog：翻页浏览缩略图
  - 下载：pdfDoc.save() → Blob → URL.createObjectURL → <a download>
```

### 关键架构决策

| 决策 | 说明 |
|------|------|
| **增量式 PDF 构建** | 每张图解码后立即嵌入 PDF，不积攒中间 PNG 字节，降低峰值内存 |
| **双 Canvas 策略** | 主 Canvas 生成全尺寸 PNG 用于 PDF，缩略 Canvas 生成小图用于预览 |
| **Worker 只做解码** | RGBA → PNG 编码由主线程 Canvas 完成，利用浏览器原生编码器 |
| **ConversionContainer** | 新增客户端编排组件，承载所有转换状态，保持 page.tsx 为纯组合 |

## 数据流与状态机

### 状态定义

```typescript
type ConversionFile = {
  id: string;           // 唯一标识，用于 React key
  file: File;           // 原始 File 引用
  status: 'pending' | 'converting' | 'done' | 'skipped';
  thumbnailUrl?: string; // 缩略图 ObjectURL，预览用
  error?: string;
};

type ConversionState =
  | { status: 'idle' }
  | {
      status: 'selected';
      files: ConversionFile[];
      settings: ConversionSettings;
    }
  | {
      status: 'converting';
      files: ConversionFile[];
      settings: ConversionSettings;
      progress: number;       // 0-100
      currentFileIndex: number;
    }
  | { status: 'error'; files: ConversionFile[]; error: string }
  | {
      status: 'preview';
      files: ConversionFile[];
      pdfBlob: Blob;
      pdfSizeBytes: number;
    };
```

### 进度模型

整体进度由 `useHeicConversion` Hook 实时计算，不依赖 Worker 的百分比汇报——Worker 只报告"第 N 张解码完毕"，主线程根据总图数和当前进度推算百分比。

```
整体进度 = (已完成的图数 / 总图数) × 100 + (当前图在 Canvas 编码中的估算进度 / 总图数)

每张图权重 = 100 / 总图数
  ├─ Worker 解码（占该图 80%）：Worker 完成后隐式推进
  └─ Canvas 编码 + PDF 嵌入 + 缩略图（占该图 20%）：主线程同步推进
```

用户看到的进度条和每张图状态：

```
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰░░░░░░░░░░░  40%

📷 IMG_0001.HEIC ✅
📷 IMG_0002.HEIC ⏳ Converting...
📷 IMG_0003.HEIC ⏳ Waiting
📷 IMG_0004.HEIC ⏳ Waiting
```

### 完整流程

```
idle
  │ 用户拖入/选择文件（HEIC/HEIF 后缀过滤）
  ▼
selected
  │ 显示文件列表 + ConversionSettings + "Convert N files" 按钮
  │ 用户点击 Convert
  ▼
converting
  │ Worker 初始化 → 加载 WASM (~200-600ms)
  │ ┌ 循环处理 ────────────────────────────────────────┐
  │ │ Worker.decode(file[N].buffer) → {rgba, w, h}     │
  │ │   → postMessage({rgbaBuffer}, [rgbaBuffer])      │
  │ │                                                    │
  │ │ 主线程收到:                                        │
  │ │   ① new ImageData(rgba, w, h) → canvas.putImageData│
  │ │   ② canvas.toBlob('image/png') → pdfDoc.embedPng()│
  │ │   ③ → addPage() → drawImage()                     │
  │ │   ④ 缩略 canvas → toBlob('image/jpeg', 0.6)      │
  │ │   ⑤ URL.createObjectURL(thumbBlob) → file.thumbnailUrl│
  │ │   ⑥ 释放 RGBA、全尺寸 PNG Blob                    │
  │ │   ⑦ 更新 progress, file.status = 'done'           │
  │ └──────────────────────────────────────────────────┘
  │ 所有图片处理完成
  │ pdfDoc.save() → Blob → preview
  │
  ├─ 全部成功 → preview
  ├─ 部分失败 → preview（底部标注 "N files skipped"）
  └─ 全部失败 → error
```

### Worker 消息协议

```typescript
// Worker → 主线程
type WorkerToMain =
  | { type: 'ready' }
  | { type: 'progress'; fileIndex: number; phase: 'loading' | 'decoding'; percent: number }
  | { type: 'file-done'; fileIndex: number; width: number; height: number;
      rgbaBuffer: Uint8Array }   // 通过 transfer list 零拷贝传递
  | { type: 'file-error'; fileIndex: number; error: string }
  | { type: 'all-done' };

// 主线程 → Worker
type MainToWorker =
  | { type: 'init' }
  | { type: 'decode'; fileIndex: number; buffer: ArrayBuffer }
  | { type: 'cancel' };
```

**说明**：`rgbaBuffer` 使用 `postMessage` 的 transfer list 传递（`[rgbaBuffer.buffer]`），Worker 释放所有权，主线程获得零拷贝访问。

### 取消与清理

| 场景 | 行为 |
|------|------|
| 用户点击 Cancel | `worker.postMessage({type:'cancel'})` + `worker.terminate()` |
| 组件卸载（useEffect cleanup） | 同上，确保无僵尸 Worker |
| 转换完成 | `worker.terminate()` 释放 WASM 内存 |
| 缩略图 ObjectURL | 在 reset/idle 时统一 `URL.revokeObjectURL()` |
| PDF Blob URL | 下载触发后立即 `URL.revokeObjectURL()` |

## 组件设计

### 新增文件

| 路径 | 职责 | 类型 |
|------|------|------|
| `src/lib/heic-worker.ts` | Web Worker，加载 libheif WASM，解码 HEIC → RGBA | Worker |
| `src/lib/pdf-generator.ts` | 接收增量 ImageData + 设置，用 pdf-lib 组装 PDF | 纯函数 |
| `src/hooks/useHeicConversion.ts` | 状态机、Worker 生命周期、进度计算、清理 | React Hook |
| `src/components/ConversionContainer.tsx` | 编排所有转换相关组件（DropZone/设置/预览） | Client |
| `src/components/ConversionSettings.tsx` | 纸张/边距/方向设置面板 | Client |
| `src/components/PreviewDialog.tsx` | 多页缩略图预览 + 下载弹窗 | Client |

### 修改文件

| 路径 | 变更 |
|------|------|
| `src/components/DropZone.tsx` | 替换 simulateConversion()，改为调用 useHeicConversion 的 selectFiles() |
| `src/app/[locale]/page.tsx` | 用 ConversionContainer 替换原 HeroSection 中的 DropZone 直接调用 |

### ConversionContainer 组合关系

```tsx
// ConversionContainer.tsx — 纯客户端组件
export default function ConversionContainer() {
  const conversion = useHeicConversion();

  return (
    <>
      <HeroSection>
        <DropZone
          onFilesSelected={conversion.selectFiles}
          isActive={conversion.state.status === 'idle'}
        />

        {conversion.state.status === 'selected' && (
          <>
            <FileList files={conversion.state.files} />
            <ConversionSettings
              value={conversion.state.settings}
              onChange={conversion.updateSettings}
            />
            <button onClick={conversion.start}>Convert {files.length} files →</button>
          </>
        )}

        {conversion.state.status === 'converting' && (
          <ProgressDisplay
            progress={conversion.state.progress}
            files={conversion.state.files}
            onCancel={conversion.cancel}
          />
        )}
      </HeroSection>

      {conversion.state.status === 'preview' && (
        <PreviewDialog
          files={conversion.state.files.filter(f => f.status === 'done')}
          pdfBlob={conversion.state.pdfBlob}
          pdfSizeBytes={conversion.state.pdfSizeBytes}
          skippedCount={conversion.state.files.filter(f => f.status === 'skipped').length}
          onDownload={conversion.download}
          onReset={conversion.reset}
        />
      )}

      {conversion.state.status === 'error' && (
        <ErrorBanner message={conversion.state.error} onRetry={conversion.retry} />
      )}
    </>
  );
}
```

### ConversionSettings

单选按钮组三个维度，默认值：A4 / Narrow / Portrait

```
Paper Size     ○ Original  ● A4
Margins        ○ None  ● Narrow  ○ Normal
Orientation    ● Portrait  ○ Landscape
```

**Original 模式定义**：像素按 72 DPI 映射为 PDF 磅值（1px = 1pt），长边最大 1200pt，短边按比例缩放。例如 iPhone 3024×4032 照片 → 900×1200pt。

**A4 模式**：PDF 页面 595×842pt，图像在设定边距和方向内缩放适应，保持原始宽高比。

| 边距 | 值 | 有效区域（A4 Portrait） |
|------|-----|----------------------|
| None | 0pt | 595×842 |
| Narrow | 36pt (0.5in) | 523×770 |
| Normal | 72pt (1in) | 451×698 |

### PreviewDialog — 多页预览弹窗

转换完成后弹出，显示缩略图供用户翻页预览。

#### 预览技术方案

每张图在转换的 Canvas 步骤中**同步生成缩略图**（JPEG, 200px 宽, quality 0.6），大小约 10-30KB/张。20 张图总计 < 1MB，内存开销可忽略。

```
Canvas 编码步骤：
  fullCanvas.toBlob('image/png')       → 用于 PDF 嵌入 → 立即释放
  thumbnailCtx.drawImage(fullCanvas,0,0,thumbW,thumbH)
  thumbCanvas.toBlob('image/jpeg',0.6) → createObjectURL → 保留用于预览
```

#### 交互

```
┌─────────────────────────────────────────┐
│  ✕                    HEIC→PDF          │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │             [缩略图 200px]           ││
│  │         ◀  Page 3 / 6  ▶           ││
│  └─────────────────────────────────────┘│
│                                         │
│  ✅ 6 files converted · 6 pages · 12.5 MB │
│  ⚠️ 1 file skipped (unsupported format) │
│                                         │
│  [Download PDF]    [Convert more]       │
└─────────────────────────────────────────┘
```

| 元素 | 行为 |
|------|------|
| ◀ / ▶ 箭头 | 翻页切换缩略图，更新页码 |
| ✕ 关闭 | 回到 idle 状态，revoke 所有 ObjectURL |
| Download PDF | `saveAs(pdfBlob, 'HEIC_Converted.pdf')`，下载后 revoke PDF URL |
| Convert more | 回到 idle，清空所有状态，revoke 所有 ObjectURL |
| 跳过提示 | 仅在 `skippedCount > 0` 时显示 |

## 错误处理策略

| 场景 | 行为 |
|------|------|
| 单张 HEIC 解码失败 | 跳过，继续处理其余，最终摘要标注 |
| 所有文件均失败 | 进入 error 状态 |
| WASM 加载失败 | 提示刷新页面重试 |
| 文件 > 50MB | 选择阶段拒绝 |
| 非 HEIC/HEIF 文件 | 选择阶段过滤并提示 |
| 超过 20 个文件 | 截断至前 20 个 |
| 转换中用户取消 | worker.terminate() + 状态回 idle |

## HEIC 方向处理

iPhone HEIC 照片依赖 EXIF orientation metadata 正确显示。`libheif` 的 `image.display()` 方法会读取和应用 orientation 元数据，但需验证。

策略：
1. 解码后读取 `image.get_orientation()` 获取旋转角度/翻转信息
2. 如果 display() 自动应用了方向，直接使用输出 RGBA
3. 如果未应用，在主线程 Canvas 上手动旋转（前 90°/180°/270°）
4. 在验证环节使用 iPhone 拍摄的竖屏和横屏 HEIC 照片测试

## 测试策略

### 测试基建（实施第一步）

```bash
npm install -D vitest @testing-library/react jsdom
```

在 `package.json` 添加 `"test": "vitest run"`，`vitest.config.ts` 配置 jsdom 环境。

### 测试范围

| 测试对象 | 策略 | 示例 |
|---------|------|------|
| `pdf-generator.ts` | 纯函数，mock 图片数据，验证 PDF 产出 | 传入 1 张/3 张图片，校验页数；不同边距设置校验 page 尺寸 |
| `useHeicConversion.ts` | mock Worker 行为，状态机转换 | 模拟文件选择 → 转换完成 → 预览状态 |
| `heic-worker.ts` | 集成测试（小 HEIC 文件），或 mock libheif | 确保 decode 后 RGBA 不为空 |
| `ConversionSettings.tsx` | 组件测试 | 点击单选更新值 |
| `PreviewDialog.tsx` | 组件测试 | 显示 PDF 信息，点击下载触发回调 |

### 手动验证项

- iPhone 拍摄的真实 HEIC 文件（竖屏/横屏）
- 批量 20 张大文件
- 非 HEIC 文件拖入
- Safari 浏览器兼容性
- 手机端低内存场景

## i18n 消息规划

新增消息全部定义在 `messages/en.json`。当前为纯英文 MVP，多语言为后续扩展范围。

### 新增消息 key

```
converter.settings.paperSize.label     → "Paper Size"
converter.settings.paperSize.original  → "Original"
converter.settings.paperSize.a4        → "A4"
converter.settings.margins.label       → "Margins"
converter.settings.margins.none        → "None"
converter.settings.margins.narrow      → "Narrow"
converter.settings.margins.normal      → "Normal"
converter.settings.orientation.label   → "Orientation"
converter.settings.orientation.portrait  → "Portrait"
converter.settings.orientation.landscape → "Landscape"
converter.button.convert               → "Convert {count} files →"
converter.status.converting            → "Converting..."
converter.status.fileDone              → "Done"
converter.status.fileSkipped           → "Skipped"
converter.status.fileWaiting           → "Waiting"
converter.progress.fileOfTotal         → "Photo {current} of {total}"
converter.error.wasmLoad               → "Failed to load converter engine. Please refresh and try again."
converter.error.fileTooLarge           → "File too large (max 50MB)"
converter.error.unsupportedFormat      → "Unsupported format. Only HEIC/HEIF files are accepted."
converter.error.maxFiles               → "Maximum 20 files at a time."
converter.preview.title                → "PDF Preview"
converter.preview.pageOf               → "Page {current} of {total}"
converter.preview.summary              → "{files} files converted · {pages} pages · {size}"
converter.preview.skipped              → "{count} file skipped (unsupported format)"
converter.preview.download             → "Download PDF"
converter.preview.convertMore          → "Convert more"
converter.preview.cancel               → "Cancel"
```

## 性能与内存

### 峰值内存模型

```
串行处理单张 12MP iPhone HEIC：
  RGBA buffer:          48 MB  ← Worker 持有，transfer 后释放
  full PNG Blob:        2-5 MB ← 嵌入 PDF 后释放
  JPEG thumbnail:       10-30 KB ← 保留
  pdfDoc 累积增长:      每页 ~2-5 MB

峰值 ≈ 48 + 5 + pdfDoc(单页) ≈ 55 MB
```

20 张图完成后 `pdfDoc` 本身占 ~40-100 MB（20 页 × 2-5 MB），这是最终产物无法避免的。但过程中不累积所有中间 PNG 字节。

### LCP 保障

- WASM（~600KB）在点击 Convert 后才动态加载到 Worker
- 首屏 JS bundle 不受影响
- Worker 使用 `new Worker(new URL(...), {type: 'module'})`，独立 chunk

## Next.js 配置注意事项

- `next.config.ts` 启用 `asyncWebAssembly: true`
- Worker 创建方式：`new Worker(new URL('./heic-worker.ts', import.meta.url))`
- **需 POC 验证**：在实施第一步验证 Worker + WASM + `next build` 在本地和 Vercel 均正常

## 实施步骤（供 writing-plans 参考）

```
Phase 0: POC 验证（1 天）
  ① 安装 libheif-js + pdf-lib
  ② 创建最小 Worker 实例，验证 WASM 加载
  ③ `npm run build` 确认编译不报错

Phase 1: 核心转换管道（2-3 天）
  ① heic-worker.ts（Worker 编码实现）
  ② pdf-generator.ts（pdf-lib 增量构建）
  ③ useHeicConversion Hook（状态机 + Worker 控制）
  ④ 替换 DropZone 中的模拟进度

Phase 2: 设置 + 预览 UI（1-2 天）
  ① ConversionSettings 组件
  ② PreviewDialog 组件（含翻页预览）
  ③ ConversionContainer 编排组件
  ④ 集成到 page.tsx

Phase 3: 测试 + 打磨（1 天）
  ① 安装 Vitest 并编写单元测试
  ② 手动测试真实 HEIC 文件
  ③ 测试取消/清理/错误路径
  ④ Safari/Chrome 兼容确认
```

## 后续扩展可能

- Worker 并发数控制（串行→并行提升速度）
- PDF 元数据（标题、作者）
- PDF 压缩选项
- 拖拽重排图片顺序
