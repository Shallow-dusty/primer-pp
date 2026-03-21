# GeminiCounterPro 全功能开发计划

> **文档版本**: v1.0
> **基准版本**: GeminiCounterPro v8.1 (Ultimate)
> **创建日期**: 2026-02-10
> **状态**: 待筛选（所有功能已列出，用户将进行筛选）

---

## 目录

- [一、现有功能清单](#一现有功能清单)
- [二、功能开发计划](#二功能开发计划)
  - [A. 布局与视觉增强](#a-布局与视觉增强)
  - [B. 对话管理增强](#b-对话管理增强)
  - [C. 搜索功能](#c-搜索功能)
  - [D. 导出功能增强](#d-导出功能增强)
  - [E. 提示词管理](#e-提示词管理)
  - [F. 主题与外观增强](#f-主题与外观增强)
  - [G. 模型管理增强](#g-模型管理增强)
  - [H. 对话存档与备份](#h-对话存档与备份)
  - [I. 快捷操作与效率工具](#i-快捷操作与效率工具)
  - [J. 数据分析增强](#j-数据分析增强)
  - [K. 国际化 (i18n)](#k-国际化-i18n)
  - [L. 架构升级](#l-架构升级)
- [三、优先级矩阵](#三优先级矩阵)
- [四、技术约束与风险](#四技术约束与风险)

---

## 一、现有功能清单

以下为 GeminiCounterPro v8.1 Ultimate 已实现的功能，作为开发计划的基线参考：

| # | 功能 | 模块 | 状态 |
|---|------|------|------|
| 1 | 消息计数（Enter/点击检测，1秒冷却） | CounterModule | ✅ 已实现 |
| 2 | 模型检测（Flash/Thinking/Pro，多语言） | CounterModule | ✅ 已实现 |
| 3 | 加权配额追踪（Flash:0, Thinking:0.33, Pro:1） | CounterModule | ✅ 已实现 |
| 4 | 账户类型检测（Free/Pro/Ultra） | CounterModule | ✅ 已实现 |
| 5 | 连续使用天数（当前/最佳 Streak） | CounterModule | ✅ 已实现 |
| 6 | 多视图模式（今日/当前对话/总计/创建数） | CounterModule | ✅ 已实现 |
| 7 | 数据导出（JSON/CSV/Markdown） | ExportModule | ✅ 已实现 |
| 8 | 对话文件夹（创建/重命名/删除/颜色/拖放） | FoldersModule | ✅ 已实现 |
| 9 | 侧边栏彩色标记点 | FoldersModule | ✅ 已实现 |
| 10 | 多用户支持（邮箱检测/数据隔离/查看他人数据） | Core | ✅ 已实现 |
| 11 | 跨标签页同步（GM_addValueChangeListener） | Core | ✅ 已实现 |
| 12 | 三套主题（Glass/Cyber/Paper） | Core + PanelUI | ✅ 已实现 |
| 13 | 365天活动热力图 | PanelUI (Dashboard) | ✅ 已实现 |
| 14 | 数据校准（手动调整计数） | PanelUI | ✅ 已实现 |
| 15 | 调试系统（Logger + Debug面板 + 菜单命令） | Logger + PanelUI | ✅ 已实现 |
| 16 | 浮动面板（可拖拽/位置持久化） | PanelUI | ✅ 已实现 |
| 17 | 模块注册系统（启用/禁用/生命周期） | ModuleRegistry | ✅ 已实现 |
| 18 | Guest→用户数据合并 | Core | ✅ 已实现 |
| 19 | 每日重置时间配置（0-23时） | Core | ✅ 已实现 |
| 20 | 7天使用量SVG图表 | PanelUI (Settings) | ✅ 已实现 |

---

## 二、功能开发计划

### A. 布局与视觉增强

---

#### A-1. 加宽对话视图

**参考来源**: Wider Gemini（Chrome 扩展）、Gemini Enhancer（Chrome 扩展）
**开源参考**: 无（均为闭源扩展）

**功能描述**:
Gemini 网页版默认对话区域宽度约 700px，在宽屏显示器上浪费大量空间。此功能允许用户自定义对话区域宽度，提升阅读和代码审查体验。

- 提供宽度滑块控件，范围 700px ~ 1350px（或百分比 50%~95%）
- 预设快捷模式：窄（700px）、默认（原始）、宽（1000px）、超宽（1350px）
- 实时预览，拖动滑块即时生效，无需刷新页面
- 设置持久化，跨会话保留用户偏好

**技术方案**:

1. **DOM 目标识别**: 通过 CSS 选择器定位 Gemini 对话容器。Gemini 使用 `max-width` 限制对话宽度，需要找到对应的容器元素并覆盖其样式。候选选择器：
   - `.conversation-container` 或类似的对话包裹元素
   - 需要在运行时动态探测，因为 Gemini 的 DOM 结构可能随版本更新变化

2. **样式注入方式**: 使用 `GM_addStyle()` 注入一个带有 CSS 变量的规则：
   ```css
   :root { --gc-conversation-width: 700px; }
   .conversation-container { max-width: var(--gc-conversation-width) !important; }
   ```
   通过 JavaScript 修改 `document.documentElement.style.setProperty('--gc-conversation-width', value)` 实现动态调整。

3. **UI 控件**: 在现有 Settings 面板中添加一个滑块行：
   - 标签: "对话宽度"
   - 滑块 `<input type="range" min="700" max="1350" step="50">`
   - 实时数值显示
   - 预设按钮组（窄/默认/宽/超宽）

4. **存储**: 使用 `GM_setValue('gemini_conversation_width', number)` 持久化。

5. **兼容性**: 需要处理 Gemini 页面自身响应式布局的 `@media` 查询冲突，可能需要更高优先级的 `!important` 规则。

**预估改动范围**: PanelUI（Settings 面板新增控件）+ 新增样式注入逻辑
**依赖**: 无

---

#### A-2. 长代码自动换行

**参考来源**: Wider Gemini（Chrome 扩展）
**开源参考**: 无

**功能描述**:
Gemini 返回的代码块在内容过长时会出现横向滚动条，影响阅读体验。此功能强制代码块内容自动换行，消除水平滚动。

- 可开关的代码换行模式
- 仅影响 Gemini 对话中的 `<code>` / `<pre>` 块，不影响其他页面元素
- 保留代码缩进和语法高亮

**技术方案**:

1. **样式注入**:
   ```css
   pre code, .code-block {
       white-space: pre-wrap !important;
       word-break: break-all !important;
       overflow-x: hidden !important;
   }
   ```

2. **开关控制**: 在 Settings 面板添加 Toggle 开关，控制是否注入上述样式。通过动态添加/移除 `<style>` 元素实现开关。

3. **存储**: `GM_setValue('gemini_code_wrap', boolean)`

**预估改动范围**: PanelUI（Settings 新增开关）+ 样式注入
**依赖**: 无

---

#### A-3. 自适应暗色/亮色模式检测

**参考来源**: Gemini Folders（开源 ✅ GitHub: euuuugenio/Gemini-Folders）
**开源参考**: ✅ Gemini Folders 使用 `getComputedStyle(document.body).backgroundColor` 亮度分析

**功能描述**:
当前主题系统需要用户手动切换 Glass/Cyber/Paper。此功能自动检测 Gemini 页面的实际暗色/亮色状态，自动匹配最合适的主题。

- 自动检测 Gemini 页面当前是暗色还是亮色模式
- 暗色模式自动应用 Glass 或 Cyber 主题，亮色模式自动应用 Paper 主题
- 用户可覆盖自动选择（手动选择优先级高于自动检测）
- 当 Gemini 页面切换模式时实时响应

**技术方案**:

1. **亮度检测算法**（参考 Gemini Folders 的实现思路，完全重写）:
   ```javascript
   function detectPageTheme() {
       const style = window.getComputedStyle(document.body);
       const bg = style.backgroundColor;
       const rgb = bg.match(/\d+/g);
       if (!rgb) return 'dark'; // 默认暗色
       // 加权亮度公式 (ITU-R BT.601)
       const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
       return brightness < 128 ? 'dark' : 'light';
   }
   ```

2. **自动主题映射**:
   - `dark` → 用户配置的暗色主题（默认 Glass）
   - `light` → 用户配置的亮色主题（默认 Paper）

3. **检测时机**:
   - 在现有 `checkUserAndPanel()` 轮询循环中（每 1.5 秒）加入页面主题检测
   - 仅在检测到变化时触发主题切换，避免不必要的重绘

4. **用户覆盖**: 在 Settings 中添加选项：
   - "主题模式": 自动 / 手动
   - 手动模式下保持现有行为
   - 自动模式下可配置暗色/亮色分别对应哪个主题

5. **存储**: `GM_setValue('gemini_theme_mode', 'auto' | 'manual')`

**预估改动范围**: Core.applyTheme 增加自动检测逻辑 + PanelUI Settings 新增选项
**依赖**: 无

---

#### A-4. 面板布局模式扩展

**参考来源**: Gemini Better UI（Chrome 扩展）
**开源参考**: 无

**功能描述**:
当前浮动面板为固定尺寸的小窗口。此功能提供多种面板布局模式，适应不同使用场景。

- **迷你模式**: 仅显示计数数字，最小化占用空间（类似 Lite 版）
- **标准模式**: 当前默认布局（现有行为）
- **侧边栏模式**: 面板吸附到页面右侧，作为固定侧边栏显示
- **底部栏模式**: 面板吸附到页面底部，作为状态栏显示
- 双击面板标题栏在迷你/标准模式间快速切换
- 各模式间平滑过渡动画

**技术方案**:

1. **模式定义**:
   ```javascript
   const PANEL_MODES = {
       mini: { width: '120px', height: 'auto', position: 'float' },
       standard: { width: '280px', height: 'auto', position: 'float' },
       sidebar: { width: '300px', height: '100vh', position: 'fixed-right' },
       statusbar: { width: '100%', height: '36px', position: 'fixed-bottom' }
   };
   ```

2. **模式切换**:
   - 在面板 header 添加模式切换按钮（图标按钮循环切换）
   - 双击 header 在 mini ↔ standard 间切换
   - 侧边栏/底部栏模式需要调整 Gemini 页面的 padding/margin 以避免遮挡

3. **侧边栏模式特殊处理**:
   - `position: fixed; right: 0; top: 0; height: 100vh;`
   - 给 `document.body` 添加 `padding-right` 为面板宽度
   - 面板内容垂直排列，展示更多信息

4. **底部栏模式特殊处理**:
   - `position: fixed; bottom: 0; left: 0; width: 100%;`
   - 信息水平排列，紧凑显示
   - 给 `document.body` 添加 `padding-bottom`

5. **过渡动画**: 使用 CSS `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)` 实现平滑切换。

6. **存储**: `GM_setValue('gemini_panel_mode', string)`

**预估改动范围**: PanelUI 大幅重构（createPanel、update 方法需要适配多模式）
**依赖**: 无，但建议在架构升级（L-1 事件总线）之后实施

---

#### A-5. 面板透明度与模糊度自定义

**参考来源**: 原创功能（基于现有 Glass 主题的 backdrop-filter 能力扩展）
**开源参考**: 无

**功能描述**:
当前 Glass 主题的透明度和模糊度是固定值。此功能允许用户微调面板的视觉效果。

- 透明度滑块（0% ~ 100%）
- 背景模糊度滑块（0px ~ 30px）
- 实时预览
- 仅在 Glass 主题下生效（Cyber 和 Paper 主题不使用 backdrop-filter）

**技术方案**:

1. 在 Settings 面板添加两个滑块控件
2. 修改 `Core.applyTheme()` 在应用 Glass 主题时读取用户自定义值
3. 动态修改面板元素的 `background-color` alpha 值和 `backdrop-filter: blur()` 值
4. 存储: `GM_setValue('gemini_panel_opacity', number)`, `GM_setValue('gemini_panel_blur', number)`

**预估改动范围**: Core.applyTheme + PanelUI Settings
**依赖**: 无

---

### B. 对话管理增强

---

#### B-1. 嵌套子文件夹

**参考来源**: Toolbox for Gemini（Chrome 扩展）、GemiFlow（Chrome 扩展）
**开源参考**: 无

**功能描述**:
当前 FoldersModule 仅支持单层文件夹。此功能扩展为无限嵌套的树形结构，适合重度用户按项目/主题/日期多级分类。

- 文件夹内可创建子文件夹，无层级限制（建议 UI 上限制显示 4 层以保持可读性）
- 子文件夹继承父文件夹颜色，也可独立设置颜色
- 展开/折叠支持递归操作（折叠父文件夹自动折叠所有子文件夹）
- 拖放支持：对话可拖入任意层级文件夹，文件夹可拖动调整层级关系
- 面包屑导航：显示当前浏览路径（如 "工作 > 项目A > 前端"）

**技术方案**:

1. **数据结构升级**: 当前 `folders` 是扁平 `{ folderId: { name, color, collapsed } }`。升级为支持 `parentId` 字段：
   ```javascript
   folders: {
       'folder-1': { name: '工作', color: '#4285f4', collapsed: false, parentId: null },
       'folder-2': { name: '项目A', color: '#4285f4', collapsed: false, parentId: 'folder-1' },
   }
   ```

2. **树形渲染**: 递归渲染函数，根据 `parentId` 构建树。每层缩进 16px。

3. **拖放层级调整**: 拖动文件夹到另一个文件夹上时，设置 `parentId`。拖到根区域时清除 `parentId`。需要防止循环引用（不能把父文件夹拖入自己的子文件夹）。

4. **数据迁移**: 现有用户的 `folders` 数据中所有文件夹默认 `parentId: null`（根级），实现向后兼容。

5. **存储**: 复用现有 `gemini_folders_data_{email}` key，结构内部升级。

**预估改动范围**: FoldersModule 数据结构 + 渲染逻辑重写
**依赖**: 无

---

#### B-2. 批量对话操作

**参考来源**: GemiFlow（Chrome 扩展）、Toolbox for Gemini（Chrome 扩展）
**开源参考**: 无

**功能描述**:
当前对话管理只能逐个操作。此功能提供批量选择和批量操作能力。

- **批量选择模式**: 长按或 Ctrl+点击侧边栏对话进入多选模式
- **全选/反选**: 一键选择当前文件夹内所有对话
- **批量移动**: 将选中的多个对话一次性移入目标文件夹
- **批量删除标记**: 标记选中对话为"待删除"（不直接操作 Gemini 原生删除，仅从文件夹系统中移除）
- **批量归档**: 将选中对话移入特殊的"归档"文件夹
- 选择计数器显示已选数量

**技术方案**:

1. **选择状态管理**: 在 FoldersModule 中新增 `selectedChats: Set<chatId>`。

2. **多选 UI**:
   - 侧边栏对话元素添加复选框（仅在多选模式下显示）
   - Ctrl+点击切换单个对话的选中状态
   - 选中的对话高亮显示（半透明蓝色背景）

3. **批量操作栏**: 当 `selectedChats.size > 0` 时，在 Details Pane 顶部显示操作栏：
   - "移动到..." 按钮（弹出文件夹选择器）
   - "归档" 按钮
   - "从文件夹移除" 按钮
   - "取消选择" 按钮
   - 显示 "已选 N 个对话"

4. **归档文件夹**: 系统内置的特殊文件夹，ID 为 `__archive__`，不可删除/重命名，始终排在最后。

**预估改动范围**: FoldersModule 新增选择逻辑 + 批量操作方法 + UI 渲染
**依赖**: 无

---

#### B-3. 对话收藏/置顶

**参考来源**: GemiFlow（Chrome 扩展）、Toolbox for Gemini（Chrome 扩展）
**开源参考**: 无

**功能描述**:
允许用户标记重要对话为"收藏"或"置顶"，使其在列表中优先显示。

- 星标收藏：点击对话旁的星标图标切换收藏状态
- 收藏的对话在侧边栏中显示星标标记
- Details Pane 中提供"仅显示收藏"过滤器
- 收藏对话在文件夹内排序靠前

**技术方案**:

1. **数据结构**: 在 FoldersModule.data 中新增 `favorites: Set<chatId>`（序列化为数组存储）。

2. **侧边栏标记**: 类似现有的彩色圆点注入，在对话链接旁注入一个小星标 `<span>` 元素。使用 `★`（U+2605）字符或 SVG 图标。

3. **交互**: 点击星标切换收藏状态。在 MutationObserver 回调中重新渲染星标。

4. **过滤**: Details Pane 顶部添加 "★ 收藏" 过滤按钮，点击后仅显示收藏的对话。

**预估改动范围**: FoldersModule 数据结构扩展 + 侧边栏注入逻辑 + Details Pane 过滤
**依赖**: 无

---

#### B-4. 对话标签/标记系统

**参考来源**: Toolbox for Gemini（Chrome 扩展）、GemiFlow（Chrome 扩展）
**开源参考**: 无

**功能描述**:
比文件夹更灵活的分类方式——一个对话可以同时拥有多个标签。

- 创建自定义标签（名称 + 颜色）
- 为对话添加/移除标签（支持多标签）
- 按标签过滤对话列表
- 标签管理界面（创建/重命名/删除/合并标签）
- 侧边栏对话旁显示标签小色块

**技术方案**:

1. **数据结构**:
   ```javascript
   tags: {
       'tag-1': { name: '重要', color: '#ea4335' },
       'tag-2': { name: '待办', color: '#fbbc04' },
   },
   chatToTags: {
       'chatId-xxx': ['tag-1', 'tag-2'],  // 一个对话可有多个标签
   }
   ```

2. **UI**: 在对话右键菜单或 Details Pane 中提供标签选择器（多选复选框列表）。

3. **侧边栏显示**: 在对话链接旁注入小色块序列，每个色块代表一个标签。限制显示最多 3 个色块，超出显示 "+N"。

4. **过滤**: Details Pane 顶部添加标签过滤器，支持多标签 AND/OR 组合过滤。

**预估改动范围**: FoldersModule 扩展（或新建 TagsModule）
**依赖**: 建议在 B-1（子文件夹）之后实施，避免数据结构冲突

---

#### B-5. 文件夹图标自定义

**参考来源**: GemiFlow（Chrome 扩展）
**开源参考**: 无

**功能描述**:
当前文件夹仅支持颜色区分。此功能允许为每个文件夹设置 Emoji 图标，提升视觉辨识度。

- 在文件夹创建/编辑对话框中添加 Emoji 选择器
- 预设常用 Emoji 分类（工作、学习、代码、创意、生活等）
- 文件夹名称前显示所选 Emoji
- 支持直接输入任意 Emoji

**技术方案**:

1. **数据结构**: 在文件夹对象中新增 `icon` 字段：
   ```javascript
   'folder-1': { name: '工作', color: '#4285f4', collapsed: false, parentId: null, icon: '💼' }
   ```

2. **Emoji 选择器**: 在文件夹编辑 Modal 中添加一个 Emoji 网格面板。预设 40~60 个常用 Emoji，分 5~6 类。点击选择，支持清除（使用默认文件夹图标）。

3. **渲染**: 文件夹行的名称前显示 `icon` 值。如果 `icon` 为空，显示默认的文件夹 Emoji（📁）。

4. **向后兼容**: 现有文件夹数据无 `icon` 字段时默认为 `null`，显示默认图标。

**预估改动范围**: FoldersModule 文件夹编辑 Modal + 渲染逻辑
**依赖**: 无

---

### C. 搜索功能

---

#### C-1. 对话标题实时搜索

**参考来源**: Toolbox for Gemini（Chrome 扩展）、GemiFlow（Chrome 扩展）
**开源参考**: 无

**功能描述**:
在 Details Pane 或面板顶部提供搜索框，实时过滤已知对话列表（基于标题匹配）。

- 输入即搜索（debounce 300ms），无需按回车
- 搜索范围：所有已被文件夹系统记录的对话标题
- 匹配关键词高亮显示
- 搜索结果显示对话所属文件夹
- 清空搜索框恢复完整列表
- 支持拼音首字母模糊匹配（可选，面向中文用户）

**技术方案**:

1. **数据源**: FoldersModule 已维护 `chatToFolder` 映射。侧边栏扫描时（`scanSidebarChats`）同时缓存对话标题到一个 `chatTitles: { chatId: title }` 映射。

2. **搜索算法**: 简单的 `title.toLowerCase().includes(query.toLowerCase())` 子串匹配。对于中文拼音匹配，可选集成一个轻量拼音库（约 2KB gzip），或暂不实现。

3. **UI**: 在 Details Pane 顶部（文件夹列表上方）添加搜索输入框：
   - `<input type="text" placeholder="搜索对话...">`
   - 右侧清除按钮（×）
   - 搜索激活时，文件夹列表替换为扁平的搜索结果列表

4. **高亮**: 搜索结果中，匹配的子串用 `<mark>` 标签包裹，应用主题 accent 色背景。

5. **性能**: 对话数量通常在数百级别，无需索引优化，直接遍历即可。

**预估改动范围**: FoldersModule 新增搜索状态 + Details Pane 渲染逻辑
**依赖**: 无

---

#### C-2. 全文内容搜索

**参考来源**: GeminUI Enhancer（开源 ✅ GitHub: lemonberrylabs/geminui）
**开源参考**: ✅ GeminUI 的 DOM 抓取思路可参考

**功能描述**:
超越标题搜索，在对话的实际内容中搜索关键词。由于 Gemini 不提供公开 API 获取对话内容，此功能需要基于 DOM 抓取或缓存策略。

- 搜索当前打开对话的全文内容
- 搜索结果显示匹配行的上下文片段
- 点击结果跳转到对应位置（滚动到匹配处）
- 匹配关键词高亮

**技术方案**:

1. **当前对话搜索**（MVP 方案）:
   - 读取当前对话页面的 DOM 内容：`document.querySelectorAll('.message-content')` 或类似选择器
   - 提取纯文本，按消息分段
   - 在提取的文本中执行搜索
   - 点击结果时，使用 `element.scrollIntoView({ behavior: 'smooth' })` 滚动到对应消息

2. **跨对话搜索**（高级方案，可选）:
   - 需要后台逐个打开对话并抓取内容，用户体验差且耗时
   - 替代方案：仅搜索用户主动"索引"过的对话（用户点击"索引此对话"按钮后缓存内容）
   - 缓存存储在 `GM_setValue` 中，key 为 `gemini_chat_index_{email}`

3. **搜索 UI**: 使用 Ctrl+F 风格的浮动搜索条，或集成到 Details Pane 的搜索框中（通过 Tab 切换"标题搜索"/"内容搜索"模式）。

**预估改动范围**: 新建 SearchModule 或扩展 FoldersModule
**依赖**: 无

---

### D. 导出功能增强

---

#### D-1. 对话内容导出

**参考来源**: Toolbox for Gemini（Chrome 扩展）、GemiFlow（Chrome 扩展）
**开源参考**: 无

**功能描述**:
当前 ExportModule 仅导出统计数据（计数、配额等）。此功能扩展为导出对话的实际内容。

- 导出当前打开的对话完整内容（用户消息 + AI 回复）
- 支持格式：Markdown（保留格式）、纯文本 TXT、HTML（保留样式）、PDF（通过浏览器打印）
- Markdown 导出保留代码块、列表、标题等格式
- 导出文件名自动使用对话标题
- 批量导出：选择多个对话依次导出为独立文件（打包为 ZIP）

**技术方案**:

1. **内容抓取**: 遍历当前对话页面的消息 DOM 元素：
   - 用户消息：`[data-message-author-role="user"]` 或类似选择器
   - AI 回复：`[data-message-author-role="model"]` 或类似选择器
   - 需要在运行时动态探测选择器，因为 Gemini DOM 结构可能变化

2. **Markdown 转换**:
   - AI 回复本身已是 Markdown 渲染后的 HTML，需要反向转换
   - 使用轻量 HTML-to-Markdown 转换逻辑（手写，约 100 行）：
     - `<h1>` → `# `，`<h2>` → `## `
     - `<code>` → `` ` ``，`<pre><code>` → ` ``` `
     - `<li>` → `- `，`<ol><li>` → `1. `
     - `<strong>` → `**`，`<em>` → `*`
   - 用户消息直接取 `textContent`

3. **TXT 导出**: 纯文本，用 `---` 分隔每条消息，标注 "User:" / "Gemini:"。

4. **HTML 导出**: 克隆对话 DOM，包裹在完整 HTML 文档中，内联必要的 CSS。

5. **PDF 导出**: 调用 `window.print()` 并注入打印专用 CSS（隐藏侧边栏、面板等非内容元素）。

6. **文件下载**: 使用 Tampermonkey 的 `GM_download` 或创建 `<a>` 元素 + `URL.createObjectURL(new Blob(...))` 触发下载。

7. **批量导出**: 需要逐个导航到每个对话页面并抓取，体验较差。替代方案：仅支持导出当前对话，批量导出标记为"实验性功能"。

**预估改动范围**: ExportModule 大幅扩展 + 新增 DOM 抓取逻辑
**依赖**: 无

---

#### D-2. 导出格式增强 — 统计数据

**参考来源**: 原创功能（基于现有 ExportModule 能力扩展）
**开源参考**: 无

**功能描述**:
增强现有统计数据导出的格式和内容丰富度。

- CSV 导出增加"按模型分列"视图（每个模型一列，而非合并）
- Markdown 报告增加图表（ASCII 柱状图或 SVG 内嵌）
- 新增 Excel 兼容格式（带 BOM 的 UTF-8 CSV，确保中文正确显示）
- 导出时间范围选择器（最近 7 天 / 30 天 / 全部 / 自定义范围）
- 导出预览：在 Modal 中预览导出内容后再下载

**技术方案**:

1. **时间范围过滤**: 在 ExportModule 的导出方法中添加 `dateRange` 参数：
   ```javascript
   exportCSV({ from: '2026-01-01', to: '2026-02-10' })
   ```
   过滤 `dailyCounts` 中不在范围内的日期。

2. **Excel 兼容 CSV**: 在 CSV 内容前添加 BOM (`\uFEFF`)，确保 Excel 正确识别 UTF-8 编码。

3. **导出预览 Modal**: 新建一个 Modal，内含 `<pre>` 元素显示导出内容预览，底部有"下载"和"复制到剪贴板"按钮。

4. **ASCII 柱状图**: 在 Markdown 报告中用字符绘制简单柱状图：
   ```
   02-01 ████████████ 24
   02-02 ██████ 12
   02-03 ████████████████ 32
   ```

**预估改动范围**: ExportModule 方法增强 + 新增预览 Modal
**依赖**: 无

---

### E. 提示词管理

---

#### E-1. 提示词库

**参考来源**: Toolbox for Gemini（Chrome 扩展）
**开源参考**: 无

**功能描述**:
提供一个本地提示词库，用户可保存常用提示词模板，一键插入到 Gemini 输入框。

- 创建/编辑/删除提示词条目
- 每个条目包含：标题、内容、分类、快捷键（可选）
- 分类管理（如：翻译、编程、写作、分析等）
- 一键将提示词插入当前 Gemini 输入框
- 支持变量占位符（如 `{{text}}`、`{{language}}`），插入时弹出填写框
- 提示词导入/导出（JSON 格式）

**技术方案**:

1. **数据结构**:
   ```javascript
   prompts: {
       'prompt-1': {
           title: '翻译为英文',
           content: '请将以下内容翻译为英文，保持原文格式：\n\n{{text}}',
           category: 'translate',
           variables: ['text'],
           createdAt: '2026-02-10T00:00:00Z',
           usageCount: 0
       }
   },
   promptCategories: ['translate', 'coding', 'writing', 'analysis'],
   promptOrder: ['prompt-1', ...]
   ```

2. **输入框注入**: 定位 Gemini 的输入区域（`<textarea>` 或 `contenteditable` 元素），通过以下方式插入文本：
   - 对于 `<textarea>`: 设置 `value` 属性并触发 `input` 事件
   - 对于 `contenteditable`: 使用 `document.execCommand('insertText', false, text)` 或直接设置 `textContent` 并触发 `input` 事件
   - 需要确保 Gemini 的 React/Angular 框架能感知到值变化

3. **变量替换 UI**: 检测 `{{varName}}` 模式，插入前弹出小型 Modal 让用户填写每个变量值。

4. **快捷访问**: 在面板 Details Pane 中添加"提示词"标签页，或在 Gemini 输入框旁注入一个小按钮（📝）打开提示词选择器。

5. **存储**: `GM_setValue('gemini_prompts_{email}', object)`

**预估改动范围**: 新建 PromptsModule（注册到 ModuleRegistry）
**依赖**: 无

---

#### E-2. 预构建提示词模板

**参考来源**: Toolbox for Gemini（Chrome 扩展）
**开源参考**: 无

**功能描述**:
内置一套开箱即用的高质量提示词模板，覆盖常见使用场景。

- 内置 15~20 个精选模板，按场景分类
- 用户可基于内置模板修改创建自己的版本
- 内置模板不可删除，但可隐藏
- 模板随脚本版本更新（新版本可能添加新模板）

**技术方案**:

1. **内置模板定义**: 在代码中硬编码一个 `BUILTIN_PROMPTS` 常量数组。

2. **分类建议**:
   - 翻译类：翻译为英文、翻译为中文、多语言对照翻译
   - 编程类：代码审查、Bug 分析、重构建议、单元测试生成
   - 写作类：文章润色、摘要生成、大纲生成
   - 分析类：数据分析、对比分析、SWOT 分析
   - 通用类：解释概念、头脑风暴、角色扮演

3. **版本管理**: 每个内置模板有 `version` 字段。脚本更新时，比较版本号决定是否更新内置模板内容（不覆盖用户修改过的副本）。

**预估改动范围**: PromptsModule 内置数据 + 模板管理逻辑
**依赖**: E-1（提示词库）

---

### F. 主题与外观增强

---

#### F-1. 自定义主题编辑器

**参考来源**: Wider Gemini（Chrome 扩展）、原创功能
**开源参考**: 无

**功能描述**:
当前仅有 3 套预设主题。此功能允许用户创建完全自定义的主题。

- 可视化主题编辑器：逐项调整 18 个 CSS 变量的值
- 实时预览：修改即时反映到面板上
- 保存为自定义主题（命名 + 存储）
- 支持导入/导出主题（JSON 格式）
- 基于现有主题"复制并修改"
- 最多保存 5 个自定义主题

**技术方案**:

1. **编辑器 UI**: 新建一个 Modal（类似 Dashboard 的全屏 Modal），内含：
   - 左侧：CSS 变量列表，每项带颜色选择器（`<input type="color">`）或文本输入
   - 右侧：面板实时预览区域（克隆当前面板 DOM 作为预览）
   - 分组显示：背景组、文字组、交互组、特效组

2. **数据结构**:
   ```javascript
   customThemes: {
       'my-theme-1': {
           name: '我的主题',
           vars: { '--bg': 'rgba(...)' , '--text-main': '#fff', ... }
       }
   }
   ```

3. **主题选择器升级**: 当前 Details Pane 的主题切换区域扩展为：预设主题 + 自定义主题列表 + "新建主题"按钮。

4. **存储**: `GM_setValue('gemini_custom_themes', object)`

**预估改动范围**: 新建主题编辑器 Modal + Core.applyTheme 扩展 + PanelUI 主题选择器
**依赖**: 无

---

#### F-2. 字体自定义

**参考来源**: Wider Gemini（Chrome 扩展）、GemiFlow（Chrome 扩展）
**开源参考**: 无

**功能描述**:
允许用户自定义面板和/或 Gemini 页面的字体。

- 面板字体选择（从系统字体列表中选择）
- 面板字号调整（12px ~ 18px）
- 可选：Gemini 对话区域字体/字号覆盖
- 代码块等宽字体单独设置

**技术方案**:

1. **面板字体**: 修改面板根元素的 `font-family` 和 `font-size`。
2. **字体选择器**: 提供常用字体下拉列表（系统字体无法枚举，提供预设列表）：
   - 无衬线：`"Google Sans"`, `"Segoe UI"`, `"SF Pro"`, `"Noto Sans SC"`, `system-ui`
   - 等宽：`"JetBrains Mono"`, `"Fira Code"`, `"Cascadia Code"`, `"Consolas"`, `monospace`
3. **字号滑块**: `<input type="range" min="12" max="18" step="1">`
4. **存储**: `GM_setValue('gemini_font_family', string)`, `GM_setValue('gemini_font_size', number)`

**预估改动范围**: PanelUI Settings 新增控件 + 面板样式动态调整
**依赖**: 无

---

### G. 模型管理增强

---

#### G-1. 默认模型预选

**参考来源**: Gemini Enhancer（Chrome 扩展）
**开源参考**: 无

**功能描述**:
每次打开新对话时，Gemini 默认使用某个模型（通常是 Flash）。此功能允许用户设置偏好模型，新对话自动切换到该模型。

- 在 Settings 中选择默认模型（Flash / Thinking / Pro）
- 新对话创建时自动点击模型切换按钮，选择预设模型
- 仅在检测到当前模型与预设不同时触发切换
- 可设置为"不自动切换"（保持 Gemini 默认行为）

**技术方案**:

1. **模型切换自动化**: 当检测到新对话（URL 从无 chatId 变为有 chatId，或从首页进入对话页）时：
   - 读取当前模型（复用 `CounterModule.detectModel()`）
   - 如果与预设不同，模拟点击模型选择按钮：
     ```javascript
     // 1. 点击模型选择器打开下拉菜单
     const modelBtn = document.querySelector('button.input-area-switch');
     modelBtn?.click();
     // 2. 等待下拉菜单出现（setTimeout 300ms）
     // 3. 在下拉菜单中找到目标模型并点击
     const options = document.querySelectorAll('.bard-mode-list-button');
     for (const opt of options) {
         if (opt.textContent.includes(targetModelText)) {
             opt.click();
             break;
         }
     }
     ```

2. **检测时机**: 在 `checkUserAndPanel()` 轮询中，当 URL 变化且为新对话时触发一次。使用标志位避免重复触发。

3. **Settings UI**: 下拉选择器，选项：不自动切换 / Flash / Thinking / Pro。

4. **存储**: `GM_setValue('gemini_default_model', string | null)`

**预估改动范围**: CounterModule 扩展 + PanelUI Settings
**依赖**: 无

---

#### G-2. 模型使用统计增强

**参考来源**: 原创功能（基于现有模型检测能力扩展）
**开源参考**: 无

**功能描述**:
增强模型使用数据的可视化和分析能力。

- 模型使用占比饼图（Flash / Thinking / Pro 各占百分比）
- 按时间段查看模型使用趋势（折线图：过去 7/30 天每天各模型使用量）
- 模型切换频率统计（一天内切换了多少次模型）
- 在 Dashboard 中展示模型相关的统计卡片

**技术方案**:

1. **数据源**: 现有 `dailyCounts[date].byModel` 已记录每日各模型使用量，数据基础完备。

2. **饼图渲染**: 使用 SVG `<circle>` 的 `stroke-dasharray` 和 `stroke-dashoffset` 绘制环形饼图（无需外部库）：
   ```javascript
   // 计算各模型占比
   const total = flash + thinking + pro;
   const flashPct = flash / total;
   // SVG 圆环，周长 = 2πr，通过 dasharray 控制各段弧长
   ```

3. **趋势折线图**: 使用 SVG `<polyline>` 绘制，类似现有 7 天 SVG 图表的扩展版。X 轴为日期，Y 轴为消息数，三条线分别代表三个模型。

4. **Dashboard 集成**: 在现有 Dashboard Modal 中新增"模型分析"区域，放置饼图和趋势图。

**预估改动范围**: PanelUI Dashboard 扩展 + SVG 图表绘制逻辑
**依赖**: 无

---

### H. 对话存档与备份

---

#### H-1. 自动对话存档

**参考来源**: GeminUI Enhancer（开源 ✅ GitHub: lemonberrylabs/geminui）
**开源参考**: ✅ GeminUI 的侧边栏抓取 + jslog 解析思路可参考（完全重写实现）

**功能描述**:
自动记录用户的所有对话标题和 URL，防止 Gemini 删除或丢失对话时数据不可恢复。

- 后台自动扫描侧边栏，记录所有可见对话的标题和 URL
- 增量更新：仅记录新出现的对话，不重复存储
- 存档统计：显示已存档对话总数、最后更新时间
- 存档浏览器：在 Dashboard 或独立 Modal 中浏览所有存档对话
- 点击存档条目直接跳转到对应对话
- 检测已删除的对话（存档中有但侧边栏中已消失的对话标记为"可能已删除"）

**技术方案**:

1. **对话信息抓取**: 复用并扩展 FoldersModule 的 `scanSidebarChats()` 方法：
   - 当前方法已扫描 `nav a[href*="/app/"]` 获取 chatId
   - 扩展为同时提取对话标题（链接的 `textContent` 或 `aria-label`）
   - 记录首次发现时间戳

2. **Chat ID 提取增强**（参考 GeminUI 的 jslog 解析思路，完全重写）:
   - 主要方式：从 `<a href="/app/{chatId}">` 直接提取（现有方式）
   - 备用方式：从 `[data-test-id="conversation"]` 元素的 `jslog` 属性中提取
   - 双重验证确保 ID 准确性

3. **增量更新策略**（参考 GeminUI 的智能早停思路，完全重写）:
   - 维护已知 chatId 的 Set
   - 每次扫描时，如果连续 5 个已知对话出现，停止深度扫描（侧边栏按时间倒序排列，连续已知意味着更早的也已知）
   - 首次运行时执行完整扫描

4. **数据结构**:
   ```javascript
   archive: {
       'chatId-xxx': {
           title: '对话标题',
           url: 'https://gemini.google.com/app/xxx',
           firstSeen: '2026-02-10T12:00:00Z',
           lastSeen: '2026-02-10T15:00:00Z',
           status: 'active' | 'missing'  // missing = 侧边栏中已消失
       }
   },
   archiveMeta: {
       lastFullScan: '2026-02-10T12:00:00Z',
       totalArchived: 150
   }
   ```

5. **扫描触发时机**:
   - 页面加载后延迟 5 秒执行首次扫描
   - 之后每 5 分钟增量扫描一次
   - 用户可在面板中手动触发"立即扫描"

6. **存储**: `GM_setValue('gemini_archive_{email}', object)`

**预估改动范围**: 新建 ArchiveModule（注册到 ModuleRegistry）
**依赖**: 无

---

#### H-2. 全量数据备份与恢复

**参考来源**: Gemini Folders（开源 ✅ GitHub: euuuugenio/Gemini-Folders）
**开源参考**: ✅ Gemini Folders 的 JSON Blob 导出/FileReader 导入模式可参考

**功能描述**:
提供一键备份和恢复所有 GeminiCounterPro 数据的能力，防止数据丢失。

- 一键导出所有数据为单个 JSON 文件（计数、文件夹、存档、设置、主题等）
- 从备份文件恢复全部数据
- 恢复前显示备份摘要（包含多少对话、多少文件夹、数据时间范围等）
- 恢复确认对话框（警告将覆盖现有数据）
- 可选择性恢复（仅恢复文件夹 / 仅恢复计数 / 全部恢复）
- 自动备份提醒（每 30 天未备份时在面板显示提醒）

**技术方案**:

1. **备份数据收集**: 遍历所有 `GM_getValue` key，收集完整数据快照：
   ```javascript
   const backup = {
       version: '8.1',
       timestamp: new Date().toISOString(),
       user: currentUser,
       data: {
           store: GM_getValue(`gemini_store_${user}`),
           folders: GM_getValue(`gemini_folders_data_${user}`),
           archive: GM_getValue(`gemini_archive_${user}`),
           settings: { theme, resetHour, quotaLimit, enabledModules, ... },
           customThemes: GM_getValue('gemini_custom_themes'),
           prompts: GM_getValue(`gemini_prompts_${user}`)
       }
   };
   ```

2. **文件下载**: 使用 `URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))` 创建下载链接。文件名格式：`GeminiCounterPro_backup_${user}_${date}.json`

3. **文件导入**: 创建隐藏的 `<input type="file" accept=".json">` 元素，用 `FileReader` 读取文件内容，解析 JSON 后验证格式。

4. **版本兼容**: 备份文件包含 `version` 字段。恢复时检查版本，如果是旧版本格式，执行数据迁移逻辑。

5. **选择性恢复 UI**: 恢复确认 Modal 中显示复选框列表：
   - ☑ 计数数据（X 条每日记录）
   - ☑ 文件夹数据（X 个文件夹，Y 个对话映射）
   - ☑ 存档数据（X 个存档对话）
   - ☑ 设置与主题
   - ☑ 提示词库

6. **自动备份提醒**: 记录 `GM_setValue('gemini_last_backup', timestamp)`，在面板 header 显示小图标提醒。

**预估改动范围**: ExportModule 扩展（或新建 BackupModule）+ 恢复 Modal
**依赖**: 无

---

### I. 快捷操作与效率工具

---

#### I-1. 键盘快捷键系统

**参考来源**: GemiFlow（Chrome 扩展）、原创功能
**开源参考**: 无

**功能描述**:
为常用操作提供键盘快捷键，提升操作效率。

- 全局快捷键（在 Gemini 页面任意位置生效）：
  - `Alt+G`: 显示/隐藏面板
  - `Alt+D`: 打开 Dashboard
  - `Alt+S`: 打开 Settings
  - `Alt+F`: 聚焦搜索框（如果搜索功能已实现）
- 面板内快捷键（面板获得焦点时生效）：
  - `1/2/3/4`: 切换视图模式（今日/对话/总计/创建数）
  - `T`: 切换主题
  - `E`: 展开/折叠 Details Pane
- 快捷键可自定义（在 Settings 中重新绑定）
- 快捷键冲突检测（避免与 Gemini 原生快捷键冲突）

**技术方案**:

1. **快捷键注册**: 在 `document` 上添加 `keydown` 事件监听器（capture 阶段），检查组合键：
   ```javascript
   document.addEventListener('keydown', (e) => {
       // 忽略输入框内的按键
       if (e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
       const key = `${e.altKey ? 'Alt+' : ''}${e.ctrlKey ? 'Ctrl+' : ''}${e.key}`;
       const action = keyBindings[key];
       if (action) { e.preventDefault(); action(); }
   }, true);
   ```

2. **快捷键配置**: 存储为 `{ 'Alt+G': 'togglePanel', 'Alt+D': 'openDashboard', ... }` 映射。

3. **自定义 UI**: Settings 中显示快捷键列表，每项旁有"修改"按钮。点击后进入录制模式，按下新组合键即完成绑定。

4. **存储**: `GM_setValue('gemini_keybindings', object)`

**预估改动范围**: 新增快捷键管理逻辑 + PanelUI Settings 扩展
**依赖**: 无

---

#### I-2. 快速笔记

**参考来源**: 原创功能
**开源参考**: 无

**功能描述**:
在面板中提供一个轻量笔记区域，用户可以随手记录想法、待办事项或对话要点。

- 简单的文本编辑区域（支持多行）
- 自动保存（输入停止 1 秒后自动持久化）
- 按对话关联：可选择将笔记绑定到当前对话 ID
- 全局笔记 + 对话笔记两种模式
- 笔记列表浏览

**技术方案**:

1. **UI**: 在 Details Pane 中新增"笔记"标签页，内含 `<textarea>` 编辑区域。

2. **数据结构**:
   ```javascript
   notes: {
       '__global__': '全局笔记内容...',
       'chatId-xxx': '这个对话的笔记...',
   }
   ```

3. **自动保存**: 使用 debounce（1000ms）的 `input` 事件监听器触发 `GM_setValue`。

4. **对话关联**: 当用户在某个对话页面编辑笔记时，自动关联到当前 chatId。提供切换按钮在"全局笔记"和"当前对话笔记"间切换。

5. **存储**: `GM_setValue('gemini_notes_{email}', object)`

**预估改动范围**: 新建 NotesModule 或集成到 FoldersModule 的 Details Pane
**依赖**: 无

---

### J. 数据分析增强

---

#### J-1. 增强型 Dashboard

**参考来源**: 原创功能（基于现有 Dashboard 扩展）
**开源参考**: 无

**功能描述**:
将现有 Dashboard 从简单的统计卡片 + 热力图升级为全面的数据分析中心。

- **时间范围选择器**: 查看最近 7 天 / 30 天 / 90 天 / 全部 / 自定义范围的数据
- **每日消息量柱状图**: 替代或补充热力图，更直观地展示每日使用量变化
- **每周/每月汇总**: 按周或月聚合数据，显示周均/月均消息量
- **使用高峰时段分析**: 记录每条消息的发送小时，分析用户最活跃的时间段（需要新增数据采集）
- **对话长度分布**: 统计各对话的消息数分布（如：1-5条、6-20条、20+条各占多少）

**技术方案**:

1. **时间范围选择器 UI**: Dashboard Modal 顶部添加按钮组 + 日期选择器：
   ```
   [7天] [30天] [90天] [全部] [自定义: 2026-01-01 ~ 2026-02-10]
   ```
   所有图表和统计卡片根据选定范围动态更新。

2. **柱状图**: 使用 SVG `<rect>` 元素绘制。每根柱子宽度 = 可用宽度 / 天数，高度按比例缩放。鼠标悬停显示 tooltip（日期 + 消息数）。

3. **使用高峰时段**: 需要在 CounterModule 中新增数据采集——每次发送消息时记录小时：
   ```javascript
   dailyCounts[date].byHour = dailyCounts[date].byHour || {};
   dailyCounts[date].byHour[hour] = (dailyCounts[date].byHour[hour] || 0) + 1;
   ```
   在 Dashboard 中用 24 格热力条展示（类似 GitHub 的贡献时间分布）。

4. **对话长度分布**: 从 `state.chats` 中统计各对话消息数，分桶后用柱状图展示。

**预估改动范围**: PanelUI Dashboard 大幅扩展 + CounterModule 数据采集增强
**依赖**: 无

---

### K. 国际化 (i18n)

---

#### K-1. 多语言 UI 支持

**参考来源**: 原创功能（当前 UI 为英文，模型检测已支持多语言）
**开源参考**: 无

**功能描述**:
当前面板 UI 文本为硬编码英文。此功能将所有 UI 文本抽取为语言包，支持多语言切换。

- 支持语言：英文（默认）、简体中文、繁体中文、日文、韩文
- 自动检测 Gemini 页面语言并匹配
- 用户可手动覆盖语言选择
- 语言包覆盖所有 UI 文本：按钮、标签、提示信息、Modal 标题等

**技术方案**:

1. **语言包结构**:
   ```javascript
   const I18N = {
       en: {
           'panel.title': 'Gemini Counter',
           'panel.today': 'Today',
           'panel.total': 'Total',
           'settings.title': 'Settings',
           'settings.theme': 'Theme',
           'settings.resetHour': 'Daily Reset Hour',
           'folders.create': 'New Folder',
           'folders.rename': 'Rename',
           // ... 约 80~120 个 key
       },
       zh_CN: {
           'panel.title': 'Gemini 计数器',
           'panel.today': '今日',
           'panel.total': '总计',
           // ...
       },
       // zh_TW, ja, ko ...
   };
   ```

2. **翻译函数**: 全局 `t(key, params?)` 函数：
   ```javascript
   function t(key, params = {}) {
       const lang = Core.getLanguage();
       let text = I18N[lang]?.[key] || I18N.en[key] || key;
       for (const [k, v] of Object.entries(params)) {
           text = text.replace(`{${k}}`, v);
       }
       return text;
   }
   ```

3. **语言检测**: 读取 `document.documentElement.lang` 或 `navigator.language`，映射到支持的语言代码。

4. **迁移策略**: 逐步替换硬编码字符串为 `t('key')` 调用。可以分模块逐步迁移，不需要一次性完成。

5. **存储**: `GM_setValue('gemini_language', string | 'auto')`

**预估改动范围**: 全局性改动——所有 UI 文本需要替换为 `t()` 调用
**依赖**: 无，但建议作为较晚期的改动（避免与其他功能开发产生大量合并冲突）

---

### L. 架构升级

---

#### L-1. 事件总线（EventBus）

**参考来源**: 业界最佳实践（发布-订阅模式）
**开源参考**: 无（通用设计模式）

**功能描述**:
当前模块间通信仅有 `onUserChange` 一个广播通道，且 PanelUI 直接硬编码引用各模块。引入事件总线实现模块间松耦合通信。

- 模块可发布任意命名事件，携带数据载荷
- 模块可订阅感兴趣的事件，无需知道发布者是谁
- 支持一次性订阅（`once`）
- 支持取消订阅
- 内置事件类型定义，确保类型安全

**技术方案**:

1. **EventBus 实现**:
   ```javascript
   const EventBus = {
       _listeners: {},
       on(event, fn) {
           (this._listeners[event] ||= []).push(fn);
           return () => this.off(event, fn); // 返回取消函数
       },
       once(event, fn) {
           const wrapper = (...args) => { fn(...args); this.off(event, wrapper); };
           return this.on(event, wrapper);
       },
       off(event, fn) {
           const list = this._listeners[event];
           if (list) this._listeners[event] = list.filter(f => f !== fn);
       },
       emit(event, data) {
           (this._listeners[event] || []).forEach(fn => fn(data));
       }
   };
   ```

2. **预定义事件**:
   ```javascript
   // 用户相关
   'user:detected'     // { email }
   'user:changed'      // { from, to }
   // 计数相关
   'counter:increment' // { chatId, model, timestamp }
   'counter:reset'     // { user }
   // 文件夹相关
   'folder:created'    // { folderId, name }
   'folder:chatMoved'  // { chatId, fromFolder, toFolder }
   // UI 相关
   'panel:modeChanged' // { mode }
   'panel:themeChanged'// { theme }
   'details:toggled'   // { expanded }
   // 导航相关
   'page:chatChanged'  // { chatId }
   'page:modelChanged' // { model }
   ```

3. **迁移策略**: 逐步将现有的直接引用替换为事件通信。例如：
   - `CounterModule` 发送消息时 `emit('counter:increment', data)`
   - `PanelUI` 订阅 `on('counter:increment', () => this.update())`
   - 替代现有的 `PanelUI` 直接调用 `CounterModule.state`

**预估改动范围**: 新增 EventBus 对象 + 逐步重构模块间通信
**依赖**: 无（基础设施，建议最先实施）

---

#### L-2. 模块系统增强 — 动态 UI 注册

**参考来源**: 业界最佳实践（插件架构）
**开源参考**: 无

**功能描述**:
当前 PanelUI 硬编码引用各模块的渲染方法（如 `FoldersModule.renderToDetailsPane()`）。升级模块系统，让模块可以声明式地注册 UI 插槽。

- 模块可声明自己需要的 UI 插槽（Details Pane 标签页、Settings 区域、Dashboard 区域等）
- PanelUI 根据注册信息动态渲染，无需硬编码
- 新模块只需注册即可自动获得 UI 空间，无需修改 PanelUI 代码

**技术方案**:

1. **UI 插槽定义**:
   ```javascript
   const UI_SLOTS = {
       DETAILS_TAB: 'details-tab',      // Details Pane 中的标签页
       SETTINGS_SECTION: 'settings',     // Settings Modal 中的配置区域
       DASHBOARD_SECTION: 'dashboard',   // Dashboard Modal 中的分析区域
       HEADER_BADGE: 'header-badge',     // 面板 Header 中的徽章/指示器
   };
   ```

2. **模块 UI 注册接口**:
   ```javascript
   // 模块在 init() 中注册 UI
   ModuleRegistry.registerUI('folders', {
       [UI_SLOTS.DETAILS_TAB]: {
           label: 'Folders',
           icon: '📁',
           render: (container) => FoldersModule.renderToDetailsPane(container)
       },
       [UI_SLOTS.SETTINGS_SECTION]: {
           label: 'Folder Settings',
           render: (container) => FoldersModule.renderSettings(container)
       }
   });
   ```

3. **PanelUI 动态渲染**: `renderDetailsPane()` 不再硬编码模块引用，而是遍历所有注册的 `DETAILS_TAB` 插槽，动态创建标签页。

**预估改动范围**: ModuleRegistry 扩展 + PanelUI 渲染逻辑重构
**依赖**: L-1（事件总线）建议先完成

---

#### L-3. DOM 选择器弹性化

**参考来源**: GeminUI Enhancer（开源 ✅）、Gemini Folders（开源 ✅）
**开源参考**: ✅ 两个项目均展示了多级 fallback 选择器策略

**功能描述**:
Gemini 作为 SPA 会频繁更新 DOM 结构，硬编码的 CSS 选择器容易失效。此功能将所有 DOM 选择器集中管理，并提供多级 fallback 和自动修复能力。

- 所有 DOM 选择器集中定义在一个配置对象中
- 每个选择器提供 2~3 个 fallback 候选
- 选择器失效时自动尝试 fallback
- 选择器失效日志记录（帮助开发者快速定位问题）
- 可通过 Debug 面板查看选择器健康状态

**技术方案**:

1. **选择器注册表**:
   ```javascript
   const SELECTORS = {
       sendButton: {
           primary: 'button.send-button',
           fallbacks: [
               'button[aria-label*="Send"]',
               'button[data-test-id="send-button"]',
               '.input-area button[type="submit"]'
           ],
           description: '发送按钮'
       },
       modelSwitch: {
           primary: 'button.input-area-switch',
           fallbacks: [
               '[data-test-id="bard-mode-menu-button"]',
               '.model-selector button'
           ],
           description: '模型切换按钮'
       },
       sidebarChats: {
           primary: 'nav a[href*="/app/"]',
           fallbacks: [
               '[data-test-id="conversation"] a',
               '.conversation-list a[href*="/app/"]'
           ],
           description: '侧边栏对话链接'
       },
       // ... 其他选择器
   };
   ```

2. **智能查询函数**:
   ```javascript
   function $(selectorKey, context = document) {
       const config = SELECTORS[selectorKey];
       let el = context.querySelector(config.primary);
       if (el) return el;
       for (const fb of config.fallbacks) {
           el = context.querySelector(fb);
           if (el) {
               Logger.warn(`选择器 fallback: ${selectorKey} → ${fb}`);
               return el;
           }
       }
       Logger.error(`选择器全部失效: ${selectorKey}`);
       return null;
   }
   ```

3. **健康检查**: 在 Debug 面板中添加"选择器状态"区域，显示每个选择器的当前匹配状态（✅ 主选择器 / ⚠️ fallback / ❌ 全部失效）。

**预估改动范围**: 新增选择器注册表 + 替换所有 `querySelector` 调用
**依赖**: 无

---

#### L-4. 存储层抽象

**参考来源**: 业界最佳实践（Repository 模式）
**开源参考**: 无

**功能描述**:
当前各模块直接调用 `GM_getValue` / `GM_setValue`，存储逻辑分散。引入存储抽象层，统一管理数据持久化。

- 统一的存储 API，屏蔽底层实现细节
- 自动序列化/反序列化
- 数据版本管理和迁移框架
- 存储配额监控（Tampermonkey 有存储限制）
- 批量读写优化（减少 GM_* 调用次数）

**技术方案**:

1. **Storage 抽象层**:
   ```javascript
   const Storage = {
       _cache: {},

       get(key, defaultValue = null) {
           if (key in this._cache) return this._cache[key];
           const raw = GM_getValue(key, null);
           const value = raw !== null ? raw : defaultValue;
           this._cache[key] = value;
           return value;
       },

       set(key, value) {
           this._cache[key] = value;
           GM_setValue(key, value);
       },

       // 用户隔离的快捷方法
       getUserData(subKey, user = currentUser) {
           return this.get(`gemini_${subKey}_${user}`);
       },

       setUserData(subKey, value, user = currentUser) {
           this.set(`gemini_${subKey}_${user}`, value);
       },

       // 批量操作
       getMultiple(keys) { ... },
       setMultiple(entries) { ... }
   };
   ```

2. **数据迁移框架**:
   ```javascript
   const MIGRATIONS = [
       { version: 9, migrate: (data) => { /* v8→v9 迁移逻辑 */ } },
       { version: 10, migrate: (data) => { /* v9→v10 迁移逻辑 */ } },
   ];

   function runMigrations(user) {
       const currentVersion = Storage.getUserData('data_version', user) || 8;
       for (const m of MIGRATIONS) {
           if (m.version > currentVersion) {
               m.migrate(Storage.getUserData('store', user));
               Storage.setUserData('data_version', m.version, user);
           }
       }
   }
   ```

3. **内存缓存**: 首次读取后缓存在 `_cache` 中，后续读取直接返回缓存值。写入时同时更新缓存和持久化存储。

**预估改动范围**: 新增 Storage 对象 + 逐步替换所有 GM_getValue/GM_setValue 调用
**依赖**: 无（基础设施，建议与 L-1 同期实施）

---

## 三、优先级矩阵

### 建议实施阶段

#### 第一阶段：基础设施升级（建议先行）

| 编号 | 功能 | 理由 |
|------|------|------|
| L-1 | 事件总线 | 后续所有模块开发的基础，解耦模块通信 |
| L-4 | 存储层抽象 | 统一数据管理，为数据迁移提供框架 |
| L-3 | DOM 选择器弹性化 | 提高脚本对 Gemini 更新的抗性，减少维护成本 |

#### 第二阶段：高价值功能

| 编号 | 功能 | 理由 |
|------|------|------|
| A-1 | 加宽对话视图 | 用户需求最高频，实现简单，立竿见影 |
| A-2 | 长代码自动换行 | 同上，极低成本高收益 |
| A-3 | 自适应暗色/亮色模式 | 提升开箱体验，减少用户手动配置 |
| B-1 | 嵌套子文件夹 | 文件夹系统的自然进化，重度用户刚需 |
| H-1 | 自动对话存档 | 独特卖点，竞品中仅 GeminUI 有类似功能 |
| G-1 | 默认模型预选 | 高频需求，每次新对话都会用到 |

#### 第三阶段：体验优化

| 编号 | 功能 | 理由 |
|------|------|------|
| C-1 | 对话标题实时搜索 | 对话多时的刚需，实现成本低 |
| B-2 | 批量对话操作 | 管理效率大幅提升 |
| B-3 | 对话收藏/置顶 | 轻量但实用 |
| D-2 | 导出格式增强（统计） | 现有功能的自然增强 |
| G-2 | 模型使用统计增强 | 数据已有，仅需可视化 |
| H-2 | 全量数据备份与恢复 | 数据安全保障 |
| I-1 | 键盘快捷键系统 | 效率用户的刚需 |

#### 第四阶段：高级功能

| 编号 | 功能 | 理由 |
|------|------|------|
| E-1 | 提示词库 | 独立功能模块，不影响现有代码 |
| E-2 | 预构建提示词模板 | 依赖 E-1，提升开箱体验 |
| D-1 | 对话内容导出 | 技术难度较高（DOM 抓取 + 格式转换） |
| B-4 | 对话标签/标记系统 | 与文件夹互补的分类方式 |
| B-5 | 文件夹图标自定义 | 锦上添花 |
| J-1 | 增强型 Dashboard | 数据分析深度提升 |
| A-4 | 面板布局模式扩展 | UI 重构工作量大 |
| L-2 | 模块系统增强 | 为后续扩展铺路 |

#### 第五阶段：长期演进

| 编号 | 功能 | 理由 |
|------|------|------|
| F-1 | 自定义主题编辑器 | 面向高级用户的个性化功能 |
| F-2 | 字体自定义 | 锦上添花 |
| A-5 | 面板透明度与模糊度自定义 | 细粒度视觉调整 |
| C-2 | 全文内容搜索 | 技术挑战大，依赖 DOM 抓取稳定性 |
| I-2 | 快速笔记 | 独立功能，优先级较低 |
| K-1 | 多语言 UI 支持 | 全局性改动，建议在功能稳定后实施 |

---

### 影响力 × 实现难度矩阵

```
                        高影响力
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         │  ★ 优先实施      │  ⚡ 战略投资     │
         │  A-1 加宽视图    │  L-1 事件总线    │
         │  A-2 代码换行    │  L-4 存储抽象    │
         │  A-3 自适应主题  │  B-1 子文件夹    │
         │  G-1 模型预选    │  H-1 自动存档    │
         │  B-3 收藏/置顶   │  E-1 提示词库    │
  低难度 ─┼─────────────────┼─────────────────┼─ 高难度
         │                 │                 │
         │  △ 可选实施      │  ◇ 谨慎评估      │
         │  B-5 文件夹图标  │  D-1 内容导出    │
         │  D-2 导出增强    │  C-2 全文搜索    │
         │  A-5 透明度调整  │  A-4 布局模式    │
         │  F-2 字体自定义  │  K-1 多语言      │
         │  I-2 快速笔记    │  F-1 主题编辑器  │
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                        低影响力
```

---

## 四、技术约束与风险

### 4.1 Tampermonkey 环境限制

| 约束 | 影响 | 应对策略 |
|------|------|---------|
| **单文件架构** | 所有代码必须在一个 `.user.js` 文件中，无法使用 ES Modules 或动态 import | 继续使用 IIFE + 模块对象模式；考虑引入构建步骤（可选） |
| **存储容量** | `GM_setValue` 总容量约 5~10MB（因浏览器和 Tampermonkey 版本而异） | 实现存储配额监控（L-4）；大数据（如全文索引）需要压缩或分片 |
| **无后台运行** | 脚本仅在 Gemini 页面打开时运行，无 Service Worker | 自动存档（H-1）只能在页面活跃时执行；无法实现定时备份 |
| **跨域限制** | `GM_xmlhttpRequest` 可跨域，但普通 fetch 受同源策略限制 | 外部 API 调用使用 `GM_xmlhttpRequest` |
| **CSP 限制** | Gemini 页面可能有严格的 Content Security Policy | `GM_addStyle` 和 `GM_addElement` 可绑过 CSP；避免使用 `eval` 或内联事件处理器 |

### 4.2 Gemini 页面稳定性风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| **DOM 结构变更** | 高（Google 频繁更新） | 选择器失效，功能异常 | L-3 选择器弹性化 + 多级 fallback |
| **SPA 路由变更** | 中 | URL 解析失败，chatId 提取异常 | 正则表达式宽松匹配 + fallback |
| **输入框实现变更** | 中 | 消息检测失效、提示词注入失败 | 多种检测策略并行（textarea / contenteditable / 按钮） |
| **侧边栏重构** | 中 | 文件夹标记、存档扫描失效 | MutationObserver + 定期重扫 + 选择器 fallback |
| **新增模型** | 高 | 模型检测遗漏 | MODEL_DETECT_MAP 设计为可扩展；未知模型归类为 "unknown" 而非报错 |

### 4.3 性能考量

| 关注点 | 当前状态 | 新功能影响 | 建议 |
|--------|---------|-----------|------|
| **轮询频率** | 1.5 秒主循环 | 新增检测项（页面主题、模型预选）会增加每次轮询的工作量 | 将非关键检测降频（如主题检测每 5 秒一次） |
| **MutationObserver** | 1 个（侧边栏），500ms debounce | 存档扫描可能需要额外 Observer | 复用现有 Observer，通过回调分发 |
| **DOM 查询** | 每次轮询约 8 次 querySelector | 新功能（搜索、存档）增加查询次数 | 缓存查询结果，仅在 DOM 变化时刷新 |
| **存储读写** | 每次消息发送时写入 | 自动保存笔记、存档数据增加写入频率 | debounce 所有非关键写入；L-4 存储层缓存 |
| **内存占用** | 热力图 365 天数据常驻内存 | 存档数据、全文索引可能占用大量内存 | 懒加载：仅在打开 Dashboard/搜索时加载大数据集 |
| **脚本体积** | 当前 3535 行（~120KB） | 全部功能实现后可能达到 8000~12000 行 | 考虑引入构建步骤（可选）；保持模块化以便按需加载 |

### 4.4 数据兼容性与迁移

**向后兼容原则**:
- 所有数据结构变更必须向后兼容——旧版本数据在新版本中可正常读取
- 新增字段使用默认值填充，不要求旧数据包含新字段
- 删除字段时保留在存储中（不主动清理），避免降级后数据丢失

**迁移策略**:
- 每个版本升级定义明确的迁移函数（参见 L-4 数据迁移框架）
- 迁移在脚本启动时自动执行，用户无感知
- 迁移前自动创建数据快照（写入 `gemini_migration_backup_{version}`）
- 迁移失败时回滚到快照并禁用新功能，而非崩溃

**关键迁移点**:

| 功能 | 数据变更 | 迁移方案 |
|------|---------|---------|
| B-1 子文件夹 | folders 对象新增 `parentId` 字段 | 现有文件夹默认 `parentId: null` |
| B-3 收藏 | 新增 `favorites` 数组 | 默认空数组 |
| B-4 标签 | 新增 `tags` 和 `chatToTags` | 默认空对象 |
| H-1 存档 | 新增 `archive` 存储 key | 独立 key，不影响现有数据 |
| J-1 时段分析 | dailyCounts 新增 `byHour` | 旧数据无此字段，统计时跳过 |

### 4.5 测试策略

**现有测试基础**:
- Node.js 内置 test runner + c8 覆盖率工具
- 3 个可测试库模块（debug_logger, quota_calc, export_formatter）
- 100% 覆盖率要求（branches, functions, lines, statements）

**新功能测试方案**:

| 层级 | 范围 | 工具 | 覆盖目标 |
|------|------|------|---------|
| **单元测试** | 纯逻辑函数（数据转换、计算、格式化） | Node.js test runner + c8 | 100% |
| **集成测试** | 模块间交互（EventBus 事件流、Storage 读写） | Node.js test runner | 关键路径 |
| **手动测试** | DOM 交互、UI 渲染、Gemini 页面集成 | 浏览器手动验证 | 功能清单 |

**可提取为可测试库的新模块**:
- EventBus（L-1）→ `lib/event_bus.js`
- Storage 抽象层（L-4）→ `lib/storage.js`
- 选择器注册表（L-3）→ `lib/selectors.js`
- 提示词变量解析（E-1）→ `lib/prompt_parser.js`
- HTML-to-Markdown 转换（D-1）→ `lib/html_to_md.js`
- 数据迁移框架（L-4）→ `lib/migrations.js`
- i18n 翻译函数（K-1）→ `lib/i18n.js`

### 4.6 开发原则

1. **渐进增强**: 每个新功能默认禁用（`defaultEnabled: false`），用户主动启用后才生效。核心计数功能始终可用。

2. **非侵入式**: 不修改 Gemini 原生 DOM 结构，仅添加额外元素（标记点、面板、Modal）。不拦截或修改 Gemini 的网络请求。

3. **优雅降级**: 任何功能失败不应影响其他功能。使用 try-catch 包裹各模块的 init/render 方法，失败时记录日志并跳过。

4. **数据安全**: 所有数据本地存储，不发送到任何外部服务器。不收集用户行为数据。备份文件由用户自行管理。

5. **向后兼容**: 新版本必须能读取旧版本数据。数据结构变更通过迁移框架处理，不丢失用户数据。

6. **代码风格一致**: 延续现有代码风格——vanilla JS、无外部依赖、模块对象模式、GM_* API。

---

## 五、竞品参考索引

### 5.1 竞品总览

| # | 产品名称 | 类型 | 开源 | 仓库/商店链接 | 活跃状态 | 主要功能领域 |
|---|----------|------|------|--------------|---------|-------------|
| 1 | **Gemini Enhancer** | Chrome 扩展 | ❌ 闭源 | Chrome Web Store | 活跃 | 模型预选、UI 增强、快捷键 |
| 2 | **Toolbox for Gemini** | Chrome 扩展 | ❌ 闭源 | Chrome Web Store | 活跃 | 提示词库、对话管理、搜索、导出 |
| 3 | **GemiFlow** | Chrome 扩展 | ❌ 闭源 | Chrome Web Store | 活跃 | 文件夹管理、批量操作、标签、收藏 |
| 4 | **Wider Gemini** | Chrome 扩展 | ❌ 闭源 | Chrome Web Store | 活跃 | 加宽视图、代码换行、字体自定义 |
| 5 | **Gemini Better UI** | Chrome 扩展 | ❌ 闭源 | Chrome Web Store | 活跃 | 面板布局、UI 美化 |
| 6 | **GeminUI Enhancer** | 油猴脚本 | ✅ 开源 | GitHub: lemonberrylabs/geminui | 活跃 | 对话存档、全文搜索、DOM 抓取 |
| 7 | **Gemini Nexus** | 油猴脚本 | ✅ 开源 | GitHub: Zaid-maker/gemini-nexus | 低活跃 | MCP 协议、多 AI 提供商、高级架构 |
| 8 | **Gemini Folders** | 油猴脚本 | ✅ 开源 | GitHub: euuuugenio/Gemini-Folders | 活跃 | 文件夹系统、暗色检测、数据备份 |
| 9 | **Enhance Gemini** | Chrome 扩展 | ❌ 闭源 | Chrome Web Store | 活跃 | 综合增强、快捷操作 |

### 5.2 功能来源追溯表

下表列出每个计划功能的参考来源，以及是否有可参考的开源实现。

| 功能编号 | 功能名称 | 参考竞品 | 开源可参考 | 参考程度 |
|---------|---------|---------|-----------|---------|
| A-1 | 加宽对话视图 | Wider Gemini, Gemini Enhancer | ❌ | 仅参考功能概念，完全自研实现 |
| A-2 | 长代码自动换行 | Wider Gemini | ❌ | 仅参考功能概念，CSS 方案通用 |
| A-3 | 自适应暗色/亮色模式 | Gemini Folders | ✅ 亮度检测算法思路 | 参考检测思路，完全重写实现 |
| A-4 | 面板布局模式扩展 | Gemini Better UI | ❌ | 仅参考功能概念 |
| A-5 | 面板透明度与模糊度 | 原创 | — | 基于现有 Glass 主题能力扩展 |
| B-1 | 嵌套子文件夹 | Toolbox for Gemini, GemiFlow | ❌ | 仅参考功能概念 |
| B-2 | 批量对话操作 | GemiFlow, Toolbox for Gemini | ❌ | 仅参考功能概念 |
| B-3 | 对话收藏/置顶 | GemiFlow, Toolbox for Gemini | ❌ | 仅参考功能概念 |
| B-4 | 对话标签/标记系统 | Toolbox for Gemini, GemiFlow | ❌ | 仅参考功能概念 |
| B-5 | 文件夹图标自定义 | GemiFlow | ❌ | 仅参考功能概念 |
| C-1 | 对话标题实时搜索 | Toolbox for Gemini, GemiFlow | ❌ | 仅参考功能概念 |
| C-2 | 全文内容搜索 | GeminUI Enhancer | ✅ DOM 抓取思路 | 参考 DOM 遍历策略，完全重写 |
| D-1 | 对话内容导出 | Toolbox for Gemini, GemiFlow | ❌ | 仅参考功能概念 |
| D-2 | 导出格式增强（统计） | 原创 | — | 基于现有 ExportModule 扩展 |
| E-1 | 提示词库 | Toolbox for Gemini | ❌ | 仅参考功能概念 |
| E-2 | 预构建提示词模板 | Toolbox for Gemini | ❌ | 仅参考功能概念 |
| F-1 | 自定义主题编辑器 | Wider Gemini | ❌ | 仅参考功能概念，原创设计 |
| F-2 | 字体自定义 | Wider Gemini, GemiFlow | ❌ | 仅参考功能概念 |
| G-1 | 默认模型预选 | Gemini Enhancer | ❌ | 仅参考功能概念 |
| G-2 | 模型使用统计增强 | 原创 | — | 基于现有模型检测能力扩展 |
| H-1 | 自动对话存档 | GeminUI Enhancer | ✅ 侧边栏抓取 + jslog 解析思路 | 参考抓取策略，完全重写实现 |
| H-2 | 全量数据备份与恢复 | Gemini Folders | ✅ JSON Blob 导出/FileReader 导入模式 | 参考导入导出模式，完全重写 |
| I-1 | 键盘快捷键系统 | GemiFlow | ❌ | 仅参考功能概念，原创设计 |
| I-2 | 快速笔记 | 原创 | — | 完全原创功能 |
| J-1 | 增强型 Dashboard | 原创 | — | 基于现有 Dashboard 扩展 |
| K-1 | 多语言 UI 支持 | 原创 | — | 完全原创功能 |
| L-1 | 事件总线 | 业界最佳实践 | — | 通用设计模式，自研实现 |
| L-2 | 模块系统增强 | 业界最佳实践 | — | 插件架构模式，自研实现 |
| L-3 | DOM 选择器弹性化 | GeminUI, Gemini Folders | ✅ 多级 fallback 策略思路 | 参考策略思路，完全重写 |
| L-4 | 存储层抽象 | 业界最佳实践 | — | Repository 模式，自研实现 |

### 5.3 开源竞品详细分析

以下为三个开源竞品的深度分析，记录了可参考的技术思路（注意：所有实现均需完全重写，仅参考设计思路）。

---

#### 5.3.1 GeminUI Enhancer

- **仓库**: GitHub: lemonberrylabs/geminui
- **类型**: Tampermonkey 油猴脚本
- **许可证**: 待确认
- **技术栈**: Vanilla JavaScript, Tampermonkey API

**可参考的技术思路**:

| 技术点 | 描述 | 对应功能 |
|--------|------|---------|
| jslog 属性解析 | 从 Gemini 侧边栏元素的 `jslog` 属性中提取 Chat ID，作为 URL 解析的备用方案 | H-1 自动对话存档 |
| 智能早停扫描 | 侧边栏按时间倒序排列，连续遇到已知对话时停止深度扫描，避免不必要的 DOM 遍历 | H-1 自动对话存档 |
| DOM 内容抓取 | 遍历对话页面的消息 DOM 元素提取纯文本，用于全文搜索 | C-2 全文内容搜索 |
| 增量更新策略 | 维护已知 ID 集合，仅处理新出现的对话，减少重复工作 | H-1 自动对话存档 |

**注意事项**: GeminUI 的代码实现不可直接复用，仅参考其解决问题的思路和策略方向。所有实现必须基于 GeminiCounterPro 现有架构完全重写。

---

#### 5.3.2 Gemini Folders

- **仓库**: GitHub: euuuugenio/Gemini-Folders
- **类型**: Tampermonkey 油猴脚本
- **许可证**: MIT
- **技术栈**: Vanilla JavaScript, Tampermonkey API

**可参考的技术思路**:

| 技术点 | 描述 | 对应功能 |
|--------|------|---------|
| 背景亮度检测 | 使用 `getComputedStyle(document.body).backgroundColor` 提取 RGB 值，通过 ITU-R BT.601 加权亮度公式判断暗色/亮色 | A-3 自适应暗色/亮色模式 |
| JSON Blob 导出 | 将所有 GM_getValue 数据收集为单个 JSON 对象，通过 `URL.createObjectURL(new Blob(...))` 触发下载 | H-2 全量数据备份与恢复 |
| FileReader 导入 | 使用隐藏 `<input type="file">` + `FileReader` API 读取用户选择的 JSON 文件，解析后写回 GM_setValue | H-2 全量数据备份与恢复 |
| 多级 fallback 选择器 | 为关键 DOM 元素提供 2~3 个候选 CSS 选择器，主选择器失效时自动尝试备选 | L-3 DOM 选择器弹性化 |

**注意事项**: Gemini Folders 的文件夹系统与 GeminiCounterPro 的 FoldersModule 功能重叠，但架构设计不同。GeminiCounterPro 已有更完善的文件夹实现（含颜色、拖放、侧边栏标记），无需参考其文件夹逻辑。仅参考上述 4 个通用技术思路。

---

#### 5.3.3 Gemini Nexus

- **仓库**: GitHub: Zaid-maker/gemini-nexus
- **类型**: Tampermonkey 油猴脚本
- **许可证**: MIT
- **技术栈**: Vanilla JavaScript, Tampermonkey API, MCP Protocol

**可参考的技术思路**:

| 技术点 | 描述 | 参考价值 |
|--------|------|---------|
| MCP 协议集成 | 在油猴脚本中实现 Model Context Protocol 客户端，与外部工具服务器通信 | 低（当前版本不计划集成 MCP） |
| 多 AI 提供商架构 | 抽象的 Provider 接口，支持 OpenAI/Claude/Gemini 等多个后端 | 低（GeminiCounterPro 专注 Gemini 单平台） |
| 模块化架构设计 | 清晰的模块分离和依赖注入模式 | 中（可参考其模块解耦思路） |
| 事件驱动通信 | 模块间通过事件总线通信，降低耦合度 | 中（与 L-1 事件总线设计方向一致） |

**注意事项**: Gemini Nexus 的定位与 GeminiCounterPro 差异较大（Nexus 侧重多 AI 集成，Counter 侧重使用量追踪与对话管理）。其架构思路有一定参考价值，但功能层面的参考有限。MCP 协议集成可作为远期探索方向，不纳入当前开发计划。

---

### 5.4 知识产权声明

本开发计划中所有功能的实现方案均为**原创设计**，遵循以下原则：

1. **功能概念参考**: 部分功能的概念灵感来源于市面上的竞品产品（如上表所列），但功能概念本身不受版权保护
2. **技术思路参考**: 对于标记为"✅ 开源可参考"的条目，仅参考其解决问题的**设计思路和策略方向**，不复制任何代码
3. **完全重写实现**: 所有功能的代码实现均基于 GeminiCounterPro 现有架构完全重写，使用自有的模块系统、存储方案和 UI 框架
4. **开源许可合规**: 参考的开源项目（GeminUI Enhancer、Gemini Folders、Gemini Nexus）均为 MIT 或类似宽松许可证，允许参考学习

---

## 六、文档统计

| 指标 | 数值 |
|------|------|
| 现有功能数 | 20 |
| 计划新增功能数 | 27 |
| 功能分类数 | 12（A~L） |
| 涉及竞品数 | 9 |
| 开源可参考竞品数 | 3 |
| 建议实施阶段数 | 5 |

### 功能分类汇总

| 分类 | 功能数 | 编号范围 |
|------|--------|---------|
| A. 布局与视觉增强 | 5 | A-1 ~ A-5 |
| B. 对话管理增强 | 5 | B-1 ~ B-5 |
| C. 搜索功能 | 2 | C-1 ~ C-2 |
| D. 导出功能增强 | 2 | D-1 ~ D-2 |
| E. 提示词管理 | 2 | E-1 ~ E-2 |
| F. 主题与外观增强 | 2 | F-1 ~ F-2 |
| G. 模型管理增强 | 2 | G-1 ~ G-2 |
| H. 对话存档与备份 | 2 | H-1 ~ H-2 |
| I. 快捷操作与效率工具 | 2 | I-1 ~ I-2 |
| J. 数据分析增强 | 1 | J-1 |
| K. 国际化 (i18n) | 1 | K-1 |
| L. 架构升级 | 4 | L-1 ~ L-4 |

---

> **下一步**: 用户筛选功能列表，确定实施范围后，将为每个选定功能创建详细的开发任务卡片。
