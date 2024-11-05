// 存储上次选择的文本
let lastSelectedText = '';

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TEXT_SELECTED') {
    lastSelectedText = request.text;
    // 自动显示弹出窗口
    chrome.action.openPopup();
  } else if (request.type === 'GET_LAST_SELECTED_TEXT') {
    sendResponse({ text: lastSelectedText });
    return true; // 保持消息通道开放
  }
});

// 确保存储初始化成功
async function initializeStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['decks', 'cards'], (result) => {
      if (!result.decks || !result.cards) {
        chrome.storage.local.set({
          decks: [],
          cards: []
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error initializing storage:', chrome.runtime.lastError);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

// 安装或更新时初始化
chrome.runtime.onInstalled.addListener(async () => {
  // 创建右键菜单
  chrome.contextMenus.create({
    id: "generateAnkiCard",
    title: "生成Anki卡片",
    contexts: ["selection"]
  });

  // 确保存储初始化
  await initializeStorage();
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "generateAnkiCard") {
    lastSelectedText = info.selectionText;
    chrome.action.openPopup();
  }
}); 