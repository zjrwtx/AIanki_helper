let selectedText = '';
let selectionTimeout;

document.addEventListener('mouseup', () => {
  try {
    const selection = window.getSelection();
    const newSelectedText = selection.toString().trim();
    
    if (newSelectedText && newSelectedText !== selectedText) {
      selectedText = newSelectedText;
      
      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }
      
      selectionTimeout = setTimeout(() => {
        chrome.runtime.sendMessage({
          type: 'TEXT_SELECTED',
          text: selectedText
        }).catch(error => {
          console.error('Error sending message:', error);
        });
      }, 500);
    }
  } catch (error) {
    console.error('Error handling selection:', error);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SELECTED_TEXT') {
    sendResponse({ text: selectedText });
    return true; // 保持消息通道开放
  }
}); 