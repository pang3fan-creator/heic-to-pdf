# 云存储集成（Google Drive & OneDrive）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 HEIC→PDF 工具添加 Google Drive 和 OneDrive 双向云盘集成（导入/导出）

**Architecture:** 将 Dropbox 已验证的 PKCE OAuth 流程提取为通用 `cloud/oauth-core.ts`，每个 provider 只写 API 适配代码。分三阶段：抽象层重构 → Google Drive → OneDrive。

**Tech Stack:** PKCE OAuth, Dropbox API v2, Google Drive API v3, Microsoft Graph API, Google Picker, OneDrive File Picker

---

## 文件总览

### 新建文件

| 文件 | 职责 |
|------|------|
| `src/lib/cloud/types.ts` | OAuth 共享类型定义 |
| `src/lib/cloud/oauth-core.ts` | PKCE 生成、popup 管理、token 管理通用工具 |
| `src/lib/cloud/dropbox/config.ts` | Dropbox OAuth 端点配置 |
| `src/lib/cloud/dropbox/auth.ts` | Dropbox OAuth 薄适配层 |
| `src/lib/cloud/google-drive/config.ts` | Google Drive OAuth 配置 |
| `src/lib/cloud/google-drive/auth.ts` | Google Drive OAuth 适配 |
| `src/lib/cloud/google-drive/utils.ts` | Google Drive 上传 + Picker 导入 |
| `src/lib/cloud/onedrive/config.ts` | OneDrive OAuth 配置 |
| `src/lib/cloud/onedrive/auth.ts` | OneDrive OAuth 适配 |
| `src/lib/cloud/onedrive/utils.ts` | OneDrive 上传 + Picker 导入 |
| `src/app/auth/google/callback/page.tsx` | Google OAuth 回调 |
| `src/app/auth/onedrive/callback/page.tsx` | OneDrive OAuth 回调 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/lib/dropbox-auth.ts` | 移除旧 auth 函数，改用 cloud 层 |
| `src/lib/dropbox-utils.ts` | 更新 import 路径 |
| `src/app/auth/dropbox/callback/page.tsx` | 更新 import 路径 |
| `.env.local` | 添加 GOOGLE_CLIENT_ID / ONEDRIVE_CLIENT_ID |
| `messages/en.json` | 添加 6 个翻译键 |
| `src/components/DropZone.tsx` | 添加 Google Drive + OneDrive 菜单项 |
| `src/components/EditorOverlay.tsx` | 添加 Google Drive + OneDrive 菜单项 |
| `src/components/CompletePage.tsx` | 添加 Google Drive + OneDrive 保存 + 状态 |

---

## 阶段一：抽象层 + Dropbox 重构

### Task 1.1: 创建共享类型定义 (`src/lib/cloud/types.ts`)

```typescript
export interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  refreshUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  storagePrefix: string;
  tokenLifetimeMs: number;
}

export interface TokenStore {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

export interface CloudAuthAdapter {
  authorize(): Promise<boolean>;
  handleCallback(): Promise<boolean>;
  getAccessToken(): Promise<string | null>;
  clearTokens(): void;
}
```

### Task 1.2: 创建通用 OAuth 核心 (`src/lib/cloud/oauth-core.ts`)

- `base64url()` — ArrayBuffer → base64url string
- `generatePKCE()` — 返回 `{ state, codeVerifier, codeChallenge }`
- `openOAuthPopup(url, eventType)` — 弹窗 + postMessage + 关闭检测
- `notifyOpener(type, success)` — 回调页通知父窗口
- `createTokenManager(prefix)` — 返回 token CRUD + `exchangeCode()` + `refreshAccessToken()` + `getValidAccessToken()`

### Task 1.3: Dropbox 配置 (`src/lib/cloud/dropbox/config.ts`)

```typescript
export const dropboxConfig: OAuthConfig = {
  authUrl: "https://www.dropbox.com/oauth2/authorize",
  tokenUrl: "https://api.dropbox.com/oauth2/token",
  refreshUrl: "https://api.dropbox.com/oauth2/token",
  clientId: process.env.NEXT_PUBLIC_DROPBOX_APP_KEY || "",
  redirectUri: `${location.origin}/auth/dropbox/callback`,
  scope: "",
  storagePrefix: "dropbox_",
  tokenLifetimeMs: 14400000,
};
```

### Task 1.4: Dropbox 适配 auth (`src/lib/cloud/dropbox/auth.ts`)

薄适配层，实现 `CloudAuthAdapter` 接口，调用 `oauth-core` 的函数。

### Task 1.5: 重构现有 Dropbox 文件

- `dropbox-auth.ts` → 保留 `uploadToDropbox()`，移除旧的 `authorizeDropbox()`/`handleDropboxCallback()`/`getAccessToken()`/`refreshAccessToken()`，改用 `cloud/dropbox/auth`
- `dropbox-utils.ts` → `saveToDropbox()` 改用新 auth 层
- `callback/page.tsx` → import `cloud/dropbox/auth`

---

## 阶段二：Google Drive 集成

### Task 2.1-2.4: Google Drive 文件（config + auth + utils + callback）

OAuth 关键参数：
- `redirect_uri` 额外添加 `access_type=offline&prompt=consent`（确保获取 refresh_token）
- Google 作用域: `https://www.googleapis.com/auth/drive.file`
- 上传: multipart (metadata JSON + file blob) → `www.googleapis.com/upload/drive/v3/files?uploadType=multipart`

**注意**：Google Picker 导入需要 API Key 和额外配置，MVP 先实现导出（上传）功能，导入留 Picker SDK 集成代码框架（功能未激活时返回空数组）。

### Task 2.5: 环境变量

`.env.local` 添加：
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### Task 2.6: 翻译键

| 键 | 值 |
|---|----|
| `hero.dropzone.fromGoogleDrive` | "From Google Drive" |
| `editor.fromGoogleDrive` | "From Google Drive" |
| `editor.complete.toGoogleDrive` | "Save to Google Drive" |

### Task 2.7-2.9: UI 集成

三处 Split Button 按 Device → Dropbox → Google Drive 顺序新增菜单项。CompletePage 中使用通用 `cloudStatus` 状态替代 Dropbox 独有状态：

```typescript
const [cloudStatus, setCloudStatus] = useState<{
  provider: string;
  status: "idle" | "authorizing" | "uploading" | "success" | "error";
}>({ provider: "", status: "idle" });
```

---

## 阶段三：OneDrive 集成

### Task 3.1-3.4: OneDrive 文件（config + auth + utils + callback）

- 作用域需 `offline_access`（Microsoft 必需） + `Files.ReadWrite.All`
- 上传: PUT raw body → `graph.microsoft.com/v1.0/me/drive/root:/{filename}:/content`
- 配置与 Google Drive 同模式

### Task 3.5: 环境变量 — `NEXT_PUBLIC_ONEDRIVE_CLIENT_ID`

### Task 3.6: 翻译键 — 对称的 3 个 key

### Task 3.7: UI 集成 — 三个组件各加一条菜单项

最终 Split Button 菜单顺序：Device → Dropbox → Google Drive → OneDrive

---

## 验证

1. **每个阶段结束时**: `npm run build` 保证无编译错误
2. **UI 验证**: 启动 dev server，确认三组件中新增菜单项可见
3. **回调路由**: 访问 `/auth/google/callback` 和 `/auth/onedrive/callback` 确认不返回 404
4. **Google OAuth 端到端**: 配置有效 Client ID 后，测试授权弹窗 + 上传到 Google Drive
5. **OneDrive OAuth 端到端**: 配置有效 Client ID 后，测试授权弹窗 + 上传到 OneDrive
