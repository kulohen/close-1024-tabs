// 关闭所有1024tab - background 脚本
const TARGET_PREFIX = "https://www.t66y.com/htm_data/";
const MENU_ID = "close-all-1024-tabs";

// 创建右键菜单
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: MENU_ID,
    title: "关闭所有1024tab",
    contexts: ["all"]
  });
});

// 点击插件图标
browser.browserAction.onClicked.addListener(closeTargetTabs);

// 点击右键菜单
browser.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === MENU_ID) {
    closeTargetTabs();
  }
});

async function closeTargetTabs() {
  try {
    const tabs = await browser.tabs.query({ url: TARGET_PREFIX + "*" });
    const tabIds = tabs.map((t) => t.id);

    if (tabIds.length > 0) {
      await browser.tabs.remove(tabIds);
    }

    browser.notifications.create({
      type: "basic",
      iconUrl: browser.runtime.getURL("icon.png"),
      title: "关闭所有1024tab",
      message: `已为您关闭${tabIds.length}个https://www.t66y.com/htm_data/的tab`
    });
  } catch (err) {
    browser.notifications.create({
      type: "basic",
      iconUrl: browser.runtime.getURL("icon.png"),
      title: "关闭所有1024tab",
      message: "执行出错：" + err.message
    });
  }
}
