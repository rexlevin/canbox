# Release Workflow 使用指南

## 发布流程

发布新版本前，需按以下步骤操作：

### Step 1: 更新 CHANGELOG.md

在 `CHANGELOG.md` 顶部添加新版本条目：

```markdown
## [v{x}.{y}.{z}] - YYYY-MM-DD

### feat
- 新功能描述

### fix
- 修复描述
```

### Step 2: 提交更改

```bash
git add CHANGELOG.md
git commit -m "chore: 更新 CHANGELOG.md"
git push
```

### Step 3: 打 Tag 并推送

```bash
git tag v{x}.{y}.{z}
git push origin v{x}.{y}.{z}
```

推送 tag 后自动触发 GitHub Actions 构建。

---

## GitHub Release 页面

当 tag 推送后，GitHub Actions 会自动：
1. 构建各平台安装包
2. 创建 GitHub Release 页面

**注意**：GitHub Release 的 title 和 note 内容需要在 GitHub 网页上手动编辑，或确保 CHANGELOG.md 格式正确。

---

## 触发方式

### 方式一：推送 Tag（自动构建所有平台）

```bash
git tag v0.4.0
git push origin v0.4.0
```

自动触发 GitHub Actions，构建 Linux 和 Windows 两个平台。

---

### 方式二：手动触发（可选择平台）

不需要推送任何东西，直接在 GitHub 网页操作：

1. 进入仓库 → **Actions** 标签
2. 左侧选择 **Release** workflow
3. 点击右侧 **"Run workflow"** 按钮
4. 弹出框选择构建平台：

| 选项        | 说明                  |
| ----------- | --------------------- |
| `all`     | 构建所有平台（默认）  |
| `linux`   | 仅构建 Linux AppImage |
| `windows` | 仅构建 Windows exe    |
| `darwin`  | 仅构建 macOS dmg      |

5. 点击绿色 **"Run workflow"**

---

## 平台选择场景

| 场景               | 推荐方式                   |
| ------------------ | -------------------------- |
| 正式发布（多平台） | 推送 tag，自动构建         |
| 仅修复 Windows bug | 手动触发，选择 `windows` |
| 仅修复 Linux bug   | 手动触发，选择 `linux`   |
| 测试构建           | 手动触发，选择对应平台     |

---

## 构建产物

### Linux (AppImage)

| 文件                             | 说明               |
| -------------------------------- | ------------------ |
| `canbox-linux-x86_64.AppImage` | Linux 安装包       |
| `latest-linux.yml`             | Linux 更新信息文件 |

### Windows (NSIS)

| 文件                            | 说明                   |
| ------------------------------- | ---------------------- |
| `canbox-win-x64.exe`          | Windows 安装包         |
| `canbox-win-x64.exe.blockmap` | Windows 增量更新元数据 |
| `latest.yml`                  | Windows 更新信息文件   |

### 平台判断

当前 workflow 已配置 Linux 和 Windows 两个平台构建。
