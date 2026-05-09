# 云存储集成设计文档

## 概述

在现有 Dropbox 集成（双向：导入/导出）的基础上，继续支持 Google Drive 和 OneDrive 云盘。同时将 Dropbox 已验证的 PKCE OAuth 流程提取为通用抽象层，减少代码重复，便于后续扩展。

## 实现策略

**分阶段实施：先 Google Drive，再 OneDrive**

1. 阶段一：创建 `cloud/` 抽象层 + 重构 Dropbox 适配
2. 阶段二：实现 Google Drive（验证抽象层可用）
3. 阶段三：实现 OneDrive（纯 API 适配）

## 架构设计

### 文件结构

```
src/lib/cloud/
├── types.ts                    # CloudProvider, OAuthConfig, TokenStore
├── oauth-core.ts               # PKCE生成、popup管理、token管理、刷新
├── dropbox/
│   ├── config.ts               # Dropbox OAuth 配置
│   ├── auth.ts                 # 薄层适配（调用 oauth-core）
│   └── utils.ts                # existing: Chooser SDK + saveToDropbox()
├── google-drive/
│   ├── config.ts               # Google Drive OAuth 配置
│   ├── auth.ts                 # OAuth 适配
│   └── utils.ts                # Google Picker + uploadToGoogleDrive()
└── onedrive/                   # 阶段三
    ├── config.ts
    ├── auth.ts
    └── utils.ts
```

### 通用 OAuth 核心（`oauth-core.ts`）

| 函数 | 职责 |
|------|------|
| `generatePKCE()` | 生成 code_verifier（64字节）、SHA-256 challenge、state（16字节） |
| `openOAuthPopup(url, eventType)` | 打开 popup 窗口 + postMessage 监听 + 关闭检测 |
| `notifyOpener(type, success)` | 回调页通知 opener |
| `exchangeCode(config, code, verifier)` | 授权码 → token 交换 |
| `createTokenManager(storagePrefix)` | localStorage CRUD + 过期检测 + 自动刷新 |
| `refreshAccessToken(config, refreshToken)` | refresh_token → 新 token |

### 回调路由模式

每个 provider 一个回调页，位于 `src/app/auth/{provider}/callback/page.tsx`，遵循相同模式：

1. useEffect 中调用 provider 的 `handleCallback()`
2. 成功时 `window.opener.postMessage()` 通知父窗口
3. 自动关闭弹窗
4. 无 opener 时显示状态并重定向首页

## Dropbox 重构

- 现有 `dropbox-auth.ts`（~240 行 OAuth 逻辑）→ 精简为 `cloud/dropbox/auth.ts`（~50 行适配代码）
- 对外接口 `pickFromDropbox()` 和 `saveToDropbox()` 保持不变
- Chooser SDK 集成代码（SDK script 加载、`window.Dropbox.choose`）不动

## Google Drive 集成

### OAuth 配置

| 参数 | 值 |
|------|-----|
| authUrl | `accounts.google.com/o/oauth2/v2/auth` |
| tokenUrl | `oauth2.googleapis.com/token` |
| scope | `https://www.googleapis.com/auth/drive.file` |
| redirectUri | `{origin}/auth/google/callback` |
| tokenLifetime | 3600000（1小时） |

### 上传

- 使用 Google Drive API v3、multipart 格式
- 发送 `{ name, parents: ["root"] }` 元数据 + `blob` 文件内容

### 导入（Picker）

- 加载 Google Picker API 和 Google API Client 库
- 用户通过 Google Picker 选择文件
- token 下载文件，返回 `File[]`

### 路由

- 新增 `src/app/auth/google/callback/page.tsx`
- 新增 `.env.local`：`NEXT_PUBLIC_GOOGLE_CLIENT_ID`

## OneDrive 集成

### OAuth 配置

| 参数 | 值 |
|------|-----|
| authUrl | `login.microsoftonline.com/common/oauth2/v2.0/authorize` |
| tokenUrl / refreshUrl | `login.microsoftonline.com/common/oauth2/v2.0/token` |
| scope | `offline_access Files.ReadWrite.All` |
| redirectUri | `{origin}/auth/onedrive/callback` |
| tokenLifetime | 3600000（1小时） |

注意：`offline_access` 是 Microsoft Identity Platform 获取 refresh_token 的必需 scope。

### 上传

- 使用 Microsoft Graph API，PUT raw body
- 端点为 `graph.microsoft.com/v1.0/me/drive/root:/{filename}:/content`

### 导入

- 加载 OneDrive File Picker SDK（`js.live.net/v7.0/OneDrive.js`）
- 与 Dropbox Chooser 模式一致

### 路由

- 新增 `src/app/auth/onedrive/callback/page.tsx`
- 新增 `.env.local`：`NEXT_PUBLIC_ONEDRIVE_CLIENT_ID`

## UI 集成

三个 Split Button 各新增两个菜单项，顺序：Device → Dropbox → Google Drive → OneDrive。

| 位置 | 翻译 key | 值 |
|------|----------|-----|
| DropZone | `hero.dropzone.fromGoogleDrive` | "From Google Drive" |
| DropZone | `hero.dropzone.fromOneDrive` | "From OneDrive" |
| EditorOverlay | `editor.fromGoogleDrive` | "From Google Drive" |
| EditorOverlay | `editor.fromOneDrive` | "From OneDrive" |
| CompletePage | `editor.complete.toGoogleDrive` | "Save to Google Drive" |
| CompletePage | `editor.complete.toOneDrive` | "Save to OneDrive" |

转换后文件的上传状态使用与 Dropbox 一致的 `dropboxStatus` 模式（`idle → authorizing → uploading → success / error`）。

## 不做的事情

- 不创建抽象的通用 Picker 层（三个 provider 的 SDK 差异太大，抽象收益低）
- 不改变现有的 conversion state machine
- 不添加任何付费/限制功能（文件大小限制等）
