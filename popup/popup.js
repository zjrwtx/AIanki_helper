let currentText = '';
let cards = [];
let decks = [];

// 从存储中加载数据
async function loadData() {
  return new Promise((resolve) => {
    // 添加重试机制
    const tryLoad = (retries = 3) => {
      if (!chrome.storage || !chrome.storage.local) {
        if (retries > 0) {
          setTimeout(() => tryLoad(retries - 1), 100);
        } else {
          console.error('Storage API not available after retries');
          resolve({ decks: [], cards: [] });
        }
        return;
      }

      chrome.storage.local.get(['decks', 'cards'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading data:', chrome.runtime.lastError);
          resolve({ decks: [], cards: [] });
        } else {
          resolve({
            decks: result.decks || [],
            cards: result.cards || []
          });
        }
      });
    };

    tryLoad();
  });
}

// 保存数据到存储
async function saveData() {
  return new Promise((resolve, reject) => {
    if (!chrome.storage || !chrome.storage.local) {
      console.error('Storage API not available');
      reject(new Error('Storage API not available'));
      return;
    }

    chrome.storage.local.set({
      decks: decks,
      cards: cards
    }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// 更新卡片组选择
function updateDeckSelect() {
  const select = document.getElementById('deckSelect');
  select.innerHTML = '<option value="">选择卡片组...</option>';
  decks.forEach(deck => {
    const option = document.createElement('option');
    option.value = deck;
    option.textContent = deck;
    select.appendChild(option);
  });
}

// 更新卡片列表显示
function updateCardsList() {
  const listElement = document.getElementById('cardsList');
  const countElement = document.getElementById('cardCount');
  const exportButton = document.getElementById('exportCSV');
  
  listElement.innerHTML = '';
  cards.forEach((card, index) => {
    const cardElement = document.createElement('div');
    cardElement.className = 'card-item';
    cardElement.innerHTML = `
      <div>
        <strong>${card.deck}</strong>: 
        ${card.front.substring(0, 30)}... | 
        ${card.back.substring(0, 30)}...
      </div>
      <button onclick="removeCard(${index})">删除</button>
    `;
    listElement.appendChild(cardElement);
  });

  countElement.textContent = `已添加: ${cards.length}张卡片`;
  exportButton.disabled = cards.length === 0;
}

// 添加新卡片组
function addNewDeck() {
  const deckName = prompt('请输入新卡片组名称：');
  if (deckName && !decks.includes(deckName)) {
    decks.push(deckName);
    saveData();
    updateDeckSelect();
  }
}

// 移除卡片
function removeCard(index) {
  cards.splice(index, 1);
  saveData();
  updateCardsList();
}

// 获取选中的文本
async function getSelectedText() {
  return new Promise(async (resolve) => {
    try {
      // 首先尝试从background.js获取最后选择的文本
      chrome.runtime.sendMessage({ type: 'GET_LAST_SELECTED_TEXT' }, (response) => {
        if (response && response.text) {
          resolve(response.text);
        } else {
          // 如果没有，则从当前标签页获取
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_SELECTED_TEXT' }, (response) => {
                resolve(response?.text || '');
              });
            } else {
              resolve('');
            }
          });
        }
      });
    } catch (error) {
      console.error('Error getting selected text:', error);
      resolve('');
    }
  });
}

// 生成卡片内容
function generateCard(text, type) {
  switch(type) {
    case 'front':
      return { front: text, back: '' };
    case 'back':
      return { front: '', back: text };
    case 'both':
      const midPoint = Math.floor(text.split('.')[0].length);
      return {
        front: text.substring(0, midPoint),
        back: text.substring(midPoint)
      };
  }
}

// 更新预览
function updatePreview(card) {
  document.getElementById('frontPreview').textContent = card.front;
  document.getElementById('backPreview').textContent = card.back;
}

// 导出为CSV
function exportToCSV() {
  const csvContent = cards.map(card => 
    `"${card.deck}","${card.front}","${card.back}"`
  ).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: 'anki_cards.csv'
  });
}

// 初始化事件监听器
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 等待一小段时间确保 API 已加载
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 确保存储初始化
    const data = await loadData();
    decks = data.decks;
    cards = data.cards;
    updateDeckSelect();
    updateCardsList();
    
    // 获取选中文本
    currentText = await getSelectedText();
    
    // 添加事件监听器
    document.getElementById('addDeck').addEventListener('click', addNewDeck);
    
    document.getElementById('generateFront').addEventListener('click', () => {
      const card = generateCard(currentText, 'front');
      updatePreview(card);
    });
    
    document.getElementById('generateBack').addEventListener('click', () => {
      const card = generateCard(currentText, 'back');
      updatePreview(card);
    });
    
    document.getElementById('generateBoth').addEventListener('click', () => {
      const card = generateCard(currentText, 'both');
      updatePreview(card);
    });

    document.getElementById('addToList').addEventListener('click', () => {
      const deckSelect = document.getElementById('deckSelect');
      if (!deckSelect.value) {
        alert('请先选择卡片组！');
        return;
      }

      const card = {
        deck: deckSelect.value,
        front: document.getElementById('frontPreview').textContent,
        back: document.getElementById('backPreview').textContent
      };

      if (!card.front && !card.back) {
        alert('请先生成卡片内容！');
        return;
      }

      cards.push(card);
      saveData();
      updateCardsList();
    });
    
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
  } catch (error) {
    console.error('Error initializing popup:', error);
    // 显示错误给用户
    alert('初始化失败，请重试');
  }
}); 