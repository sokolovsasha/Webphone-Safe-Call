let targetTabId = null;

startTracking();

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isTargetTab(tab) && changeInfo.status === 'complete') {
    injectContentScript(tabId);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (isTargetTab(tab)) {
      targetTabId = tab.id;
      injectContentScript(tab.id);
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === targetTabId) {
    targetTabId = null;
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleMute') {
    const tabId = message.tabId || targetTabId;
    if (tabId) {
      chrome.tabs.update(tabId, { muted: message.muted }, () => {
        if (chrome.runtime.lastError) {
          console.warn('mute error:', chrome.runtime.lastError);
        }
      });
    }
  }
  if (message.action === 'getTabId') {
    sendResponse({ tabId: targetTabId });
  }
});

function isTargetTab(tab) {
  return tab && tab.url && tab.url.includes('yclients.nau.team') && tab.url.includes(':8443');
}

function findTargetTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: 'https://yclients.nau.team:8443/*' }, (tabs) => {
      resolve(tabs.length ? tabs[0] : null);
    });
  });
}

async function startTracking() {
  const tab = await findTargetTab();
  if (tab) {
    targetTabId = tab.id;
    await injectContentScript(tab.id);
  }
}

async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: false },
      files: ['content.js']
    });
  } catch (err) {
    // ignore
  }
}