# Gemini Primer++ 容错与边界条件审查报告

**审查日期**: 2026-02-23
**版本**: v10.11
**审查范围**: src/ 所有 .js 文件 (20 个文件)

---

## 审查清单

- [x] DOM 查询失败时的 null 检查
- [x] Gemini 页面结构变化时的容错能力
- [x] 用户快速操作的竞态保护
- [x] visibilitychange 事件处理
- [x] 极端数据量下的行为
- [x] Tampermonkey 初始化延迟
- [x] JSON.parse 异常处理
- [x] 数组操作前的验证
- [x] 对象属性访问的安全性

---

## 发现的问题

### P0 级（会导致脚本崩溃）

#### 1. counter.js:51-52 - GM_getValue 缺少 try-catch
**文件**: `src/modules/counter.js:51-52`
**问题**:
```javascript
this.resetHour = GM_getValue(GLOBAL_KEYS.RESET_HOUR, 0);
this.quotaLimit = GM_getValue(GLOBAL_KEYS.QUOTA, 50);
```
**影响**: init() 时脚本崩溃（Tampermonkey 初始化延迟）
**修复**: 添加 try-catch 包装

---

#### 2. counter.js:138 - GM_getValue 缺少 try-catch
**文件**: `src/modules/counter.js:138`
**问题**:
```javascript
const savedData = GM_getValue(storageKey, null);
```
**影响**: loadDataForUser() 时脚本崩溃
**修复**: 添加 try-catch 包装

---

#### 3. default_model.js:22 - GM_getValue 缺少 try-catch
**文件**: `src/modules/default_model.js:22`
**问题**:
```javascript
this._preferredModel = GM_getValue(this.STORAGE_KEY, 'pro');
```
**影响**: 模块初始化失败
**修复**: 添加 try-catch 包装

---

#### 4. prompt_vault.js:25 - GM_getValue 缺少 try-catch
**文件**: `src/modules/prompt_vault.js:25`
**问题**:
```javascript
this._prompts = GM_getValue(this._getStorageKey(), []);
```
**影响**: 模块初始化失败
**修复**: 添加 try-catch 包装

---

### P1 级（功能异常）

#### 1. batch_delete.js:199-201 - querySelector 返回 null 时无检查
**文件**: `src/modules/batch_delete.js:199-201`
**问题**:
```javascript
const dialog = document.querySelector('mat-dialog-container, .mdc-dialog, [role="dialog"], [role="alertdialog"]');
const confirmBtns = scope.querySelectorAll(...)  // scope 可能为 null
```
**影响**: 如果 dialog 为 null，scope.querySelectorAll() 会崩溃
**修复**: 添加 null 检查

---

#### 2. batch_delete.js:65 - sidebar 为 null 时无检查
**文件**: `src/modules/batch_delete.js:65`
**问题**:
```javascript
const overflowC = sidebar.querySelector('.overflow-container') || sidebar;
overflowC.prepend(toolbar);  // 如果 sidebar 为 null，会崩溃
```
**影响**: injectNativeUI() 失败
**修复**: 添加 sidebar 的 null 检查

---

#### 3. folders.js:99 - sidebar 为 null 时无检查
**文件**: `src/modules/folders.js:99`
**问题**:
```javascript
const overflowC = sidebar.querySelector('.overflow-container') || sidebar;
overflowC.prepend(filterBar);  // 如果 sidebar 为 null，会崩溃
```
**影响**: injectNativeUI() 失败
**修复**: 添加 sidebar 的 null 检查

---

#### 4. main.js:63 - JSON.parse 缺少 try-catch
**文件**: `src/main.js:63`
**问题**:
```javascript
guestState = JSON.parse(JSON.stringify(CounterModule.state));
```
**影响**: 如果 state 包含不可序列化的对象，会崩溃
**修复**: 添加 try-catch 包装

---

#### 5. counter.js:138-143 - 数据验证缺失
**文件**: `src/modules/counter.js:138-143`
**问题**:
```javascript
const savedData = GM_getValue(storageKey, null);
if (savedData) {
    this.state.total = savedData.total || 0;
    this.state.chats = savedData.chats || {};
}
```
**影响**: 如果 savedData 是字符串或其他类型，会导致属性访问失败
**修复**: 添加类型检查 `typeof savedData === 'object' && savedData !== null`

---

#### 6. main.js:78-100 - 数据合并时缺少类型检查
**文件**: `src/main.js:78-100`
**问题**:
```javascript
cm.state.dailyCounts[day].messages += counts.messages;
cm.state.dailyCounts[day].chats += counts.chats;
```
**影响**: 如果 counts.messages/chats 不是数字，会导致 NaN
**修复**: 添加类型检查和默认值

---

### P2 级（体验问题）

#### 1. main.js:215-226 - visibilitychange 处理不完整
**文件**: `src/main.js:215-226`
**问题**:
```javascript
if (getInspectingUser() && ModuleRegistry.isEnabled('counter')) {
    CounterModule.loadDataForUser(getInspectingUser());
}
```
**问题**: 没有检查 getInspectingUser() 是否为 null/TEMP_USER
**修复**: 添加防御性检查

---

#### 2. folders.js - 极端数据量处理
**文件**: `src/modules/folders.js`
**问题**: 没有检查文件夹/聊天数量上限，大量 DOM 操作可能卡顿
**影响**: 数千条聊天记录时性能下降
**建议**: 添加虚拟滚动或分页

---

#### 3. counter.js:82-90 - bindEvents() 重复调用保护
**文件**: `src/modules/counter.js:82-90`
**问题**:
```javascript
if (this._boundKeyHandler && this._boundClickHandler) return;
if (this._boundKeyHandler) {
    document.removeEventListener('keydown', this._boundKeyHandler, true);
}
```
**问题**: 逻辑冗余，第一个 if 已返回，后续代码不会执行
**修复**: 简化逻辑

---

## 修复优先级

### 立即修复（P0 - 脚本崩溃）
1. counter.js:51-52 - GM_getValue try-catch
2. counter.js:138 - GM_getValue try-catch
3. default_model.js:22 - GM_getValue try-catch
4. prompt_vault.js:25 - GM_getValue try-catch

### 高优先级（P1 - 功能异常）
1. batch_delete.js:199-201 - dialog null 检查
2. batch_delete.js:65 - sidebar null 检查
3. folders.js:99 - sidebar null 检查
4. main.js:63 - JSON.parse try-catch
5. counter.js:138-143 - 数据类型验证
6. main.js:78-100 - 数据合并类型检查

### 改进建议（P2 - 体验优化）
1. main.js:215-226 - visibilitychange 防御性检查
2. folders.js - 大数据量处理
3. counter.js:82-90 - 逻辑简化

---

## 测试建议

1. **Tampermonkey 延迟**: 模拟 GM_* API 延迟可用
2. **页面结构变化**: 测试 Gemini UI 更新时的容错
3. **快速切换模块**: 连续启用/禁用模块
4. **大数据量**: 创建数千条聊天记录
5. **网络中断**: 测试 visibilitychange 恢复
