# Merge 功能设计 — 合并/分离 PDF 生成

## Context

当前所有图片强制合并为一份多页 PDF。用户希望增加「是否合并」的选项：合并时生成一份多页 PDF，不合并时每张图片生成独立 PDF 并打包为 zip 下载。

## 整体架构

```
转换流程分支：

merge=true (默认)  ──→ buildPdf(all) ──→ 一份多页 PDF ──→ 下载 my-images.pdf
                    /
[file1, file2, …] 
                    \
merge=false        ──→ 逐图 buildPdf（单页）──→ JSZip 打包 ──→ 下载 images.zip
                           ├─ 1.jpg → 1.pdf
                           ├─ 1.png → 1-1.pdf (冲突检测)
                           └─ 1-1.jpg → 1-1-1.pdf
```

## 涉及文件

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src/lib/conversion-types.ts` | 修改 | ConversionSettings 增加 `merge: boolean`；complete 状态结构微调 |
| `src/lib/zip-utils.ts` | **新增** | 冲突检测命名 + JSZip 打包 |
| `src/lib/pdf-generator.ts` | 不改 | buildPdf 已支持单图输入 |
| `src/hooks/useHeicConversion.ts` | 修改 | startConversion 增加分支 + zip 打包逻辑 |
| `src/components/EditorOverlay.tsx` | 修改 | 设置面板新增 merge toggle + 提示文案 |
| 依赖 | 新增 | `npm install jszip` |

## ConversionSettings 变更

```typescript
export interface ConversionSettings {
  paperSize: "original" | "a4" | "letter" | "legal" | "a3";
  margins: "none" | "narrow" | "normal" | "wide";
  orientation: "portrait" | "landscape" | "auto";
  merge: boolean;  // ← 新增，默认 true
}

export const DEFAULT_SETTINGS: ConversionSettings = {
  paperSize: "a4",
  margins: "narrow",
  orientation: "portrait",
  merge: true,  // ← 新增
};
```

## ConversionState 变更

```typescript
| {
    status: "complete";
    files: ConversionFile[];
    blob: Blob;           // pdfBlob 或 zipBlob
    blobType: "pdf" | "zip";
    sizeBytes: number;
  }
```

## 新增 zip-utils.ts

```
src/lib/zip-utils.ts:
  - resolvePdfNames(files: File[]) → string[]
  - createZip(entries: {name:string, blob:Blob}[]) → Promise<Blob>
```

### 命名冲突算法

输入 `[1.jpg, 1.png, 1-1.jpg]`：

1. `1.jpg` → 尝试 `1.pdf` → 可用 → `1.pdf`
2. `1.png` → 尝试 `1.pdf` → 冲突 → `1-1.pdf` → 可用 → `1-1.pdf`
3. `1-1.jpg` → 尝试 `1-1.pdf` → 冲突 → `1-1-1.pdf` → 可用 → `1-1-1.pdf`

输出：`["1.pdf", "1-1.pdf", "1-1-1.pdf"]`

### JSZip 打包

```typescript
import JSZip from "jszip";

export async function createZip(
  entries: { name: string; blob: Blob }[],
): Promise<Blob> {
  const zip = new JSZip();
  for (const { name, blob } of entries) {
    zip.file(name, blob);
  }
  return zip.generateAsync({ type: "blob" });
}
```

## UI — Merge Toggle

在编辑器右侧设置面板，现有控件下方新增：

- **label**: "Merge PDFs"
- **描述**: "Combine all images into one PDF file"
- **控件**: 开关 toggle
- **默认**: 开启（merge）

当 merge 关闭时，按钮区域显示提示：`"{n} files → {n} PDFs in .zip"`

## 转换流程（useHeicConversion.ts startConversion）

```
收集完 pdfImages 之后:

if (settings.merge) {
  // 现有路径：一次 buildPdf → 下载 my-images.pdf
  pdfBlob = await buildPdf(pdfImages, settings)
  setState({ complete, blob: pdfBlob, blobType: "pdf" })
  download("my-images.pdf", pdfBlob)
} else {
  // 新路径：逐图 buildPdf → 收集 → JSZip → 下载 images.zip
  const names = resolvePdfNames(files)
  const pdfBlobs = []
  for (let i = 0; i < pdfImages.length; i++) {
    pdfBlobs.push({
      name: names[i],
      blob: await buildPdf([pdfImages[i]], perImageSettings[i]),
    })
  }
  const zipBlob = await createZip(pdfBlobs)
  setState({ complete, blob: zipBlob, blobType: "zip" })
  download("images.zip", zipBlob)
}
```

## 实施步骤

1. 安装 jszip 依赖
2. 修改 conversion-types.ts（merge 字段 + complete 状态）
3. 新增 zip-utils.ts（命名冲突 + 打包）
4. 修改 EditorOverlay.tsx（merge toggle UI + 提示）
5. 修改 useHeicConversion.ts startConversion（分支逻辑）
6. 验证：merge=true 行为不变；merge=false 生成正确 zip

## 验证

1. **merge=true（单张）**：上传 1 张图 → 下载 `my-images.pdf`
2. **merge=true（多张）**：上传多张 → 下载 `my-images.pdf`，含多页
3. **merge=false（单张）**：上传 1 张图 → 下载 `my-images.pdf`（只有 1 张也是 PDF）
4. **merge=false（多张，无冲突）**：上传 a.jpg, b.png → zip 内含 `a.pdf`, `b.pdf`
5. **merge=false（多张，有冲突）**：上传 1.jpg, 1.png → zip 内含 `1.pdf`, `1-1.pdf`
6. **merge false + 多级冲突**：上传 1.jpg, 1.png, 1-1.jpg → `1.pdf`, `1-1.pdf`, `1-1-1.pdf`
7. **设置持久化**：切换 merge 开关后，设置保留在状态中
