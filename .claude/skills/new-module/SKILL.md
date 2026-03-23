---
name: new-module
description: 在 src/modules/ 下创建新的功能模块，遵循 ModuleRegistry 接口规范
---

# New Module Scaffold

用户通过 `/new-module <module-name>` 调用（如 `/new-module keyboard_shortcuts`）。

## 模块接口规范

每个模块必须导出一个对象，实现以下接口：

```js
export const XxxModule = {
    id: 'kebab-case-id',          // 唯一标识，用于存储和注册
    name: NativeUI.t('中文名', 'English Name'),
    description: NativeUI.t('中文描述', 'English description'),
    icon: '🔧',                   // emoji 图标
    defaultEnabled: false,         // 是否默认启用

    init() { },                    // 模块启用时调用，注册事件/DOM watcher
    destroy() { },                 // 模块禁用时调用，清理所有副作用
    onUserChange() { },            // 用户切换时调用（可选）
    // tick() { },                 // 主循环每 1500ms 调用一次（可选，仅轮询型模块需要）
};
```

## 执行步骤

1. **创建模块文件** `src/modules/<name>.js`，按上述模板生成
2. **注册模块**：在 `src/main.js` 中：
   - 添加 import 语句（与其他模块 import 放在一起）
   - 添加 `ModuleRegistry.register(XxxModule);`（与其他注册放在一起）
3. **提示后续**：告知用户还需要做什么（如添加 CSS 样式、配置存储 key 等）

## 关键约定

- 导入路径使用相对路径 `'../constants.js'`、`'../logger.js'`、`'../native_ui.js'`
- 所有 GM_* 调用包裹 try-catch
- DOM 事件监听必须在 `destroy()` 中移除
- 如需新的存储 key，在 `src/constants.js` 的 `GLOBAL_KEYS` 中注册
- 使用 `Logger.info/warn/debug` 记录关键操作
- 使用 `NativeUI.t(zh, en)` 实现双语
- 如需 MutationObserver，通过 `DOMWatcher` 注册而非自建

## 参考

参考 `src/modules/quote_reply.js`（最简模块，155 行）了解完整模式。
