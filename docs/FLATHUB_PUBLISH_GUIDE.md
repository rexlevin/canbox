# Canbox 发布到 Flathub 完整指南

本指南说明如何将 Canbox 发布到 Flathub，同时保持源代码私有。

---

## 仓库说明

- **源代码仓库（私有）**：`canbox` - 包含 Canbox 的源代码
- **Flatpak 仓库（公开）**：`canbox-flatpak` - 包含 Flatpak manifest 和构建文件

---

## 步骤 1：构建 Canbox 并创建发布包

在 `canbox` 目录下执行：

```bash
cd /depot/cargo/canbox
npm run build
```

这将创建 `dist/linux-unpacked` 目录。

然后创建 tar.gz 压缩包：

```bash
cd dist
tar czf canbox-linux-x64-0.1.0.tar.gz linux-unpacked
sha256sum canbox-linux-x64-0.1.0.tar.gz
```

**记录下 sha256sum 的输出值，后面需要用到。**

---

## 步骤 2：上传构建产物到 GitHub Releases

1. 访问 https://github.com/rexlevin/canbox-flatpak/releases（注意：这里是 canbox-flatpak 仓库）
2. 点击 "Draft a new release"
3. 填写版本信息：
   - Tag: `0.1.0`
   - Release title: `Canbox 0.1.0`
   - Description: 描述你的版本更新
4. 上传 `canbox-linux-x64-0.1.0.tar.gz` 文件
5. 点击 "Publish release"

**重要说明**：由于 canbox 源代码仓库是私有的，不能将二进制文件上传到私有仓库的 Releases（外部无法访问）。需要将二进制文件上传到公开的 canbox-flatpak 仓库的 Releases。

---

## 步骤 3：复制必要文件到 canbox-flatpak

手动复制以下文件到 `canbox-flatpak` 目录：

```bash
# 复制图标
cp /depot/cargo/canbox/logo_512x512.png /depot/cargo/canbox-flatpak/
cp /depot/cargo/canbox/logo_256x256.png /depot/cargo/canbox-flatpak/
cp /depot/cargo/canbox/logo_128x128.png /depot/cargo/canbox-flatpak/
```

---

## 步骤 4：计算所有文件的 SHA256

在 `canbox-flatpak` 目录下执行：

```bash
cd /depot/cargo/canbox-flatpak

# 计算 logo 文件的 SHA256
sha256sum logo_512x512.png
sha256sum logo_256x256.png
sha256sum logo_128x128.png

# 计算 tar.gz 包的 SHA256
sha256sum /depot/cargo/canbox/dist/canbox-linux-x64-0.1.0.tar.gz
```

**记录下所有 sha256sum 的输出值。**

---

## 步骤 5：更新 manifest 文件

编辑 `com.github.lizl6.canbox.json`，替换以下内容：

1. **替换 `rexlevin`** 为你的 GitHub 用户名（需要替换 3 处）
2. **替换所有 `REPLACE_WITH_ACTUAL_SHA256`** 为实际计算的 SHA256 值（4 个文件：tar.gz 包 + 3 个 logo 文件）

示例：

```json
{
  "type": "archive",
  "url": "https://github.com/rexlevin/canbox-flatpak/releases/download/v0.1.0/canbox-linux-x64-0.1.0.tar.gz",
  "sha256": "a1b2c3d4e5f6...",  // 替换为实际的 tar.gz 的 SHA256
  "dest": "canbox-src"
}
```

---

## 步骤 6：添加应用截图

1. 准备 2-3 张 Canbox 的应用截图
2. 建议尺寸：1280x720 或 1920x1080
3. 格式：PNG
4. 将截图保存到 `appstream/screenshots/` 目录：

   ```
   appstream/screenshots/screenshot-1.png
   appstream/screenshots/screenshot-2.png
   ```
5. 更新 `com.github.lizl6.canbox.metainfo.xml`：

```xml
<screenshots>
  <screenshot type="default">
    <image>https://raw.githubusercontent.com/rexlevin/canbox-flatpak/main/appstream/screenshots/screenshot-1.png</image>
    <caption>Canbox main interface</caption>
  </screenshot>
</screenshots>
```

同时替换 `metainfo.xml` 中的所有 `rexlevin` 为你的 GitHub 用户名。

---

## 步骤 7：更新 README.md

编辑 `README.md`，替换以下内容：

- `rexlevin` → 你的 GitHub 用户名（3 处）
- 更新仓库描述和链接

---

## 步骤 8：提交并推送到 GitHub

```bash
cd /depot/cargo/canbox-flatpak
git add .
git commit -m "Initial Flatpak manifest for Canbox 0.1.0"
git push origin main
```

---

## 步骤 9：提交到 Flathub

1. 访问 https://flathub.org/
2. 点击右上角的 "Login" 登录你的 GitHub 账号
3. 点击 "Upload your app"
4. 授权 Flathub 访问你的 GitHub 仓库
5. 选择 `canbox-flatpak` 仓库
6. Flathub 会自动检测 `com.github.lizl6.canbox.json` 文件
7. 填写应用信息：
   - 应用描述
   - 截图（会自动从 appstream 读取）
   - 分类
8. 提交审核

---

## 步骤 10：等待审核

- Flathub 审核通常需要 1-3 天
- 审核通过后，用户可以通过以下命令安装：
  ```bash
  flatpak install flathub com.github.lizl6.canbox
  ```

---

## 检查清单

在提交前，确保以下事项已完成：

- [ ] 已构建 canbox 并创建 tar.gz 包
- [ ] 已上传 tar.gz 到 GitHub Releases（canbox-flatpak 仓库）
- [ ] 已复制所有 logo 文件到 canbox-flatpak
- [ ] 已计算所有文件的 SHA256 值（tar.gz 包 + 3 个 logo 文件）
- [ ] 已更新 JSON manifest 中的所有 URL（rexlevin，3 处）
- [ ] 已更新 JSON manifest 中的所有 SHA256 值（4 个文件）
- [ ] 已添加应用截图到 appstream/screenshots/
- [ ] 已更新 metainfo.xml 中的截图 URL
- [ ] 已更新 metainfo.xml 中的所有 URL（rexlevin）
- [ ] 已更新 README.md 中的所有 URL（rexlevin）
- [ ] 已提交并推送到 GitHub

---

## 常见问题

### Q: 可以保持源代码私有吗？

A: 可以。只需要公开 Flatpak manifest 仓库（canbox-flatpak）和构建产物（通过 GitHub Releases）。

### Q: 每次更新版本需要做什么？

A: 需要：

1. 构建新版本的 canbox
2. 上传新的 tar.gz 到 GitHub Releases（canbox-flatpak 仓库）
3. 更新 JSON manifest 中的版本号和 URL
4. 更新 metainfo.xml 中的 release 信息

### Q: GitHub Actions 有什么用？

A: GitHub Actions 会自动构建 Flatpak 包并创建 artifact，方便测试构建是否成功。

---

## 文件结构说明

```
canbox-flatpak/
├── .github/
│   └── workflows/
│       └── flatpak.yml                    # CI/CD 工作流
├── appstream/
│   └── screenshots/
│       └── screenshot-1.png                 # 应用截图
├── logo_128x128.png                      # 图标文件
├── logo_256x256.png                      # 图标文件
├── logo_512x512.png                      # 图标文件
├── com.github.lizl6.canbox.json          # Flatpak manifest（主要）
├── com.github.lizl6.canbox.metainfo.xml  # 应用元数据
├── README.md                             # 仓库说明
└── .gitignore                            # Git 忽略规则
```

---

## 参考资源

- [Flathub 官网](https://flathub.org/)
- [Flatpak 官方文档](https://docs.flatpak.org/)
- [Flathub 应用提交指南](https://docs.flathub.org/docs/for-app-authors/submission/)
