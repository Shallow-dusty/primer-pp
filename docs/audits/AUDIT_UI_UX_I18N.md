# UI/UX 与 i18n 审查报告

**审查日期**: 2026-02-23
**审查员**: ui-auditor
**项目**: Gemini Primer++ v10.11

---

## 执行摘要

本次审查覆盖以下方面：
1. 国际化（i18n）- 硬编码字符串检查
2. 键盘可访问性 - ESC 关闭、焦点管理
3. 主题系统 - CSS 变量应用
4. z-index 层级 - 模态框和面板
5. 拖拽边界 - 面板位置检查
6. CSP 合规性 - SVG 图标安全性
7. 视觉反馈 - 按钮状态

---

## P0 问题（严重）

### 1. 硬编码英文字符串未国际化 - panel_ui.js

| 行号 | 字符串 | 建议修复 |
|------|--------|---------|
| 554 | `'Today'` | `NativeUI.t('今天', 'Today')` |
| 571 | `'Reset Today'` | `NativeUI.t('重置今天', 'Reset Today')` |
| 702 | `'Waiting for login...'` | `NativeUI.t('等待登录...', 'Waiting for login...')` |
| 721 | `'ME'` | `NativeUI.t('我', 'ME')` |
| 763 | `"Settings"` (title) | `NativeUI.t('设置', 'Settings')` |
| 843 | `'Account Tier'` (title) | `NativeUI.t('账户等级', 'Account Tier')` |
| 849 | `"Viewing other user (Read Only)"` | `NativeUI.t('查看其他用户（只读）', 'Viewing other user (Read Only)')` |
| 852 | `"Active User"` | `NativeUI.t('活跃用户', 'Active User')` |
| 919 | `"View Only"` | `NativeUI.t('仅查看', 'View Only')` |
| 1135 | `'Daily Reset'` | `NativeUI.t('每日重置', 'Daily Reset')` |
| 1142 | `'Reset Hour'` | `NativeUI.t('重置时间', 'Reset Hour')` |
| 1167 | `'Daily Quota'` | `NativeUI.t('每日配额', 'Daily Quota')` |
| 1174 | `'Message Limit'` | `NativeUI.t('消息限制', 'Message Limit')` |
| 1201 | `'Usage History (Last 7 Days)'` | `NativeUI.t('使用历史（最近7天）', 'Usage History (Last 7 Days)')` |
| 1278 | `'Data'` | `NativeUI.t('数据', 'Data')` |

**影响**: 中文用户无法看到这些 UI 文本的中文翻译

---

### 2. 模态框缺少 ESC 关闭处理

**已正确实现** ✓
- Settings 模态框 (行 1022-1046)

**缺少实现** ❌
- Dashboard 模态框 (行 ~1400)
- Debug 模态框 (行 ~1600)
- Calibration 模态框 (行 ~1800)

**修复模式**（参考 Settings 模态框）:
```javascript
const escHandler = (e) => { if (e.key === 'Escape') closeOverlay(); };
document.addEventListener('keydown', escHandler);
const closeOverlay = () => {
  document.removeEventListener('keydown', escHandler);
  overlay.remove();
};
overlay.onclick = (e) => { if (e.target === overlay) closeOverlay(); };
```

---

## P1 问题（重要）

### 1. 模态框缺少焦点陷阱（Focus Trap）

**问题**: 打开模态框时，用户可以用 Tab 键跳出模态框到背景页面

**影响范围**:
- Settings 模态框
- Dashboard 模态框
- Debug 模态框
- Calibration 模态框
- Onboarding 模态框

**修复方案**:
```javascript
const focusableElements = modal.querySelectorAll(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
);
const firstElement = focusableElements[0];
const lastElement = focusableElements[focusableElements.length - 1];

modal.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  if (e.shiftKey) {
    if (document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    }
  } else {
    if (document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
});
```

### 2. 所有按钮缺少 :focus-visible 状态

**问题**: 键盘用户无法看到焦点指示器

**影响范围**:
- `.g-btn` (行 179-188)
- `.settings-btn` (行 233-239)
- `.settings-select` (行 229-232)
- 所有 `<button>` 元素

**修复方案** - 在 CSS 中添加:
```css
.g-btn:focus-visible,
.settings-btn:focus-visible,
.settings-select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

---

## P2 问题（轻微）

### 1. 缺少 prefers-reduced-motion 支持

**问题**: 用户启用"减少动画"系统设置时，动画仍然播放

**影响范围**:
- 模态框进入/退出动画 (行 191-198)
- 面板 hover 动画 (行 69-72)
- 数字 bump 动画 (行 118-125)

**修复方案**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 2. Settings 按钮过小

**问题**: 行 762 的 Settings 按钮宽度仅 32px，不符合移动设备无障碍标准（最小 44x44px）

**修复方案**:
```javascript
settingsBtn.style.width = '44px';
settingsBtn.style.height = '32px';
settingsBtn.style.minWidth = '44px';
```

### 3. 颜色对比度需验证

**问题**: Glass 主题的 `--text-main: '#a8c7fa'` 在某些背景上可能不符合 WCAG AA 标准

**建议**: 使用 WebAIM 对比度检查器验证所有主题的文本颜色

---

## 通过项目 ✓

### 1. CSP 合规性 - icons.js

- 使用 `createElementNS('http://www.w3.org/2000/svg', ...)` ✓
- 所有图标使用 stroke-based 路径 ✓
- 无内联脚本或 eval ✓
- 无 `innerHTML` 使用 ✓

### 2. 主题系统 - constants.js

- 3 个完整主题定义（auto, glass, cyber, paper）✓
- 所有 CSS 变量正确应用 ✓
- 主题切换功能完整 ✓

### 3. 拖拽边界检查 - panel_ui.js (行 997-1000)

```javascript
if (nT < 10) nT = 10;                                    // 顶部
if (nL < 0) nL = 0;                                      // 左侧
if (nL + el.offsetWidth > window.innerWidth) nL = ...   // 右侧
if (nT + el.offsetHeight > window.innerHeight) nT = ... // 底部
```
✓ 完整覆盖所有边界

### 4. z-index 层级 - panel_ui.js

- 面板: `z-index: 2147483647` (行 59)
- 模态框 overlay: `z-index: 2147483646` (行 201, 246)
- 层级关系正确 ✓

### 5. 按钮视觉反馈

- `.g-btn:hover` ✓
- `.g-btn:active` ✓
- `.settings-btn:hover` ✓
- `.settings-btn:active` ✓

---

## 国际化检查结果

### 已正确国际化的模块

**batch_delete.js**:
- 行 54: `NativeUI.t('🗑️ 批量管理', '🗑️ Batch Manage')` ✓
- 行 93: `NativeUI.t('全选', 'Select All')` ✓
- 行 102: `NativeUI.t('取消', 'Cancel')` ✓
- 行 111: `NativeUI.t('已选 ' + count + ' 个', count + ' selected')` ✓
- 行 120: `NativeUI.t('🗑️ 删除', '🗑️ Delete')` ✓
- 行 122: `NativeUI.t('确认删除...', 'Delete ... conversation(s)?')` ✓

**folders.js**:
- 行 120: `NativeUI.t('全部', 'All')` ✓

### 需要国际化的模块

**panel_ui.js**: 15 处硬编码字符串（见 P0 表格）

---

## 修复优先级

| 优先级 | 问题 | 工作量 | 影响 |
|--------|------|--------|------|
| P0 | 硬编码字符串 | 低 | 高 - 国际化 |
| P0 | 模态框 ESC | 低 | 高 - 可用性 |
| P1 | 焦点陷阱 | 中 | 中 - 键盘导航 |
| P1 | :focus-visible | 低 | 中 - 无障碍 |
| P2 | prefers-reduced-motion | 低 | 低 - 用户体验 |
| P2 | 按钮大小 | 低 | 低 - 移动设备 |

---

## 建议行动

1. **立即修复** (v10.12):
   - [ ] 修复 panel_ui.js 的 15 处硬编码字符串
   - [ ] 为 Dashboard/Debug/Calibration 模态框添加 ESC 关闭

2. **尽快修复** (v10.13):
   - [ ] 为所有模态框添加焦点陷阱
   - [ ] 为所有按钮添加 :focus-visible 状态

3. **后续改进** (v10.14+):
   - [ ] 添加 prefers-reduced-motion 支持
   - [ ] 验证颜色对比度
   - [ ] 增加按钮最小尺寸

---

## 审查清单

- [x] 所有用户可见文本国际化检查
- [x] 硬编码字符串搜索
- [x] 模态框键盘可访问性
- [x] 焦点管理检查
- [x] 主题切换覆盖
- [x] z-index 层级关系
- [x] 拖拽边界检查
- [x] CSP 合规性验证
- [x] 按钮视觉反馈
- [x] SVG 图标安全性

---

**报告完成**: 2026-02-23 17:36:49 UTC
