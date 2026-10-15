# 关闭所有1024tab

一个 Firefox 浏览器插件：一键关闭所有 `https://www.t66y.com/htm_data/` 前缀的标签页。

## 功能

- 点击工具栏插件图标，立即关闭所有 `https://www.t66y.com/htm_data/` 前缀的标签页
- 支持网页右键菜单，选择「关闭所有1024tab」同样生效
- 执行完毕后弹出系统通知：`已为您关闭XX个https://www.t66y.com/htm_data/的tab`

## 文件结构

```
close-1024-tabs/
├── manifest.json   # 插件清单（Manifest V2）
├── background.js   # 核心逻辑：匹配并关闭目标标签页 + 通知
└── icon.png        # 插件图标
```

## 工作原理

整个插件只有约 50 行代码，执行流程如下：

```
用户触发（点图标 / 右键菜单）
        │
        ▼
background.js 中的 closeTargetTabs()
        │
        ├─ 1. browser.tabs.query({ url: "https://www.t66y.com/htm_data/*" })
        │      → 在所有窗口中查出 URL 前缀匹配的标签页
        │
        ├─ 2. browser.tabs.remove(tabIds)
        │      → 批量关闭（数组传参，一次 API 调用）
        │
        └─ 3. browser.notifications.create({...})
               → 弹出系统通知，告知关闭数量
```

两个入口（图标点击、右键菜单点击）最终都调用同一个 `closeTargetTabs()` 函数，逻辑只有一份，不会出现行为不一致。

## 关键代码解析

### 1. manifest.json —— 声明插件能力与入口

```json
"permissions": ["tabs", "contextMenus", "notifications"]
```

- `tabs`：查询和关闭标签页的基础权限。URL 前缀匹配通过 `tabs.query` 的 `url` 参数完成，配合 `tabs` 权限即可读取标签页 URL，无需额外声明 host 权限。
- `contextMenus`：注册右键菜单项。
- `notifications`：执行后弹系统通知。

```json
"background": {
  "scripts": ["background.js"],
  "persistent": false
}
```

- `persistent: false` 让后台页采用**事件驱动**模式：没有事件时后台脚本不常驻内存，有事件（点击图标/菜单）时才被唤醒执行，更省资源。

```json
"browser_action": {
  "default_title": "关闭所有1024tab",
  "default_icon": { "48": "icon.png", "96": "icon.png" }
}
```

- `browser_action` 定义工具栏上的插件图标按钮；`default_title` 是鼠标悬停时的提示文字。

### 2. 注册右键菜单（background.js 第 6-12 行）

```js
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: MENU_ID,
    title: "关闭所有1024tab",
    contexts: ["all"]
  });
});
```

- 菜单必须在 `onInstalled` 事件里创建——该事件只在插件安装或更新时触发一次，避免重复注册报错（菜单 id 唯一，重复 create 会抛异常）。
- `contexts: ["all"]` 表示在任何页面、任何位置点右键都能看到该菜单项。

### 3. 绑定两个触发入口（background.js 第 15-22 行）

```js
// 点击插件图标
browser.browserAction.onClicked.addListener(closeTargetTabs);

// 点击右键菜单
browser.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === MENU_ID) {
    closeTargetTabs();
  }
});
```

- `browserAction.onClicked`：工具栏图标被点击时直接执行关闭逻辑。
- `contextMenus.onClicked`：通过回调参数 `info.menuItemId` 判断点的是不是本插件注册的菜单，再调用同一个 `closeTargetTabs()`。

### 4. 核心关闭逻辑（background.js 第 24-47 行）

```js
const TARGET_PREFIX = "https://www.t66y.com/htm_data/";

async function closeTargetTabs() {
  // ① 用 URL 前缀 + 通配符 * 匹配目标标签页
  const tabs = await browser.tabs.query({ url: TARGET_PREFIX + "*" });

  // ② 提取标签页 id 数组
  const tabIds = tabs.map((t) => t.id);

  // ③ 批量关闭（tabs.remove 接受数组，一次调用关闭全部）
  if (tabIds.length > 0) {
    await browser.tabs.remove(tabIds);
  }

  // ④ 弹系统通知，告知实际关闭的数量
  browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("icon.png"),
    title: "关闭所有1024tab",
    message: `已为您关闭${tabIds.length}个https://www.t66y.com/htm_data/的tab`
  });
}
```

关键点：

- **前缀匹配**：`tabs.query({ url: 前缀 + "*" })` 中的 `*` 是 URL 匹配通配符，只会命中 `https://www.t66y.com/htm_data/` 开头的页面，该域名的其他路径不受影响。
- **跨窗口生效**：`tabs.query` 默认查询所有窗口，所以多开 Firefox 窗口也能一次清干净。
- **数量统计**：`tabIds.length` 在关闭**之前**计算，关闭 0 个时也会弹通知（提示"已为您关闭0个…"），方便确认插件确实执行了。
- **错误兜底**：整段包在 `try/catch` 里，异常时也弹通知显示错误信息，不会静默失败。

## 安装方法

### 临时加载（调试用）

1. Firefox 地址栏输入 `about:debugging#/runtime/this-firefox`
2. 点击「临时载入附加组件」
3. 选择本目录下的 `manifest.json`

> 临时加载的插件在浏览器重启后会被移除。

### 永久安装

- 使用 [web-ext](https://github.com/mozilla/web-ext) 签名：`web-ext sign`，需要 [addons.mozilla.org](https://addons.mozilla.org/) 的 API 凭证
- 或在 [addons.mozilla.org](https://addons.mozilla.org/zh-CN/developers/) 提交插件等待审核上架
- 或使用 Firefox 开发者版 / Nightly，在 `about:config` 中将 `xpinstall.signatures.required` 设为 `false` 后加载

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `tabs` | 查询并关闭匹配的标签页 |
| `contextMenus` | 注册右键菜单项 |
| `notifications` | 执行完毕后弹出提示 |

## 开源协议

[MIT](LICENSE)
