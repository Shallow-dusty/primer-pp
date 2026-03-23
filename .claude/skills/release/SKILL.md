---
name: release
description: 发布新版本 — 同步更新所有版本号、运行测试、构建产物、更新 CHANGELOG、创建 git commit + tag
---

# Release Workflow

用户通过 `/release <version>` 调用（如 `/release 11.1`）。

## 版本号位置（全部需要同步更新）

1. `src/constants.js` → `export const VERSION = '<version>';`
2. `src/meta.txt` → `@name` 行中的 `(v<version>)` 和 `@version <version>`
3. `src/main.js` → 顶部注释 `v<version>`
4. `src/platforms/extension/manifest.json` → `"version": "<version>"`

## 执行步骤

1. **验证参数**：确认提供了版本号，格式为 semver（如 `11.1` 或 `11.1.0`）
2. **更新版本号**：按上述 4 个位置逐一替换
3. **运行测试**：`npm test` — 必须全部通过（100% 覆盖率）
4. **构建**：`npm run build` — 生成 userscript + extension
5. **更新 CHANGELOG**：在 `CHANGELOG.md` 顶部添加新版本条目，包含本次变更摘要（从 git log 获取自上个 tag 以来的提交）
6. **Git 提交**：提交所有变更，消息格式 `bump: v<version> — <简短描述>`
7. **创建 Tag**：`git tag v<version>`
8. **不推送**：等待用户确认后再 push

## 注意事项

- 如果测试或构建失败，立即停止并报告
- 不要修改 `package.json` 的 version（该项目不使用 npm publish）
- 构建产物 `primer-pp.user.js` 和 `dist/` 需要包含在 commit 中（它们是分发文件）
