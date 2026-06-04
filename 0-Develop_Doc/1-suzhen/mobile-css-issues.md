# 移动端 CSS 适配问题排查报告

> 排查时间：2026-06-04
> 排查人：素贞

---

## 问题现象

| 页面 | 现象 |
|------|------|
| 博客文章页 | 内容宽度比手机屏幕窄，左右留白过多 |
| Privacy 页面 | 页面可左右滑动，未锁定 |
| Terms 页面 | 页面可左右滑动，未锁定 |

---

## 问题 1：博客文章页面宽度问题

### 根本原因

`.blog-article-layout` 在移动端（640px 以下）没有正确设置为单列布局。

### CSS 问题定位

**文件：** `src/app/globals.css`

```css
/* 桌面端 - 4 列布局 */
.blog-article-layout {
  display: grid;
  grid-template-columns: 1fr minmax(0, var(--blog-content-w)) minmax(0, 300px) 1fr;
  grid-template-areas: ". main sidebar .";
  gap: 48px;
  padding: 0 24px;
}
/* var(--blog-content-w) = 680px */
```

```css
/* @media (max-width: 900px) - 3 列布局 */
@media (max-width: 900px) {
  .blog-article-layout {
    grid-template-columns: 1fr minmax(0, var(--blog-content-w)) 1fr;
    grid-template-areas: ". main .";
  }
  /* 仍然使用 680px，在平板上可能还行，但在手机上超出 */
}
```

```css
/* @media (max-width: 640px) - ❌ 只有 padding，没有 grid 设置！ */
@media (max-width: 640px) {
  .blog-article-layout {
    padding: 0 16px;
    /* ❌ 缺少 grid-template-columns: 1fr */
    /* ❌ 缺少 grid-template-areas: "main" */
  }
}
```

### 修复方案

在 `@media (max-width: 640px)` 中添加：

```css
.blog-article-layout {
  grid-template-columns: 1fr;
  grid-template-areas: "main";
  padding: 0 16px;
}
```

---

## 问题 2：Privacy / Terms 页面可左右滑动

### 根本原因

1. `html` 和 `body` 没有设置 `overflow-x: hidden`
2. 表格内容可能超出 720px 容器宽度

### CSS 问题定位

**文件：** `src/app/globals.css`

```css
/* 当前 html 设置 */
html {
  scroll-behavior: smooth;
  /* ❌ 缺少 overflow-x: hidden */
}

/* 当前 body 设置 */
body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
  /* ❌ 缺少 overflow-x: hidden */
}

/* 表格可能溢出 */
.policy-body .data-table {
  width: 100%;
  /* 如果内容太长，会超出 720px 容器 */
}
```

### 修复方案

**1. 全局防止横向滚动：**

```css
html {
  scroll-behavior: smooth;
  overflow-x: hidden;
}

body {
  overflow-x: hidden;
}
```

**2. 表格响应式处理：**

```css
.policy-body .data-table {
  display: block;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
```

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `src/app/globals.css` | 全局样式，需修改 |
| `src/app/[locale]/privacy/page.tsx` | Privacy 页面组件 |
| `src/app/[locale]/terms/page.tsx` | Terms 页面组件 |
| `src/components/blog/BlogArticleShell.tsx` | 博客文章外壳组件 |

---

## 优先级

⭐⭐⭐ 高优先级 — 影响移动端用户体验

---

## 状态

- [ ] 待修复
