# `HEIC to PDF` 垂直工具站产品需求文档 (PRD)

## 1. 项目综述

- **项目名称**：`HEIC to PDF`  
- 域名：`heicpdf.to`
- **产品核心价值**：利用 **WebAssembly (WASM)** 技术实现浏览器本地转换，主打“隐私、极速、无需上传”。  
- **竞争策略**：以全站权重对标巨头（如 Smallpdf、Adobe）的单一频道页，通过 LCP < 1.5s 的性能表现获取排名优势。  

## 2. 用户意图与核心痛点

- **用户意图**：交易型/功能型。用户需求是“即刻转换”。  
- **核心痛点**：
  - **兼容性**：iPhone 拍摄的 HEIC 在 Windows/Android 无法查看。  
  - **隐私忧虑**：不希望将私人照片上传到第三方服务器。  
  - **效率低下**：现有工具加载慢（LCP > 2.4s）、弹窗多、有批量限制。  

## 3. 功能需求 (Functional Requirements)

### 3.1 核心转换引擎 (The Tool)

- **本地处理**：集成 WebAssembly 解码库，确保 HEIC 转换 PDF 过程在用户浏览器本地完成。  
- **批量处理**：支持一次性拖拽最多 20 张图片进行合并转换。  
- **参数控制**：提供简单的 PDF 页面设置（如：原图尺寸、A4 自适应、页边距控制）。  

### 3.2 页面布局矩阵

| **模块**        | **需求描述**                                     | **对应数据/策略**      |
| --------------- | ------------------------------------------------ | ---------------------- |
| **首屏 (Hero)** | 极简 Drop-zone，包含“隐私保护”标签。             | 降低跳出率，提升 LCP。 |
| **操作说明**    | 结构化的 3-4 步说明。                            | 增加页面停留时间。     |
| **格式对比表**  | HEIC vs JPEG vs PDF 维度对比。                   | 争夺“精选摘要”排名。   |
| **FAQ 模块**    | 针对 Semrush 提及的 114 个相关问题进行内容平铺。 | 建立 Topic Authority。 |

## 4. 非功能需求 (Non-Functional Requirements)

### 4.1 性能目标 (KPIs)

- **LCP (Largest Contentful Paint)**：必须控制在 **1.5s 以内**（优于竞争对手的 2.4s-3s）。  
- **页面体积**：首屏核心资源（HTML+CSS+JS）控制在 200KB 以内（不含 WASM 库文件）。  

### 4.2 隐私与安全

- **零上传声明**：在 UI 显著位置标注“Your files stay in your browser”。  
- **离线可用**：技术架构应支持用户在断网状态下（载入页面后）依然能完成转换。  

## 5. 设计与视觉 (Design Guidelines)

- **视觉风格**：**Dark-First（暗黑驱动）**。使用 `oklch(14% 0.012 50)` 作为底色，营造专业、极客的质感。  
- **微动效**：
  - Drop-zone 在拖拽时产生“琥珀色”发光效果（Neon Glow）。  
  - 卡片悬停时有 4px 的平滑位移。  
- **响应式**：优先确保移动端体验，因为大量搜索可能来自手机用户。  

## 6. SEO 策略 (The "Niche Authority" Plan)

### 6.1 TDK 配置 (示例)

- **Title**: `HEIC to PDF: Privacy-First, Fast Browser Conversion (No Upload)`
- **Description**: `Convert iPhone HEIC photos to PDF instantly in your browser. Batch conversion supported. 100% private — your files never leave your device.`

### 6.2 内容建设

- **关键词覆盖**：
  - **核心词**：`heic to pdf`, `heic pdf`。  
  - **高速增长词**：`heif image to pdf`（年增长 900%）。  
  - **合并需求词**：`combine heic to pdf`。  
- **结构化数据 (Schema)**：
  - 部署 `SoftwareApplication` 标记。
  - 部署 `FAQPage` 标记（覆盖 114 个 Questions）。  

## 7. 变现建议 (Monetization)

1. **广告**：在转换完成后的下载页面，放置非侵入式的原生广告。  
2. **高级订阅**：针对单次转换 >20 张图或超大文件的用户，提供付费 Pro 版本。  
3. **流量矩阵**：利用 `heicpdf.to` 的海量流量为其他高价值 SaaS 工具导流。  
